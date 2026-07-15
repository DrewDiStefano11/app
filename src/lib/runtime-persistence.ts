import {
  FITCORE_ATOMIC_PERSISTENCE_POLICY,
  type FitCoreAtomicPersistenceAdapter,
} from "./atomic-persistence";
import { FITCORE_BACKUP_ENVELOPE_POLICY } from "./data-backup";
import { validateFitCoreDataIntegrity } from "./data-integrity";
import { migrateFitCoreDataIfNeeded } from "./fitcore-data";
import {
  FITCORE_STORE_TRANSACTION_POLICY,
  commitFitCoreStoreTransaction,
  readFitCoreStoreTransactionSnapshot,
  type FitCoreStoreSnapshotV1,
  type FitCoreStoreTransactionCommitResult,
  type FitCoreStoreTransactionReadResult,
} from "./store-transaction";
import {
  defaultJarvisSettings,
  defaultPersonalization,
  defaultState,
  type AppState,
  type Personalization,
} from "./types";

export const FITCORE_RUNTIME_PERSISTENCE_POLICY = "fitcore_runtime_persistence_v1" as const;

export interface FitCoreRuntimePersistenceDependencies {
  adapter: FitCoreAtomicPersistenceAdapter;
  createExportedAt(): string;
  createWriteToken(): string;
  readLegacyState(): unknown | null;
}

export type FitCoreRuntimePersistenceStatus =
  | "uninitialized"
  | "empty"
  | "ready"
  | "ready_with_warnings"
  | "legacy_migrated"
  | "legacy_migrated_with_warnings"
  | "reload_required"
  | "blocked"
  | "storage_error"
  | "indeterminate";

export type FitCoreRuntimePersistenceSource = "none" | "default" | "revisioned" | "legacy";

export type FitCoreRuntimePersistenceIssueCode =
  | "invalid_dependencies"
  | "invalid_browser_environment"
  | "secure_random_unavailable"
  | "timestamp_generation_failed"
  | "write_token_generation_failed"
  | "runtime_not_hydrated"
  | "revisioned_read_recovery_required"
  | "revisioned_read_corrupt"
  | "revisioned_read_storage_error"
  | "legacy_read_failed"
  | "legacy_invalid_json"
  | "legacy_adoption_blocked"
  | "legacy_adoption_failed"
  | "transaction_blocked"
  | "transaction_storage_error"
  | "transaction_verification_failed"
  | "transaction_stale"
  | "transaction_base_mismatch"
  | "transaction_conflict"
  | "transaction_indeterminate"
  | "reload_required"
  | "store_application_blocked";

export interface FitCoreRuntimePersistenceIssue {
  readonly code: FitCoreRuntimePersistenceIssueCode;
  readonly severity: "warning" | "error";
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
}

