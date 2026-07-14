import type { FitCoreAtomicPersistenceAdapter } from "./atomic-persistence";
import {
  FITCORE_BACKUP_ENVELOPE_POLICY,
  createFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
  type FitCoreBackupEnvelopeV1,
  type FitCoreBackupJsonObject,
} from "./data-backup";
import {
  FITCORE_REVISIONED_PERSISTENCE_POLICY,
  persistFitCoreStateWithRevision,
  readFitCoreRevisionedPersistence,
  type FitCoreRevisionedPersistenceReadResult,
  type FitCoreRevisionedPersistenceWriteResult,
} from "./revisioned-persistence";

export const FITCORE_STORE_TRANSACTION_POLICY = "fitcore_store_transaction_v1" as const;
export const FITCORE_STORE_SNAPSHOT_FORMAT = "fitcore_store_snapshot" as const;
export const FITCORE_STORE_SNAPSHOT_VERSION = 1 as const;

export interface FitCoreStoreTransactionRequest {
  expectedRevision: number | null;
  baseState: unknown | null;
  nextState: unknown;
  exportedAt: string;
  writeToken: string;
}

export interface FitCoreStoreSnapshotV1 {
  readonly format: typeof FITCORE_STORE_SNAPSHOT_FORMAT;
  readonly version: typeof FITCORE_STORE_SNAPSHOT_VERSION;
  readonly policy: typeof FITCORE_STORE_TRANSACTION_POLICY;
  readonly revisionPolicy: typeof FITCORE_REVISIONED_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly revision: number | null;
  readonly writeToken: string | null;
  readonly exportedAt: string | null;
  readonly state: FitCoreBackupJsonObject | null;
}

export type FitCoreStoreTransactionReadStatus =
  | "empty"
  | "ready"
  | "ready_with_warnings"
  | "recovery_required"
  | "corrupt"
  | "storage_error";

export type FitCoreStoreTransactionCommitStatus =
  | "committed"
  | "committed_with_warnings"
  | "no_change"
  | "stale_snapshot"
  | "base_state_mismatch"
  | "recovery_required"
  | "blocked"
  | "storage_error"
  | "verification_failed"
  | "conflict_detected"
  | "indeterminate";

export type FitCoreStoreTransactionIssueSeverity = "warning" | "error";

export type FitCoreStoreTransactionIssueCode =
  | "invalid_adapter"
  | "invalid_request"
  | "invalid_expected_revision"
  | "invalid_base_state_relationship"
  | "base_state_creation_blocked"
  | "base_state_mismatch"
  | "next_state_creation_blocked"
  | "stale_expected_revision"
  | "revisioned_read_recovery_required"
  | "revisioned_read_corrupt"
  | "revisioned_read_storage_error"
  | "revisioned_write_blocked"
  | "revisioned_write_storage_error"
  | "revisioned_write_verification_failed"
  | "revisioned_write_conflict"
  | "revisioned_write_indeterminate"
  | "postcommit_read_failed"
  | "final_revision_mismatch"
  | "final_token_mismatch"
  | "final_exported_at_mismatch"
  | "final_state_mismatch"
  | "snapshot_creation_failed"
  | "transaction_outcome_indeterminate";

export interface FitCoreStoreTransactionIssue {
  readonly code: FitCoreStoreTransactionIssueCode;
  readonly severity: FitCoreStoreTransactionIssueSeverity;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
}

export interface FitCoreStoreTransactionReadSummary {
  readonly revisionedReadCount: number;
  readonly snapshotCreationCount: number;
  readonly canonicalSerializationCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly stateSerializedCharacterCount: number;
}

export interface FitCoreStoreTransactionCommitSummary {
  readonly revisionedReadCount: number;
  readonly revisionedWriteCount: number;
  readonly snapshotCreationCount: number;
  readonly canonicalComparisonCount: number;
  readonly canonicalSerializationCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly expectedStateSerializedCharacterCount: number;
}

