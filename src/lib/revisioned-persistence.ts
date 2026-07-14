import {
  FITCORE_ATOMIC_PERSISTENCE_POLICY,
  persistFitCoreStateAtomically,
  readFitCoreAtomicPersistence,
  type FitCoreAtomicPersistenceAdapter,
  type FitCoreAtomicPersistenceReadResult,
  type FitCoreAtomicPersistenceSlot,
} from "./atomic-persistence";
import {
  FITCORE_BACKUP_ENVELOPE_POLICY,
  createFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
  type FitCoreBackupEnvelopeV1,
} from "./data-backup";

export const FITCORE_REVISIONED_PERSISTENCE_POLICY = "fitcore_revisioned_persistence_v1" as const;
export const FITCORE_REVISION_RECORD_FORMAT = "fitcore_revision_record" as const;
export const FITCORE_REVISION_RECORD_VERSION = 1 as const;
export const FITCORE_REVISION_STORAGE_KEY = "fitcore.persistence.v1.revision" as const;

export interface FitCoreRevisionedPersistenceOptions {
  exportedAt: string;
  expectedRevision: number | null;
  writeToken: string;
}

export interface FitCoreRevisionRecordV1 {
  readonly format: typeof FITCORE_REVISION_RECORD_FORMAT;
  readonly version: typeof FITCORE_REVISION_RECORD_VERSION;
  readonly policy: typeof FITCORE_REVISIONED_PERSISTENCE_POLICY;
  readonly atomicPolicy: typeof FITCORE_ATOMIC_PERSISTENCE_POLICY;
  readonly revision: number;
  readonly writeToken: string;
  readonly activeSlot: FitCoreAtomicPersistenceSlot;
}

export type FitCoreRevisionedPersistenceWriteStatus =
  | "committed"
  | "committed_with_warnings"
  | "stale_write_rejected"
  | "conflict_detected"
  | "blocked"
  | "storage_error"
  | "verification_failed"
  | "indeterminate";

export type FitCoreRevisionedPersistenceReadStatus =
  | "empty"
  | "loaded"
  | "loaded_with_warnings"
  | "recovery_required"
  | "corrupt"
  | "storage_error";

export type FitCoreRevisionedPersistenceIssueSeverity = "warning" | "error";

export type FitCoreRevisionedPersistenceIssueCode =
  | "invalid_adapter"
  | "invalid_options"
  | "invalid_expected_revision"
  | "invalid_write_token"
  | "duplicate_write_token"
  | "revision_overflow"
  | "backup_creation_blocked"
  | "atomic_persistence_blocked"
  | "atomic_storage_error"
  | "atomic_verification_failed"
  | "atomic_indeterminate"
  | "revision_missing"
  | "revision_invalid_json"
  | "revision_invalid_shape"
  | "revision_unknown_field"
  | "revision_invalid_format"
  | "revision_unsupported_version"
  | "revision_invalid_policy"
  | "revision_invalid_atomic_policy"
  | "revision_invalid_number"
  | "revision_invalid_token"
  | "revision_invalid_slot"
  | "revision_atomic_slot_mismatch"
  | "revision_write_failed"
  | "revision_read_failed"
  | "revision_readback_mismatch"
  | "revision_changed_during_write"
  | "stale_expected_revision"
  | "final_revision_mismatch"
  | "final_token_mismatch"
  | "final_slot_mismatch"
  | "final_backup_mismatch"
  | "concurrent_write_detected"
  | "commit_outcome_indeterminate";

export interface FitCoreRevisionedPersistenceIssue {
  readonly code: FitCoreRevisionedPersistenceIssueCode;
  readonly severity: FitCoreRevisionedPersistenceIssueSeverity;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
}

export interface FitCoreRevisionedPersistenceWriteSummary {
  readonly atomicReadOperationCount: number;
  readonly atomicWriteOperationCount: number;
  readonly revisionReadOperationCount: number;
  readonly revisionWriteOperationCount: number;
  readonly verificationReadCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly expectedSerializedCharacterCount: number;
}

export interface FitCoreRevisionedPersistenceReadSummary {
  readonly atomicReadOperationCount: number;
  readonly revisionReadOperationCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly loadedSerializedCharacterCount: number;
}