export interface FitCoreRuntimeHydrationSummary {
  readonly transactionReadCount: number;
  readonly transactionWriteCount: number;
  readonly legacyReadCount: number;
  readonly snapshotApplicationCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface FitCoreRuntimeCommitSummary {
  readonly transactionReadCount: number;
  readonly transactionWriteCount: number;
  readonly snapshotApplicationCount: number;
  readonly generatedTimestampCount: number;
  readonly generatedTokenCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

interface RuntimeResultBase {
  readonly policy: typeof FITCORE_RUNTIME_PERSISTENCE_POLICY;
  readonly transactionPolicy: typeof FITCORE_STORE_TRANSACTION_POLICY;
  readonly atomicPolicy: typeof FITCORE_ATOMIC_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreRuntimePersistenceStatus;
  readonly safeToApply: boolean;
  readonly requiresReview: boolean;
  readonly requiresReload: boolean;
  readonly source: FitCoreRuntimePersistenceSource;
  readonly revision: number | null;
  readonly writeToken: string | null;
  readonly exportedAt: string | null;
  readonly state: FitCoreStoreSnapshotV1["state"];
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreRuntimePersistenceIssue[];
}

export interface FitCoreRuntimeHydrationResult extends RuntimeResultBase {
  readonly summary: FitCoreRuntimeHydrationSummary;
}

export interface FitCoreRuntimeCommitResult extends RuntimeResultBase {
  readonly summary: FitCoreRuntimeCommitSummary;
}

export interface FitCoreRuntimeStatusMetadata {
  readonly policy: typeof FITCORE_RUNTIME_PERSISTENCE_POLICY;
  readonly status: FitCoreRuntimePersistenceStatus;
  readonly safeToApply: boolean;
  readonly requiresReview: boolean;
  readonly requiresReload: boolean;
  readonly source: FitCoreRuntimePersistenceSource;
  readonly revision: number | null;
  readonly reasonKey: string;
}

export interface FitCoreRuntimePersistenceController {
  hydrate(): FitCoreRuntimeHydrationResult;
  commit(nextState: unknown): FitCoreRuntimeCommitResult;
  reload(): FitCoreRuntimeHydrationResult;
  getCurrentSnapshot(): FitCoreStoreSnapshotV1 | null;
  getRuntimeStatus(): FitCoreRuntimeStatusMetadata;
}

interface Counts {
  transactionReadCount: number;
  transactionWriteCount: number;
  legacyReadCount: number;
  snapshotApplicationCount: number;
  generatedTimestampCount: number;
  generatedTokenCount: number;
}

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;
const LEGACY_STORAGE_KEYS = [
  "fitcore.v1",
  "fitcore.state",
  "fitcore.data",
  "focus-lift-data",
  "fitcore.v0",
] as const;
const LIMITATIONS = [
  "persistence.runtime.limitation.default_state_not_persisted",
  "persistence.runtime.limitation.legacy_key_retained",
  "persistence.runtime.limitation.no_automatic_retry",
  "persistence.runtime.limitation.no_cross_tab_event_listener",
  "persistence.runtime.limitation.ui_feedback_not_implemented",
] as const;

class LegacyJsonError extends Error {}
class BrowserEnvironmentError extends Error {}
class SecureRandomError extends Error {}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function persistenceShape(value: unknown): unknown {
  try {
    if (Array.isArray(value)) {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(descriptors);
      for (const key of keys) {
        if (typeof key !== "string") return value;
        if (key !== "length" && !/^(0|[1-9]\d*)$/.test(key)) return value;
        if (!("value" in descriptors[key]!)) return value;
      }
      const result = new Array(value.length);
      for (const key of keys) {
        if (typeof key !== "string") return value;
        if (key === "length") continue;
        const descriptor = descriptors[key]!;
        result[Number(key)] = persistenceShape(descriptor.value);
      }
      return result;
    }
    if (!record(value)) return value;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== "string" || !("value" in descriptors[key]!)) return value;
    }
    const result: Record<string, unknown> = Object.create(prototype);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor.value === undefined) continue;
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        value: persistenceShape(descriptor.value),
        writable: true,
      });
    }
    return result;
  } catch {
    return value;
  }
}

function compatibleLegacyState(value: unknown): AppState | unknown {
  if (!record(value)) return value;
  if (
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    typeof value.onboardingComplete !== "boolean" ||
    !record(value.profile)
  )
    return value;

  const base = structuredClone(defaultState);
  const legacy = value as Partial<AppState> & Record<string, unknown>;
  const personalization = record(legacy.personalization)
    ? (legacy.personalization as Partial<Personalization>)
    : null;
  return {
    ...base,
    ...legacy,
    version: Math.max(base.version, Number(legacy.version)),
    profile: { ...base.profile, ...legacy.profile },
    nutritionTargets: record(legacy.nutritionTargets)
      ? { ...base.nutritionTargets, ...legacy.nutritionTargets }
      : (legacy.nutritionTargets ?? base.nutritionTargets),
    personalization:
      personalization === null
        ? (legacy.personalization ?? base.personalization)
        : {
            ...defaultPersonalization,
            ...personalization,
            units: record(personalization.units)
              ? { ...defaultPersonalization.units, ...personalization.units }
              : (personalization.units ?? defaultPersonalization.units),
            reminders: record(personalization.reminders)
              ? { ...defaultPersonalization.reminders, ...personalization.reminders }
              : (personalization.reminders ?? defaultPersonalization.reminders),
            defaultGraphModes: record(personalization.defaultGraphModes)
              ? {
                  ...defaultPersonalization.defaultGraphModes,
                  ...personalization.defaultGraphModes,
                }
              : (personalization.defaultGraphModes ?? defaultPersonalization.defaultGraphModes),
          },
    reminders: record(legacy.reminders)
      ? { ...base.reminders, ...legacy.reminders }
      : (legacy.reminders ?? base.reminders),
    jarvisSettings: record(legacy.jarvisSettings)
      ? { ...defaultJarvisSettings, ...legacy.jarvisSettings }
      : (legacy.jarvisSettings ?? base.jarvisSettings),
  } as AppState;
}