export interface FitCoreStoreTransactionReadResult {
  readonly policy: typeof FITCORE_STORE_TRANSACTION_POLICY;
  readonly revisionPolicy: typeof FITCORE_REVISIONED_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreStoreTransactionReadStatus;
  readonly safeToApply: boolean;
  readonly requiresReview: boolean;
  readonly requiresReload: boolean;
  readonly snapshot: FitCoreStoreSnapshotV1 | null;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreStoreTransactionIssue[];
  readonly summary: FitCoreStoreTransactionReadSummary;
}

export interface FitCoreStoreTransactionCommitResult {
  readonly policy: typeof FITCORE_STORE_TRANSACTION_POLICY;
  readonly revisionPolicy: typeof FITCORE_REVISIONED_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreStoreTransactionCommitStatus;
  readonly safeToApply: boolean;
  readonly requiresReview: boolean;
  readonly requiresReload: boolean;
  readonly expectedRevision: number | null;
  readonly observedRevision: number | null;
  readonly committedRevision: number | null;
  readonly writeToken: string | null;
  readonly snapshot: FitCoreStoreSnapshotV1 | null;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreStoreTransactionIssue[];
  readonly summary: FitCoreStoreTransactionCommitSummary;
}

interface CoordinatorCounters {
  revisionedReadCount: number;
  revisionedWriteCount: number;
  snapshotCreationCount: number;
  canonicalComparisonCount: number;
  canonicalSerializationCount: number;
}

interface CanonicalEnvelope {
  envelope: FitCoreBackupEnvelopeV1;
  json: string;
  characterCount: number;
  requiresReview: boolean;
}

interface InspectedRequest {
  expectedRevision: number | null;
  baseState: unknown | null;
  nextState: unknown;
  exportedAt: string;
  writeToken: string;
}

const REQUEST_FIELDS = [
  "expectedRevision",
  "baseState",
  "nextState",
  "exportedAt",
  "writeToken",
] as const;
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;
const BASE_LIMITATIONS = [
  "persistence.transaction.limitation.store_not_mutated",
  "persistence.transaction.limitation.runtime_integration_not_performed",
  "persistence.transaction.limitation.no_automatic_retry",
] as const;