export interface FitCoreRevisionedPersistenceWriteResult {
  readonly policy: typeof FITCORE_REVISIONED_PERSISTENCE_POLICY;
  readonly atomicPolicy: typeof FITCORE_ATOMIC_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreRevisionedPersistenceWriteStatus;
  readonly safeToUse: boolean;
  readonly requiresReview: boolean;
  readonly expectedRevision: number | null;
  readonly observedRevision: number | null;
  readonly committedRevision: number | null;
  readonly writeToken: string | null;
  readonly activeSlot: FitCoreAtomicPersistenceSlot | null;
  readonly previousSlot: FitCoreAtomicPersistenceSlot | null;
  readonly stagedSlot: FitCoreAtomicPersistenceSlot | null;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreRevisionedPersistenceIssue[];
  readonly summary: FitCoreRevisionedPersistenceWriteSummary;
}

export interface FitCoreRevisionedPersistenceReadResult {
  readonly policy: typeof FITCORE_REVISIONED_PERSISTENCE_POLICY;
  readonly atomicPolicy: typeof FITCORE_ATOMIC_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreRevisionedPersistenceReadStatus;
  readonly safeToUse: boolean;
  readonly requiresReview: boolean;
  readonly currentRevision: number | null;
  readonly writeToken: string | null;
  readonly activeSlot: FitCoreAtomicPersistenceSlot | null;
  readonly previousSlot: FitCoreAtomicPersistenceSlot | null;
  readonly loadedSlot: FitCoreAtomicPersistenceSlot | null;
  readonly envelope: FitCoreBackupEnvelopeV1 | null;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreRevisionedPersistenceIssue[];
  readonly summary: FitCoreRevisionedPersistenceReadSummary;
}

interface Counters {
  atomicReadOperationCount: number;
  atomicWriteOperationCount: number;
  revisionReadOperationCount: number;
  revisionWriteOperationCount: number;
  verificationReadCount: number;
}

interface RevisionInspection {
  status: "valid" | "invalid" | "unsupported";
  record: FitCoreRevisionRecordV1 | null;
  issueCode: FitCoreRevisionedPersistenceIssueCode | null;
}

interface InternalRead {
  report: FitCoreRevisionedPersistenceReadResult;
  atomic: FitCoreAtomicPersistenceReadResult;
  revisionRaw: string | null;
  record: FitCoreRevisionRecordV1 | null;
}

const RECORD_FIELDS = [
  "format",
  "version",
  "policy",
  "atomicPolicy",
  "revision",
  "writeToken",
  "activeSlot",
] as const;
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;
const BASE_LIMITATIONS = [
  "persistence.revision.limitation.optimistic_protocol",
  "persistence.revision.limitation.no_locking",
  "persistence.revision.limitation.no_automatic_retry",
  "persistence.revision.limitation.no_event_broadcast",
] as const;

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
  code: FitCoreRevisionedPersistenceIssueCode,
  severity: FitCoreRevisionedPersistenceIssueSeverity = "error",
  limitationKeys: readonly string[] = [],
): FitCoreRevisionedPersistenceIssue {
  return {
    code,
    severity,
    reasonKey: `persistence.revision.reason.${code}`,
    limitationKeys: [...limitationKeys].sort(compareText),
  };
}

function limitations(
  issues: readonly FitCoreRevisionedPersistenceIssue[],
  additional: readonly string[] = [],
): string[] {
  return [
    ...new Set([
      ...BASE_LIMITATIONS,
      ...additional,
      ...issues.flatMap((item) => item.limitationKeys),
    ]),
  ].sort(compareText);
}

function counters(): Counters {
  return {
    atomicReadOperationCount: 0,
    atomicWriteOperationCount: 0,
    revisionReadOperationCount: 0,
    revisionWriteOperationCount: 0,
    verificationReadCount: 0,
  };
}

function validAdapter(value: unknown): value is FitCoreAtomicPersistenceAdapter {
  try {
    return (
      value !== null &&
      (typeof value === "object" || typeof value === "function") &&
      typeof (value as FitCoreAtomicPersistenceAdapter).getItem === "function" &&
      typeof (value as FitCoreAtomicPersistenceAdapter).setItem === "function"
    );
  } catch {
    return false;
  }
}