function preparedCompatibleLegacyState(value: unknown): unknown {
  const compatible = persistenceShape(compatibleLegacyState(value));
  const integrity = validateFitCoreDataIntegrity(compatible);
  if (integrity.status === "invalid") return compatible;
  return persistenceShape(migrateFitCoreDataIfNeeded(compatible as AppState));
}

function counts(): Counts {
  return {
    transactionReadCount: 0,
    transactionWriteCount: 0,
    legacyReadCount: 0,
    snapshotApplicationCount: 0,
    generatedTimestampCount: 0,
    generatedTokenCount: 0,
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function issue(code: FitCoreRuntimePersistenceIssueCode): FitCoreRuntimePersistenceIssue {
  return deepFreeze({
    code,
    severity: "error" as const,
    reasonKey: `persistence.runtime.reason.${code}`,
    limitationKeys: [] as string[],
  });
}

function validDependencies(value: unknown): value is FitCoreRuntimePersistenceDependencies {
  try {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<FitCoreRuntimePersistenceDependencies>;
    return (
      typeof candidate.adapter === "object" &&
      candidate.adapter !== null &&
      typeof candidate.adapter.getItem === "function" &&
      typeof candidate.adapter.setItem === "function" &&
      typeof candidate.createExportedAt === "function" &&
      typeof candidate.createWriteToken === "function" &&
      typeof candidate.readLegacyState === "function"
    );
  } catch {
    return false;
  }
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1]!;
}

function safeStatus(status: FitCoreRuntimePersistenceStatus): boolean {
  return (
    status === "empty" ||
    status === "ready" ||
    status === "ready_with_warnings" ||
    status === "legacy_migrated" ||
    status === "legacy_migrated_with_warnings"
  );
}

function reloadStatus(status: FitCoreRuntimePersistenceStatus): boolean {
  return status === "reload_required" || status === "indeterminate";
}

function hydrationSummary(count: Counts, issues: readonly FitCoreRuntimePersistenceIssue[]) {
  return {
    transactionReadCount: count.transactionReadCount,
    transactionWriteCount: count.transactionWriteCount,
    legacyReadCount: count.legacyReadCount,
    snapshotApplicationCount: count.snapshotApplicationCount,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
  };
}

function commitSummary(count: Counts, issues: readonly FitCoreRuntimePersistenceIssue[]) {
  return {
    transactionReadCount: count.transactionReadCount,
    transactionWriteCount: count.transactionWriteCount,
    snapshotApplicationCount: count.snapshotApplicationCount,
    generatedTimestampCount: count.generatedTimestampCount,
    generatedTokenCount: count.generatedTokenCount,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
  };
}

function resultFields(
  status: FitCoreRuntimePersistenceStatus,
  source: FitCoreRuntimePersistenceSource,
  snapshot: FitCoreStoreSnapshotV1 | null,
  issues: FitCoreRuntimePersistenceIssue[],
) {
  const safeToApply = safeStatus(status);
  return {
    policy: FITCORE_RUNTIME_PERSISTENCE_POLICY,
    transactionPolicy: FITCORE_STORE_TRANSACTION_POLICY,
    atomicPolicy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status,
    safeToApply,
    requiresReview: status === "ready_with_warnings" || status === "legacy_migrated_with_warnings",
    requiresReload: reloadStatus(status),
    source,
    revision: safeToApply ? (snapshot?.revision ?? null) : null,
    writeToken: safeToApply ? (snapshot?.writeToken ?? null) : null,
    exportedAt: safeToApply ? (snapshot?.exportedAt ?? null) : null,
    state: safeToApply ? (snapshot?.state ?? null) : null,
    reasonKey: `persistence.runtime.reason.${status}`,
    limitationKeys: [...LIMITATIONS],
    issues,
  };
}

function hydrationResult(
  count: Counts,
  status: FitCoreRuntimePersistenceStatus,
  source: FitCoreRuntimePersistenceSource,
  snapshot: FitCoreStoreSnapshotV1 | null,
  issues: FitCoreRuntimePersistenceIssue[] = [],
): FitCoreRuntimeHydrationResult {
  return deepFreeze({
    ...resultFields(status, source, snapshot, issues),
    summary: hydrationSummary(count, issues),
  });
}

function commitResult(
  count: Counts,
  status: FitCoreRuntimePersistenceStatus,
  source: FitCoreRuntimePersistenceSource,
  snapshot: FitCoreStoreSnapshotV1 | null,
  issues: FitCoreRuntimePersistenceIssue[] = [],
): FitCoreRuntimeCommitResult {
  return deepFreeze({
    ...resultFields(status, source, snapshot, issues),
    summary: commitSummary(count, issues),
  });
}

function readStatus(read: FitCoreStoreTransactionReadResult): {
  status: FitCoreRuntimePersistenceStatus;
  code: FitCoreRuntimePersistenceIssueCode;
} {
  if (read.status === "storage_error")
    return { status: "storage_error", code: "revisioned_read_storage_error" };
  if (read.status === "corrupt")
    return { status: "reload_required", code: "revisioned_read_corrupt" };
  return { status: "reload_required", code: "revisioned_read_recovery_required" };
}

function commitFailure(result: FitCoreStoreTransactionCommitResult): {
  status: FitCoreRuntimePersistenceStatus;
  code: FitCoreRuntimePersistenceIssueCode;
} {
  switch (result.status) {
    case "stale_snapshot":
      return { status: "reload_required", code: "transaction_stale" };
    case "base_state_mismatch":
      return { status: "reload_required", code: "transaction_base_mismatch" };
    case "recovery_required":
      return { status: "reload_required", code: "reload_required" };
    case "conflict_detected":
      return { status: "reload_required", code: "transaction_conflict" };
    case "storage_error":
      return { status: "storage_error", code: "transaction_storage_error" };
    case "verification_failed":
      return { status: "blocked", code: "transaction_verification_failed" };
    case "indeterminate":
      return { status: "indeterminate", code: "transaction_indeterminate" };
    default:
      return { status: "blocked", code: "transaction_blocked" };
  }
}

function metadata(
  status: FitCoreRuntimePersistenceStatus,
  source: FitCoreRuntimePersistenceSource,
  snapshot: FitCoreStoreSnapshotV1 | null,
): FitCoreRuntimeStatusMetadata {
  return deepFreeze({
    policy: FITCORE_RUNTIME_PERSISTENCE_POLICY,
    status,
    safeToApply: safeStatus(status),
    requiresReview: status === "ready_with_warnings" || status === "legacy_migrated_with_warnings",
    requiresReload: reloadStatus(status),
    source,
    revision: snapshot?.revision ?? null,
    reasonKey: `persistence.runtime.reason.${status}`,
  });
}

export function createFitCoreRuntimePersistenceController(
  dependencies: FitCoreRuntimePersistenceDependencies,
): FitCoreRuntimePersistenceController {
  let snapshot: FitCoreStoreSnapshotV1 | null = null;
  let status: FitCoreRuntimePersistenceStatus = "uninitialized";
  let source: FitCoreRuntimePersistenceSource = "none";
  let hydrated = false;
  let legacyReadAttempted = false;
  const valid = validDependencies(dependencies);

  const remember = (
    nextStatus: FitCoreRuntimePersistenceStatus,
    nextSource: FitCoreRuntimePersistenceSource,
    nextSnapshot: FitCoreStoreSnapshotV1 | null,
  ) => {
    status = nextStatus;
    source = nextSource;
    if (safeStatus(nextStatus)) snapshot = nextSnapshot;
  };

  const applyRead = (
    read: FitCoreStoreTransactionReadResult,
    count: Counts,
  ): FitCoreRuntimeHydrationResult => {
    if (read.status === "empty" && read.snapshot !== null) {
      remember("empty", "default", read.snapshot);
      return hydrationResult(count, "empty", "default", read.snapshot);
    }
    if (
      (read.status === "ready" || read.status === "ready_with_warnings") &&
      read.snapshot !== null
    ) {
      const nextStatus = read.status === "ready" ? "ready" : "ready_with_warnings";
      count.snapshotApplicationCount += 1;
      remember(nextStatus, "revisioned", read.snapshot);
      return hydrationResult(count, nextStatus, "revisioned", read.snapshot);
    }
    const mapped = readStatus(read);
    remember(mapped.status, "none", null);
    return hydrationResult(count, mapped.status, "none", null, [issue(mapped.code)]);
  };

  const hydrate = (): FitCoreRuntimeHydrationResult => {
    const count = counts();
    hydrated = true;
    if (!valid) {
      remember("blocked", "none", null);
      return hydrationResult(count, "blocked", "none", null, [issue("invalid_dependencies")]);
    }
    const read = readFitCoreStoreTransactionSnapshot(dependencies.adapter);
    count.transactionReadCount += 1;
    if (read.status !== "empty") return applyRead(read, count);
    if (legacyReadAttempted) return applyRead(read, count);
    legacyReadAttempted = true;
    let legacy: unknown | null;
    try {
      count.legacyReadCount += 1;
      legacy = dependencies.readLegacyState();
    } catch (error) {
      const code = error instanceof LegacyJsonError ? "legacy_invalid_json" : "legacy_read_failed";
      remember("blocked", "none", null);
      return hydrationResult(count, "blocked", "none", null, [issue(code)]);
    }
    if (legacy === null) return applyRead(read, count);
    let exportedAt: string;
    let writeToken: string;
    try {
      exportedAt = dependencies.createExportedAt();
    } catch {
      remember("blocked", "none", null);
      return hydrationResult(count, "blocked", "none", null, [
        issue("timestamp_generation_failed"),
      ]);
    }
    try {
      writeToken = dependencies.createWriteToken();
    } catch (error) {
      const code =
        error instanceof SecureRandomError
          ? "secure_random_unavailable"
          : "write_token_generation_failed";
      remember("blocked", "none", null);
      return hydrationResult(count, "blocked", "none", null, [issue(code)]);
    }
    if (!canonicalTimestamp(exportedAt) || !TOKEN_PATTERN.test(writeToken)) {
      const code = !canonicalTimestamp(exportedAt)
        ? "timestamp_generation_failed"
        : "write_token_generation_failed";
      remember("blocked", "none", null);
      return hydrationResult(count, "blocked", "none", null, [issue(code)]);
    }
    const committed = commitFitCoreStoreTransaction(dependencies.adapter, {
      expectedRevision: null,
      baseState: null,
      nextState: preparedCompatibleLegacyState(legacy),
      exportedAt,
      writeToken,
    });
    count.transactionWriteCount += 1;
    if (
      (committed.status === "committed" || committed.status === "committed_with_warnings") &&
      committed.snapshot !== null
    ) {
      const nextStatus =
        committed.status === "committed" ? "legacy_migrated" : "legacy_migrated_with_warnings";
      count.snapshotApplicationCount += 1;
      remember(nextStatus, "legacy", committed.snapshot);
      return hydrationResult(count, nextStatus, "legacy", committed.snapshot);
    }
    const mapped = commitFailure(committed);
    const code = mapped.status === "blocked" ? "legacy_adoption_blocked" : "legacy_adoption_failed";
    remember(mapped.status, "none", null);
    return hydrationResult(count, mapped.status, "none", null, [issue(code)]);
  };

  return {
    hydrate,
    commit(nextState: unknown): FitCoreRuntimeCommitResult {
      const count = counts();
      if (!valid)
        return commitResult(count, "blocked", "none", null, [issue("invalid_dependencies")]);
      if (!hydrated || snapshot === null || !safeStatus(status))
        return commitResult(count, "blocked", "none", null, [issue("runtime_not_hydrated")]);
      let exportedAt: string;
      let writeToken: string;
      try {
        exportedAt = dependencies.createExportedAt();
        count.generatedTimestampCount += 1;
      } catch {
        return commitResult(count, "blocked", source, null, [issue("timestamp_generation_failed")]);
      }
      try {
        writeToken = dependencies.createWriteToken();
        count.generatedTokenCount += 1;
      } catch (error) {
        const code =
          error instanceof SecureRandomError
            ? "secure_random_unavailable"
            : "write_token_generation_failed";
        return commitResult(count, "blocked", source, null, [issue(code)]);
      }
      if (!canonicalTimestamp(exportedAt) || !TOKEN_PATTERN.test(writeToken))
        return commitResult(count, "blocked", source, null, [
          issue(
            !TOKEN_PATTERN.test(writeToken)
              ? "write_token_generation_failed"
              : "timestamp_generation_failed",
          ),
        ]);
      const transaction = commitFitCoreStoreTransaction(dependencies.adapter, {
        expectedRevision: snapshot.revision,
        baseState: snapshot.state,
        nextState: persistenceShape(nextState),
        exportedAt,
        writeToken,
      });
      count.transactionWriteCount += 1;
      if (
        (transaction.status === "committed" ||
          transaction.status === "committed_with_warnings" ||
          transaction.status === "no_change") &&
        transaction.snapshot !== null
      ) {
        const nextStatus = transaction.requiresReview ? "ready_with_warnings" : "ready";
        count.snapshotApplicationCount += 1;
        remember(nextStatus, "revisioned", transaction.snapshot);
        return commitResult(count, nextStatus, "revisioned", transaction.snapshot);
      }
      const mapped = commitFailure(transaction);
      status = mapped.status;
      source = "none";
      return commitResult(count, mapped.status, "none", null, [issue(mapped.code)]);
    },
    reload(): FitCoreRuntimeHydrationResult {
      const count = counts();
      if (!valid)
        return hydrationResult(count, "blocked", "none", null, [issue("invalid_dependencies")]);
      const read = readFitCoreStoreTransactionSnapshot(dependencies.adapter);
      count.transactionReadCount += 1;
      return applyRead(read, count);
    },
    getCurrentSnapshot: () => snapshot,
    getRuntimeStatus: () => metadata(status, source, snapshot),
  };
}

function browserStorage() {
  try {
    const storage = globalThis.localStorage;
    if (storage === undefined) throw new BrowserEnvironmentError();
    return storage;
  } catch {
    throw new BrowserEnvironmentError();
  }
}

export function createFitCoreBrowserPersistenceDependencies(): FitCoreRuntimePersistenceDependencies {
  return {
    adapter: {
      getItem: (key) => browserStorage().getItem(key),
      setItem: (key, value) => browserStorage().setItem(key, value),
    },
    createExportedAt: () => new Date().toISOString(),
    createWriteToken: () => {
      const crypto = globalThis.crypto;
      if (crypto === undefined || typeof crypto.getRandomValues !== "function")
        throw new SecureRandomError();
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    },
    readLegacyState: () => {
      const storage = browserStorage();
      for (const key of LEGACY_STORAGE_KEYS) {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          throw new LegacyJsonError();
        }
      }
      return null;
    },
  };
}