function counters(): CoordinatorCounters {
  return {
    revisionedReadCount: 0,
    revisionedWriteCount: 0,
    snapshotCreationCount: 0,
    canonicalComparisonCount: 0,
    canonicalSerializationCount: 0,
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function issue(
  code: FitCoreStoreTransactionIssueCode,
  severity: FitCoreStoreTransactionIssueSeverity = "error",
  limitationKeys: readonly string[] = [],
): FitCoreStoreTransactionIssue {
  return deepFreeze({
    code,
    severity,
    reasonKey: `persistence.transaction.reason.${code}`,
    limitationKeys: [...limitationKeys].sort(compareText),
  });
}

function limitations(
  issues: readonly FitCoreStoreTransactionIssue[],
  extra: readonly string[] = [],
): readonly string[] {
  return [
    ...new Set([...BASE_LIMITATIONS, ...extra, ...issues.flatMap((entry) => entry.limitationKeys)]),
  ].sort(compareText);
}

function validAdapter(value: unknown): value is FitCoreAtomicPersistenceAdapter {
  try {
    if ((typeof value !== "object" && typeof value !== "function") || value === null) return false;
    const candidate = value as Partial<FitCoreAtomicPersistenceAdapter>;
    return typeof candidate.getItem === "function" && typeof candidate.setItem === "function";
  } catch {
    return false;
  }
}

function ownDataValue(value: object, key: string): { ok: boolean; value?: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined ||
    !("value" in descriptor) ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined
  )
    return { ok: false };
  return { ok: true, value: descriptor.value };
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

function inspectRequest(value: unknown): {
  request: InspectedRequest | null;
  issueCode: FitCoreStoreTransactionIssueCode | null;
} {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return { request: null, issueCode: "invalid_request" };
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      return { request: null, issueCode: "invalid_request" };
    if (Object.getOwnPropertySymbols(value).length !== 0)
      return { request: null, issueCode: "invalid_request" };
    const keys = Object.keys(value).sort(compareText);
    const expectedKeys = [...REQUEST_FIELDS].sort(compareText);
    if (
      keys.length !== expectedKeys.length ||
      keys.some((key, index) => key !== expectedKeys[index])
    )
      return { request: null, issueCode: "invalid_request" };
    const fields = Object.fromEntries(
      REQUEST_FIELDS.map((key) => [key, ownDataValue(value, key)]),
    ) as Record<(typeof REQUEST_FIELDS)[number], { ok: boolean; value?: unknown }>;
    if (REQUEST_FIELDS.some((key) => !fields[key].ok))
      return { request: null, issueCode: "invalid_request" };
    const expectedRevision = fields.expectedRevision.value;
    if (
      expectedRevision !== null &&
      (typeof expectedRevision !== "number" ||
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision < 0)
    )
      return { request: null, issueCode: "invalid_expected_revision" };
    if (
      !canonicalTimestamp(fields.exportedAt.value) ||
      typeof fields.writeToken.value !== "string" ||
      !TOKEN_PATTERN.test(fields.writeToken.value)
    )
      return { request: null, issueCode: "invalid_request" };
    return {
      request: {
        expectedRevision: expectedRevision as number | null,
        baseState: fields.baseState.value as unknown | null,
        nextState: fields.nextState.value,
        exportedAt: fields.exportedAt.value,
        writeToken: fields.writeToken.value,
      },
      issueCode: null,
    };
  } catch {
    return { request: null, issueCode: "invalid_request" };
  }
}

function canonicalize(
  value: unknown,
  exportedAt: string,
  count: CoordinatorCounters,
): CanonicalEnvelope | null {
  const creation = createFitCoreBackupEnvelope(value, { exportedAt });
  if (creation.status === "blocked" || creation.envelope === null) return null;
  const serialization = serializeFitCoreBackupEnvelope(creation.envelope);
  count.canonicalSerializationCount += 1;
  if (serialization.status !== "serialized" || serialization.json === null) return null;
  return {
    envelope: creation.envelope,
    json: serialization.json,
    characterCount: serialization.characterCount,
    requiresReview: creation.status === "created_with_warnings",
  };
}

function serializeLoaded(
  envelope: FitCoreBackupEnvelopeV1,
  count: CoordinatorCounters,
): { json: string; characterCount: number } | null {
  const serialization = serializeFitCoreBackupEnvelope(envelope);
  count.canonicalSerializationCount += 1;
  if (serialization.status !== "serialized" || serialization.json === null) return null;
  return { json: serialization.json, characterCount: serialization.characterCount };
}

function snapshotFromCanonical(
  revision: number | null,
  writeToken: string | null,
  exportedAt: string | null,
  canonicalEnvelopeJson: string | null,
  count: CoordinatorCounters,
): FitCoreStoreSnapshotV1 | null {
  try {
    let state: FitCoreBackupJsonObject | null = null;
    if (canonicalEnvelopeJson !== null) {
      const parsed = JSON.parse(canonicalEnvelopeJson) as { payload?: unknown };
      if (typeof parsed !== "object" || parsed === null || typeof parsed.payload !== "object")
        return null;
      state = parsed.payload as FitCoreBackupJsonObject;
    }
    const snapshot = deepFreeze<FitCoreStoreSnapshotV1>({
      format: FITCORE_STORE_SNAPSHOT_FORMAT,
      version: FITCORE_STORE_SNAPSHOT_VERSION,
      policy: FITCORE_STORE_TRANSACTION_POLICY,
      revisionPolicy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
      backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
      revision,
      writeToken,
      exportedAt,
      state,
    });
    count.snapshotCreationCount += 1;
    return snapshot;
  } catch {
    return null;
  }
}

function readSummary(
  count: CoordinatorCounters,
  issues: readonly FitCoreStoreTransactionIssue[],
  stateSerializedCharacterCount: number,
): FitCoreStoreTransactionReadSummary {
  return {
    revisionedReadCount: count.revisionedReadCount,
    snapshotCreationCount: count.snapshotCreationCount,
    canonicalSerializationCount: count.canonicalSerializationCount,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
    stateSerializedCharacterCount,
  };
}

function commitSummary(
  count: CoordinatorCounters,
  issues: readonly FitCoreStoreTransactionIssue[],
  expectedStateSerializedCharacterCount: number,
): FitCoreStoreTransactionCommitSummary {
  return {
    revisionedReadCount: count.revisionedReadCount,
    revisionedWriteCount: count.revisionedWriteCount,
    snapshotCreationCount: count.snapshotCreationCount,
    canonicalComparisonCount: count.canonicalComparisonCount,
    canonicalSerializationCount: count.canonicalSerializationCount,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
    expectedStateSerializedCharacterCount,
  };
}

function makeRead(
  count: CoordinatorCounters,
  status: FitCoreStoreTransactionReadStatus,
  issues: FitCoreStoreTransactionIssue[],
  snapshot: FitCoreStoreSnapshotV1 | null = null,
  stateSerializedCharacterCount = 0,
): FitCoreStoreTransactionReadResult {
  const safeToApply = status === "empty" || status === "ready" || status === "ready_with_warnings";
  return deepFreeze({
    policy: FITCORE_STORE_TRANSACTION_POLICY,
    revisionPolicy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status,
    safeToApply,
    requiresReview: status === "ready_with_warnings",
    requiresReload: !safeToApply,
    snapshot: safeToApply ? snapshot : null,
    reasonKey: `persistence.transaction.reason.${status}`,
    limitationKeys: limitations(
      issues,
      !safeToApply ? ["persistence.transaction.limitation.reload_required"] : [],
    ),
    issues,
    summary: readSummary(count, issues, safeToApply ? stateSerializedCharacterCount : 0),
  });
}

function makeCommit(
  count: CoordinatorCounters,
  status: FitCoreStoreTransactionCommitStatus,
  issues: FitCoreStoreTransactionIssue[],
  metadata: {
    expectedRevision?: number | null;
    observedRevision?: number | null;
    committedRevision?: number | null;
    writeToken?: string | null;
    snapshot?: FitCoreStoreSnapshotV1 | null;
    requiresReview?: boolean;
    expectedStateSerializedCharacterCount?: number;
  } = {},
): FitCoreStoreTransactionCommitResult {
  const safeToApply =
    status === "committed" || status === "committed_with_warnings" || status === "no_change";
  const requiresReload =
    status === "stale_snapshot" ||
    status === "base_state_mismatch" ||
    status === "recovery_required" ||
    status === "conflict_detected" ||
    status === "indeterminate";
  return deepFreeze({
    policy: FITCORE_STORE_TRANSACTION_POLICY,
    revisionPolicy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status,
    safeToApply,
    requiresReview:
      status === "committed_with_warnings" ||
      (status === "no_change" && metadata.requiresReview === true),
    requiresReload,
    expectedRevision: metadata.expectedRevision ?? null,
    observedRevision: metadata.observedRevision ?? null,
    committedRevision: safeToApply ? (metadata.committedRevision ?? null) : null,
    writeToken: metadata.writeToken ?? null,
    snapshot: safeToApply ? (metadata.snapshot ?? null) : null,
    reasonKey: `persistence.transaction.reason.${status}`,
    limitationKeys: limitations(
      issues,
      requiresReload ? ["persistence.transaction.limitation.reload_required"] : [],
    ),
    issues,
    summary: commitSummary(count, issues, metadata.expectedStateSerializedCharacterCount ?? 0),
  });
}

function readRevisioned(
  adapter: FitCoreAtomicPersistenceAdapter,
  count: CoordinatorCounters,
): FitCoreRevisionedPersistenceReadResult {
  count.revisionedReadCount += 1;
  return readFitCoreRevisionedPersistence(adapter);
}

function writeRevisioned(
  adapter: FitCoreAtomicPersistenceAdapter,
  value: unknown,
  request: InspectedRequest,
  count: CoordinatorCounters,
): FitCoreRevisionedPersistenceWriteResult {
  count.revisionedWriteCount += 1;
  return persistFitCoreStateWithRevision(adapter, value, {
    expectedRevision: request.expectedRevision,
    exportedAt: request.exportedAt,
    writeToken: request.writeToken,
  });
}

function unsafeReadMapping(status: FitCoreRevisionedPersistenceReadResult["status"]): {
  status: FitCoreStoreTransactionReadStatus;
  code: FitCoreStoreTransactionIssueCode;
} {
  if (status === "storage_error")
    return { status: "storage_error", code: "revisioned_read_storage_error" };
  if (status === "corrupt") return { status: "corrupt", code: "revisioned_read_corrupt" };
  return { status: "recovery_required", code: "revisioned_read_recovery_required" };
}

export function readFitCoreStoreTransactionSnapshot(
  adapter: FitCoreAtomicPersistenceAdapter,
): FitCoreStoreTransactionReadResult {
  const count = counters();
  if (!validAdapter(adapter)) return makeRead(count, "storage_error", [issue("invalid_adapter")]);
  try {
    const revisioned = readRevisioned(adapter, count);
    if (revisioned.status === "empty") {
      const snapshot = snapshotFromCanonical(null, null, null, null, count);
      return snapshot === null
        ? makeRead(count, "corrupt", [issue("snapshot_creation_failed")])
        : makeRead(count, "empty", [], snapshot);
    }
    if (
      revisioned.status !== "loaded" ||
      revisioned.envelope === null ||
      revisioned.currentRevision === null ||
      revisioned.writeToken === null
    ) {
      if (
        revisioned.status === "loaded_with_warnings" &&
        revisioned.envelope !== null &&
        revisioned.currentRevision !== null &&
        revisioned.writeToken !== null
      ) {
        const serialized = serializeLoaded(revisioned.envelope, count);
        if (serialized === null)
          return makeRead(count, "corrupt", [issue("snapshot_creation_failed")]);
        const snapshot = snapshotFromCanonical(
          revisioned.currentRevision,
          revisioned.writeToken,
          revisioned.envelope.exportedAt,
          serialized.json,
          count,
        );
        return snapshot === null
          ? makeRead(count, "corrupt", [issue("snapshot_creation_failed")])
          : makeRead(count, "ready_with_warnings", [], snapshot, serialized.characterCount);
      }
      const mapping = unsafeReadMapping(revisioned.status);
      return makeRead(count, mapping.status, [issue(mapping.code)]);
    }
    const serialized = serializeLoaded(revisioned.envelope, count);
    if (serialized === null) return makeRead(count, "corrupt", [issue("snapshot_creation_failed")]);
    const snapshot = snapshotFromCanonical(
      revisioned.currentRevision,
      revisioned.writeToken,
      revisioned.envelope.exportedAt,
      serialized.json,
      count,
    );
    return snapshot === null
      ? makeRead(count, "corrupt", [issue("snapshot_creation_failed")])
      : makeRead(count, "ready", [], snapshot, serialized.characterCount);
  } catch {
    return makeRead(count, "storage_error", [issue("revisioned_read_storage_error")]);
  }
}

function mappedWriteFailure(
  count: CoordinatorCounters,
  write: FitCoreRevisionedPersistenceWriteResult,
  request: InspectedRequest,
  expectedCharacters: number,
): FitCoreStoreTransactionCommitResult {
  const metadata = {
    expectedRevision: request.expectedRevision,
    observedRevision: write.observedRevision,
    writeToken: request.writeToken,
    expectedStateSerializedCharacterCount: expectedCharacters,
  };
  switch (write.status) {
    case "stale_write_rejected":
      return makeCommit(count, "stale_snapshot", [issue("stale_expected_revision")], metadata);
    case "blocked":
      return makeCommit(count, "blocked", [issue("revisioned_write_blocked")], metadata);
    case "storage_error":
      return makeCommit(
        count,
        "storage_error",
        [issue("revisioned_write_storage_error")],
        metadata,
      );
    case "verification_failed":
      return makeCommit(
        count,
        "verification_failed",
        [issue("revisioned_write_verification_failed")],
        metadata,
      );
    case "conflict_detected":
      return makeCommit(count, "conflict_detected", [issue("revisioned_write_conflict")], metadata);
    default:
      return makeCommit(
        count,
        "indeterminate",
        [issue("revisioned_write_indeterminate"), issue("transaction_outcome_indeterminate")],
        metadata,
      );
  }
}

export function commitFitCoreStoreTransaction(
  adapter: FitCoreAtomicPersistenceAdapter,
  request: FitCoreStoreTransactionRequest,
): FitCoreStoreTransactionCommitResult {
  const count = counters();
  if (!validAdapter(adapter)) return makeCommit(count, "blocked", [issue("invalid_adapter")]);
  const inspected = inspectRequest(request);
  if (inspected.request === null)
    return makeCommit(count, "blocked", [issue(inspected.issueCode ?? "invalid_request")]);
  const validRequest = inspected.request;
  const initialMetadata = {
    expectedRevision: validRequest.expectedRevision,
    writeToken: validRequest.writeToken,
  };
  try {
    const authoritative = readRevisioned(adapter, count);
    if (
      authoritative.status !== "empty" &&
      authoritative.status !== "loaded" &&
      authoritative.status !== "loaded_with_warnings"
    ) {
      const status =
        authoritative.status === "storage_error"
          ? "storage_error"
          : authoritative.status === "corrupt"
            ? "recovery_required"
            : "recovery_required";
      const code =
        authoritative.status === "storage_error"
          ? "revisioned_read_storage_error"
          : authoritative.status === "corrupt"
            ? "revisioned_read_corrupt"
            : "revisioned_read_recovery_required";
      return makeCommit(count, status, [issue(code)], initialMetadata);
    }

    const observedRevision = authoritative.currentRevision;
    const common = { ...initialMetadata, observedRevision };
    if (validRequest.expectedRevision !== observedRevision)
      return makeCommit(count, "stale_snapshot", [issue("stale_expected_revision")], common);

    const authoritativeEmpty = authoritative.status === "empty";
    if (
      (authoritativeEmpty && validRequest.baseState !== null) ||
      (!authoritativeEmpty && validRequest.baseState === null)
    )
      return makeCommit(count, "blocked", [issue("invalid_base_state_relationship")], common);

    let authoritativeCanonical: { json: string; characterCount: number } | null = null;
    if (!authoritativeEmpty) {
      if (
        authoritative.envelope === null ||
        authoritative.currentRevision === null ||
        authoritative.writeToken === null
      )
        return makeCommit(
          count,
          "recovery_required",
          [issue("revisioned_read_recovery_required")],
          common,
        );
      authoritativeCanonical = serializeLoaded(authoritative.envelope, count);
      if (authoritativeCanonical === null)
        return makeCommit(
          count,
          "verification_failed",
          [issue("snapshot_creation_failed")],
          common,
        );
      const canonicalBase = canonicalize(
        validRequest.baseState,
        authoritative.envelope.exportedAt,
        count,
      );
      if (canonicalBase === null)
        return makeCommit(count, "blocked", [issue("base_state_creation_blocked")], common);
      count.canonicalComparisonCount += 1;
      if (canonicalBase.json !== authoritativeCanonical.json)
        return makeCommit(count, "base_state_mismatch", [issue("base_state_mismatch")], common);
    }

    const expectedNext = canonicalize(validRequest.nextState, validRequest.exportedAt, count);
    if (expectedNext === null)
      return makeCommit(count, "blocked", [issue("next_state_creation_blocked")], common);
    const expectedMetadata = {
      ...common,
      expectedStateSerializedCharacterCount: expectedNext.characterCount,
    };

    if (!authoritativeEmpty && authoritative.envelope !== null && authoritativeCanonical !== null) {
      const comparableNext = canonicalize(
        validRequest.nextState,
        authoritative.envelope.exportedAt,
        count,
      );
      if (comparableNext === null)
        return makeCommit(
          count,
          "blocked",
          [issue("next_state_creation_blocked")],
          expectedMetadata,
        );
      count.canonicalComparisonCount += 1;
      if (comparableNext.json === authoritativeCanonical.json) {
        const currentSnapshot = snapshotFromCanonical(
          authoritative.currentRevision,
          authoritative.writeToken,
          authoritative.envelope.exportedAt,
          authoritativeCanonical.json,
          count,
        );
        if (currentSnapshot === null)
          return makeCommit(
            count,
            "verification_failed",
            [issue("snapshot_creation_failed")],
            expectedMetadata,
          );
        return makeCommit(count, "no_change", [], {
          ...expectedMetadata,
          committedRevision: authoritative.currentRevision,
          writeToken: authoritative.writeToken,
          snapshot: currentSnapshot,
          requiresReview: authoritative.requiresReview,
        });
      }
    }

    const write = writeRevisioned(adapter, validRequest.nextState, validRequest, count);
    if (write.status !== "committed" && write.status !== "committed_with_warnings")
      return mappedWriteFailure(count, write, validRequest, expectedNext.characterCount);
    if (
      write.observedRevision !== validRequest.expectedRevision ||
      write.committedRevision === null ||
      write.writeToken !== validRequest.writeToken
    )
      return makeCommit(
        count,
        "verification_failed",
        [issue("final_revision_mismatch")],
        expectedMetadata,
      );

    const finalRead = readRevisioned(adapter, count);
    if (
      (finalRead.status !== "loaded" && finalRead.status !== "loaded_with_warnings") ||
      finalRead.envelope === null
    )
      return makeCommit(
        count,
        "indeterminate",
        [issue("postcommit_read_failed"), issue("transaction_outcome_indeterminate")],
        expectedMetadata,
      );
    const finalCommon = {
      ...expectedMetadata,
      observedRevision: write.observedRevision,
      writeToken: validRequest.writeToken,
    };
    if (finalRead.currentRevision !== write.committedRevision)
      return makeCommit(
        count,
        "conflict_detected",
        [issue("final_revision_mismatch")],
        finalCommon,
      );
    if (finalRead.writeToken !== validRequest.writeToken)
      return makeCommit(count, "conflict_detected", [issue("final_token_mismatch")], finalCommon);
    if (finalRead.envelope.exportedAt !== validRequest.exportedAt)
      return makeCommit(
        count,
        "conflict_detected",
        [issue("final_exported_at_mismatch")],
        finalCommon,
      );
    const finalCanonical = serializeLoaded(finalRead.envelope, count);
    if (finalCanonical === null)
      return makeCommit(
        count,
        "verification_failed",
        [issue("snapshot_creation_failed")],
        finalCommon,
      );
    count.canonicalComparisonCount += 1;
    if (finalCanonical.json !== expectedNext.json)
      return makeCommit(count, "conflict_detected", [issue("final_state_mismatch")], finalCommon);
    const snapshot = snapshotFromCanonical(
      finalRead.currentRevision,
      finalRead.writeToken,
      finalRead.envelope.exportedAt,
      finalCanonical.json,
      count,
    );
    if (snapshot === null)
      return makeCommit(
        count,
        "verification_failed",
        [issue("snapshot_creation_failed")],
        finalCommon,
      );
    const status =
      write.status === "committed_with_warnings" || finalRead.status === "loaded_with_warnings"
        ? "committed_with_warnings"
        : "committed";
    return makeCommit(count, status, [], {
      ...finalCommon,
      committedRevision: write.committedRevision,
      snapshot,
    });
  } catch {
    return makeCommit(
      count,
      "indeterminate",
      [issue("transaction_outcome_indeterminate")],
      initialMetadata,
    );
  }
}