function validRevision(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    Number.isFinite(value) &&
    value >= 0 &&
    !Object.is(value, -0)
  );
}

function inspectOptions(value: unknown): FitCoreRevisionedPersistenceIssueCode | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return "invalid_options";
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return "invalid_options";
    if (Object.getOwnPropertySymbols(value).length > 0) return "invalid_options";
    const names = Object.getOwnPropertyNames(value).sort(compareText);
    const keys = Object.keys(value).sort(compareText);
    const expected = ["expectedRevision", "exportedAt", "writeToken"];
    if (
      names.length !== expected.length ||
      keys.length !== expected.length ||
      keys.some((key, index) => key !== expected[index])
    )
      return "invalid_options";
    const options = value as Record<string, unknown>;
    if (typeof options.exportedAt !== "string") return "invalid_options";
    if (options.expectedRevision !== null && !validRevision(options.expectedRevision))
      return "invalid_expected_revision";
    if (typeof options.writeToken !== "string" || !TOKEN_PATTERN.test(options.writeToken))
      return "invalid_write_token";
    return null;
  } catch {
    return "invalid_options";
  }
}

function isSlot(value: unknown): value is FitCoreAtomicPersistenceSlot {
  return value === "a" || value === "b";
}

function recordJson(record: FitCoreRevisionRecordV1): string {
  return (
    `{"format":${JSON.stringify(record.format)},` +
    `"version":${record.version},` +
    `"policy":${JSON.stringify(record.policy)},` +
    `"atomicPolicy":${JSON.stringify(record.atomicPolicy)},` +
    `"revision":${record.revision},` +
    `"writeToken":${JSON.stringify(record.writeToken)},` +
    `"activeSlot":${JSON.stringify(record.activeSlot)}}`
  );
}

function inspectRecord(raw: string): RevisionInspection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "invalid", record: null, issueCode: "revision_invalid_json" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    return { status: "invalid", record: null, issueCode: "revision_invalid_shape" };
  const value = parsed as Record<string, unknown>;
  const keys = Object.keys(value);
  if (keys.some((key) => !(RECORD_FIELDS as readonly string[]).includes(key)))
    return { status: "invalid", record: null, issueCode: "revision_unknown_field" };
  if (
    keys.length !== RECORD_FIELDS.length ||
    RECORD_FIELDS.some((key) => !Object.hasOwn(value, key))
  )
    return { status: "invalid", record: null, issueCode: "revision_invalid_shape" };
  if (value.format !== FITCORE_REVISION_RECORD_FORMAT)
    return { status: "invalid", record: null, issueCode: "revision_invalid_format" };
  if (value.version !== FITCORE_REVISION_RECORD_VERSION)
    return { status: "unsupported", record: null, issueCode: "revision_unsupported_version" };
  if (value.policy !== FITCORE_REVISIONED_PERSISTENCE_POLICY)
    return { status: "invalid", record: null, issueCode: "revision_invalid_policy" };
  if (value.atomicPolicy !== FITCORE_ATOMIC_PERSISTENCE_POLICY)
    return { status: "invalid", record: null, issueCode: "revision_invalid_atomic_policy" };
  if (!validRevision(value.revision) || value.revision < 1)
    return { status: "invalid", record: null, issueCode: "revision_invalid_number" };
  if (typeof value.writeToken !== "string" || !TOKEN_PATTERN.test(value.writeToken))
    return { status: "invalid", record: null, issueCode: "revision_invalid_token" };
  if (!isSlot(value.activeSlot))
    return { status: "invalid", record: null, issueCode: "revision_invalid_slot" };
  const record = deepFreeze<FitCoreRevisionRecordV1>({
    format: FITCORE_REVISION_RECORD_FORMAT,
    version: FITCORE_REVISION_RECORD_VERSION,
    policy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    atomicPolicy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    revision: value.revision,
    writeToken: value.writeToken,
    activeSlot: value.activeSlot,
  });
  if (recordJson(record) !== raw)
    return { status: "invalid", record: null, issueCode: "revision_invalid_shape" };
  return { status: "valid", record, issueCode: null };
}

function readRevision(
  adapter: FitCoreAtomicPersistenceAdapter,
  count: Counters,
  verification = false,
): { ok: boolean; value: string | null } {
  count.revisionReadOperationCount += 1;
  if (verification) count.verificationReadCount += 1;
  try {
    const value = adapter.getItem(FITCORE_REVISION_STORAGE_KEY);
    if (value !== null && typeof value !== "string") return { ok: false, value: null };
    return { ok: true, value };
  } catch {
    return { ok: false, value: null };
  }
}

function writeRevision(
  adapter: FitCoreAtomicPersistenceAdapter,
  value: string,
  count: Counters,
): boolean {
  count.revisionWriteOperationCount += 1;
  try {
    adapter.setItem(FITCORE_REVISION_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function addAtomicRead(count: Counters, result: FitCoreAtomicPersistenceReadResult): void {
  count.atomicReadOperationCount += result.summary.readOperationCount;
}

function readSummary(
  count: Counters,
  issues: readonly FitCoreRevisionedPersistenceIssue[],
  loadedSerializedCharacterCount: number,
): FitCoreRevisionedPersistenceReadSummary {
  return {
    atomicReadOperationCount: count.atomicReadOperationCount,
    revisionReadOperationCount: count.revisionReadOperationCount,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
    loadedSerializedCharacterCount,
  };
}

function makeRead(
  count: Counters,
  status: FitCoreRevisionedPersistenceReadStatus,
  issues: FitCoreRevisionedPersistenceIssue[],
  metadata: {
    record?: FitCoreRevisionRecordV1 | null;
    atomic?: FitCoreAtomicPersistenceReadResult | null;
    loadedSerializedCharacterCount?: number;
  } = {},
): FitCoreRevisionedPersistenceReadResult {
  const safeToUse = status === "loaded" || status === "loaded_with_warnings";
  const record = metadata.record ?? null;
  const atomic = metadata.atomic ?? null;
  return deepFreeze({
    policy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    atomicPolicy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status,
    safeToUse,
    requiresReview: status === "loaded_with_warnings",
    currentRevision: record?.revision ?? null,
    writeToken: record?.writeToken ?? null,
    activeSlot: record?.activeSlot ?? atomic?.activeSlot ?? null,
    previousSlot: atomic?.previousSlot ?? null,
    loadedSlot: safeToUse ? (atomic?.loadedSlot ?? null) : null,
    envelope: safeToUse ? (atomic?.envelope ?? null) : null,
    reasonKey: `persistence.revision.reason.${status}`,
    limitationKeys: limitations(
      issues,
      status === "recovery_required" || status === "corrupt"
        ? ["persistence.revision.limitation.manual_recovery_required"]
        : [],
    ),
    issues,
    summary: readSummary(
      count,
      issues,
      safeToUse ? (metadata.loadedSerializedCharacterCount ?? 0) : 0,
    ),
  });
}

function readInternal(adapter: FitCoreAtomicPersistenceAdapter, count: Counters): InternalRead {
  const atomic = readFitCoreAtomicPersistence(adapter);
  addAtomicRead(count, atomic);
  const revisionRead = readRevision(adapter, count);
  if (atomic.status === "storage_error" || !revisionRead.ok) {
    return {
      report: makeRead(count, "storage_error", [
        issue(!revisionRead.ok ? "revision_read_failed" : "atomic_storage_error"),
      ]),
      atomic,
      revisionRaw: null,
      record: null,
    };
  }
  if (atomic.status === "empty" && revisionRead.value === null)
    return {
      report: makeRead(count, "empty", [], { atomic }),
      atomic,
      revisionRaw: null,
      record: null,
    };
  if (atomic.status === "corrupt")
    return {
      report: makeRead(count, "corrupt", [issue("atomic_persistence_blocked")], { atomic }),
      atomic,
      revisionRaw: revisionRead.value,
      record: null,
    };
  if (
    atomic.status === "recovery_required" ||
    atomic.status === "recovered_previous" ||
    revisionRead.value === null
  )
    return {
      report: makeRead(
        count,
        "recovery_required",
        [issue(revisionRead.value === null ? "revision_missing" : "atomic_persistence_blocked")],
        { atomic },
      ),
      atomic,
      revisionRaw: revisionRead.value,
      record: null,
    };
  const inspected = inspectRecord(revisionRead.value);
  if (inspected.status !== "valid" || inspected.record === null)
    return {
      report: makeRead(
        count,
        "recovery_required",
        [issue(inspected.issueCode ?? "revision_invalid_shape")],
        { atomic },
      ),
      atomic,
      revisionRaw: revisionRead.value,
      record: null,
    };
  if (atomic.status === "empty" || atomic.loadedSlot !== inspected.record.activeSlot)
    return {
      report: makeRead(count, "recovery_required", [issue("revision_atomic_slot_mismatch")], {
        atomic,
        record: inspected.record,
      }),
      atomic,
      revisionRaw: revisionRead.value,
      record: inspected.record,
    };
  const status = atomic.status === "loaded_with_warnings" ? "loaded_with_warnings" : "loaded";
  return {
    report: makeRead(count, status, [], {
      atomic,
      record: inspected.record,
      loadedSerializedCharacterCount: atomic.summary.loadedSerializedCharacterCount,
    }),
    atomic,
    revisionRaw: revisionRead.value,
    record: inspected.record,
  };
}

function writeSummary(
  count: Counters,
  issues: readonly FitCoreRevisionedPersistenceIssue[],
  expectedSerializedCharacterCount: number,
): FitCoreRevisionedPersistenceWriteSummary {
  return {
    atomicReadOperationCount: count.atomicReadOperationCount,
    atomicWriteOperationCount: count.atomicWriteOperationCount,
    revisionReadOperationCount: count.revisionReadOperationCount,
    revisionWriteOperationCount: count.revisionWriteOperationCount,
    verificationReadCount: count.verificationReadCount,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
    expectedSerializedCharacterCount,
  };
}

function makeWrite(
  count: Counters,
  status: FitCoreRevisionedPersistenceWriteStatus,
  issues: FitCoreRevisionedPersistenceIssue[],
  metadata: {
    expectedRevision?: number | null;
    observedRevision?: number | null;
    committedRevision?: number | null;
    writeToken?: string | null;
    activeSlot?: FitCoreAtomicPersistenceSlot | null;
    previousSlot?: FitCoreAtomicPersistenceSlot | null;
    stagedSlot?: FitCoreAtomicPersistenceSlot | null;
    expectedSerializedCharacterCount?: number;
  } = {},
): FitCoreRevisionedPersistenceWriteResult {
  const safeToUse = status === "committed" || status === "committed_with_warnings";
  return deepFreeze({
    policy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
    atomicPolicy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status,
    safeToUse,
    requiresReview: status === "committed_with_warnings",
    expectedRevision: metadata.expectedRevision ?? null,
    observedRevision: metadata.observedRevision ?? null,
    committedRevision: safeToUse ? (metadata.committedRevision ?? null) : null,
    writeToken: metadata.writeToken ?? null,
    activeSlot: status === "indeterminate" ? null : (metadata.activeSlot ?? null),
    previousSlot: status === "indeterminate" ? null : (metadata.previousSlot ?? null),
    stagedSlot: metadata.stagedSlot ?? null,
    reasonKey: `persistence.revision.reason.${status}`,
    limitationKeys: limitations(
      issues,
      status === "indeterminate"
        ? ["persistence.revision.limitation.manual_recovery_required"]
        : [],
    ),
    issues,
    summary: writeSummary(count, issues, metadata.expectedSerializedCharacterCount ?? 0),
  });
}

export function readFitCoreRevisionedPersistence(
  adapter: FitCoreAtomicPersistenceAdapter,
): FitCoreRevisionedPersistenceReadResult {
  const count = counters();
  if (!validAdapter(adapter)) return makeRead(count, "storage_error", [issue("invalid_adapter")]);
  try {
    return readInternal(adapter, count).report;
  } catch {
    return makeRead(count, "storage_error", [issue("revision_read_failed")]);
  }
}

export function persistFitCoreStateWithRevision(
  adapter: FitCoreAtomicPersistenceAdapter,
  value: unknown,
  options: FitCoreRevisionedPersistenceOptions,
): FitCoreRevisionedPersistenceWriteResult {
  const count = counters();
  if (!validAdapter(adapter)) return makeWrite(count, "blocked", [issue("invalid_adapter")]);
  const optionsIssue = inspectOptions(options);
  if (optionsIssue !== null) return makeWrite(count, "blocked", [issue(optionsIssue)]);
  const metadata = {
    expectedRevision: options.expectedRevision,
    writeToken: options.writeToken,
  };
  try {
    const creation = createFitCoreBackupEnvelope(value, { exportedAt: options.exportedAt });
    if (creation.status === "blocked" || creation.envelope === null)
      return makeWrite(count, "blocked", [issue("backup_creation_blocked")], metadata);
    const expectedSerialization = serializeFitCoreBackupEnvelope(creation.envelope);
    if (expectedSerialization.status !== "serialized" || expectedSerialization.json === null)
      return makeWrite(count, "blocked", [issue("backup_creation_blocked")], metadata);
    const expectedCharacters = expectedSerialization.characterCount;
    const preflight = readInternal(adapter, count);
    if (
      preflight.report.status !== "empty" &&
      preflight.report.status !== "loaded" &&
      preflight.report.status !== "loaded_with_warnings"
    )
      return makeWrite(
        count,
        preflight.report.status === "storage_error" ? "storage_error" : "blocked",
        [
          issue(
            preflight.report.status === "storage_error"
              ? "atomic_storage_error"
              : "atomic_persistence_blocked",
          ),
        ],
        { ...metadata, expectedSerializedCharacterCount: expectedCharacters },
      );
    const observedRevision = preflight.record?.revision ?? null;
    const common = {
      ...metadata,
      observedRevision,
      activeSlot: preflight.report.activeSlot,
      previousSlot: preflight.report.previousSlot,
      expectedSerializedCharacterCount: expectedCharacters,
    };
    if (options.expectedRevision !== observedRevision)
      return makeWrite(count, "stale_write_rejected", [issue("stale_expected_revision")], common);
    if (preflight.record?.writeToken === options.writeToken)
      return makeWrite(count, "blocked", [issue("duplicate_write_token")], common);
    if (observedRevision === Number.MAX_SAFE_INTEGER)
      return makeWrite(count, "blocked", [issue("revision_overflow")], common);
    const nextRevision = observedRevision === null ? 1 : observedRevision + 1;

    const atomicWrite = persistFitCoreStateAtomically(adapter, value, {
      exportedAt: options.exportedAt,
    });
    count.atomicReadOperationCount += atomicWrite.summary.readOperationCount;
    count.atomicWriteOperationCount += atomicWrite.summary.writeOperationCount;
    count.verificationReadCount += atomicWrite.summary.verificationReadCount;
    const afterAtomic = {
      ...common,
      activeSlot: atomicWrite.activeSlot,
      previousSlot: atomicWrite.previousSlot,
      stagedSlot: atomicWrite.stagedSlot,
    };
    if (atomicWrite.status !== "committed" && atomicWrite.status !== "committed_with_warnings") {
      const mapping =
        atomicWrite.status === "storage_error"
          ? ["storage_error", "atomic_storage_error"]
          : atomicWrite.status === "verification_failed"
            ? ["verification_failed", "atomic_verification_failed"]
            : atomicWrite.status === "indeterminate"
              ? ["indeterminate", "atomic_indeterminate"]
              : ["blocked", "atomic_persistence_blocked"];
      return makeWrite(
        count,
        mapping[0] as FitCoreRevisionedPersistenceWriteStatus,
        [issue(mapping[1] as FitCoreRevisionedPersistenceIssueCode)],
        afterAtomic,
      );
    }

    const snapshotCheck = readRevision(adapter, count, true);
    if (!snapshotCheck.ok)
      return makeWrite(
        count,
        "indeterminate",
        [issue("commit_outcome_indeterminate")],
        afterAtomic,
      );
    if (snapshotCheck.value !== preflight.revisionRaw)
      return makeWrite(
        count,
        "conflict_detected",
        [issue("revision_changed_during_write"), issue("concurrent_write_detected")],
        afterAtomic,
      );

    const record = deepFreeze<FitCoreRevisionRecordV1>({
      format: FITCORE_REVISION_RECORD_FORMAT,
      version: FITCORE_REVISION_RECORD_VERSION,
      policy: FITCORE_REVISIONED_PERSISTENCE_POLICY,
      atomicPolicy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
      revision: nextRevision,
      writeToken: options.writeToken,
      activeSlot: atomicWrite.activeSlot!,
    });
    const newRaw = recordJson(record);
    const writeSucceeded = writeRevision(adapter, newRaw, count);
    const readback = readRevision(adapter, count, true);
    if (!readback.ok)
      return makeWrite(
        count,
        "indeterminate",
        [issue("revision_read_failed"), issue("commit_outcome_indeterminate")],
        afterAtomic,
      );
    if (readback.value !== newRaw) {
      const oldProven = readback.value === preflight.revisionRaw;
      return makeWrite(
        count,
        oldProven ? (writeSucceeded ? "verification_failed" : "storage_error") : "indeterminate",
        [
          issue(
            oldProven
              ? writeSucceeded
                ? "revision_readback_mismatch"
                : "revision_write_failed"
              : "commit_outcome_indeterminate",
          ),
        ],
        afterAtomic,
      );
    }
    const readbackInspection = inspectRecord(readback.value);
    if (readbackInspection.status !== "valid")
      return makeWrite(
        count,
        "verification_failed",
        [issue("revision_readback_mismatch")],
        afterAtomic,
      );

    const finalAtomic = readFitCoreAtomicPersistence(adapter);
    addAtomicRead(count, finalAtomic);
    count.verificationReadCount += finalAtomic.summary.readOperationCount;
    if (finalAtomic.status === "storage_error")
      return makeWrite(
        count,
        "indeterminate",
        [issue("commit_outcome_indeterminate")],
        afterAtomic,
      );
    if (finalAtomic.status !== "loaded" && finalAtomic.status !== "loaded_with_warnings")
      return makeWrite(
        count,
        "conflict_detected",
        [issue("concurrent_write_detected")],
        afterAtomic,
      );
    if (finalAtomic.loadedSlot !== record.activeSlot)
      return makeWrite(count, "conflict_detected", [issue("final_slot_mismatch")], afterAtomic);
    const finalSerialization = serializeFitCoreBackupEnvelope(finalAtomic.envelope);
    if (
      finalSerialization.status !== "serialized" ||
      finalSerialization.json !== expectedSerialization.json
    )
      return makeWrite(count, "conflict_detected", [issue("final_backup_mismatch")], afterAtomic);

    const finalRevision = readRevision(adapter, count, true);
    if (!finalRevision.ok)
      return makeWrite(
        count,
        "indeterminate",
        [issue("commit_outcome_indeterminate")],
        afterAtomic,
      );
    if (finalRevision.value !== newRaw) {
      if (finalRevision.value !== null) {
        const finalInspection = inspectRecord(finalRevision.value);
        if (finalInspection.status === "valid" && finalInspection.record !== null) {
          const code =
            finalInspection.record.revision !== nextRevision
              ? "final_revision_mismatch"
              : finalInspection.record.writeToken !== options.writeToken
                ? "final_token_mismatch"
                : "final_slot_mismatch";
          return makeWrite(count, "conflict_detected", [issue(code)], afterAtomic);
        }
      }
      return makeWrite(
        count,
        "conflict_detected",
        [issue("concurrent_write_detected")],
        afterAtomic,
      );
    }

    const warnings: FitCoreRevisionedPersistenceIssue[] = [];
    if (!writeSucceeded) warnings.push(issue("revision_write_failed", "warning"));
    const status =
      creation.status === "created_with_warnings" ||
      atomicWrite.status === "committed_with_warnings"
        ? "committed_with_warnings"
        : "committed";
    return makeWrite(count, status, warnings, {
      ...afterAtomic,
      committedRevision: nextRevision,
    });
  } catch {
    return makeWrite(count, "indeterminate", [issue("commit_outcome_indeterminate")], metadata);
  }
}
