import {
  FITCORE_BACKUP_ENVELOPE_POLICY,
  createFitCoreBackupEnvelope,
  inspectFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
  type FitCoreBackupEnvelopeV1,
} from "./data-backup";

export const FITCORE_ATOMIC_PERSISTENCE_POLICY = "fitcore_atomic_persistence_v1" as const;
export const FITCORE_ATOMIC_MANIFEST_FORMAT = "fitcore_atomic_manifest" as const;
export const FITCORE_ATOMIC_MANIFEST_VERSION = 1 as const;

export const FITCORE_ATOMIC_PERSISTENCE_KEYS = Object.freeze({
  manifest: "fitcore.persistence.v1.manifest",
  slotA: "fitcore.persistence.v1.slot.a",
  slotB: "fitcore.persistence.v1.slot.b",
} as const);

export type FitCoreAtomicPersistenceSlot = "a" | "b";

export interface FitCoreAtomicPersistenceAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface FitCoreAtomicPersistenceOptions {
  exportedAt: string;
}

export interface FitCoreAtomicPersistenceManifestV1 {
  readonly format: typeof FITCORE_ATOMIC_MANIFEST_FORMAT;
  readonly version: typeof FITCORE_ATOMIC_MANIFEST_VERSION;
  readonly policy: typeof FITCORE_ATOMIC_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly activeSlot: FitCoreAtomicPersistenceSlot;
  readonly previousSlot: FitCoreAtomicPersistenceSlot | null;
}

export type FitCoreAtomicPersistenceWriteStatus =
  | "committed"
  | "committed_with_warnings"
  | "blocked"
  | "storage_error"
  | "verification_failed"
  | "indeterminate";

export type FitCoreAtomicPersistenceReadStatus =
  | "empty"
  | "loaded"
  | "loaded_with_warnings"
  | "recovered_previous"
  | "recovery_required"
  | "corrupt"
  | "storage_error";

export type FitCoreAtomicPersistenceIssueSeverity = "warning" | "error";

export type FitCoreAtomicPersistenceIssueCode =
  | "invalid_adapter"
  | "invalid_options"
  | "backup_creation_blocked"
  | "backup_warnings"
  | "existing_storage_recovery_required"
  | "existing_storage_corrupt"
  | "existing_storage_error"
  | "inactive_slot_unavailable"
  | "slot_write_failed"
  | "slot_read_failed"
  | "slot_readback_mismatch"
  | "slot_missing_after_write"
  | "slot_invalid_json"
  | "slot_invalid_backup"
  | "slot_noncanonical_backup"
  | "manifest_write_failed"
  | "manifest_read_failed"
  | "manifest_readback_mismatch"
  | "manifest_invalid_json"
  | "manifest_invalid_shape"
  | "manifest_unknown_field"
  | "manifest_invalid_policy"
  | "manifest_invalid_backup_policy"
  | "manifest_unsupported_version"
  | "manifest_invalid_slot"
  | "manifest_invalid_slot_relationship"
  | "active_slot_missing"
  | "active_slot_invalid"
  | "active_slot_noncanonical"
  | "previous_slot_missing"
  | "previous_slot_invalid"
  | "previous_slot_noncanonical"
  | "orphaned_slot_data"
  | "ambiguous_valid_slots"
  | "final_verification_failed"
  | "commit_outcome_indeterminate";

export interface FitCoreAtomicPersistenceIssue {
  readonly code: FitCoreAtomicPersistenceIssueCode;
  readonly severity: FitCoreAtomicPersistenceIssueSeverity;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
}

export interface FitCoreAtomicPersistenceWriteSummary {
  readonly readOperationCount: number;
  readonly writeOperationCount: number;
  readonly slotWriteCount: number;
  readonly manifestWriteCount: number;
  readonly verificationReadCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly serializedCharacterCount: number;
}

export interface FitCoreAtomicPersistenceReadSummary {
  readonly readOperationCount: number;
  readonly validSlotCount: number;
  readonly invalidSlotCount: number;
  readonly missingSlotCount: number;
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly loadedSerializedCharacterCount: number;
}

export interface FitCoreAtomicPersistenceWriteResult {
  readonly policy: typeof FITCORE_ATOMIC_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreAtomicPersistenceWriteStatus;
  readonly safeToUse: boolean;
  readonly requiresReview: boolean;
  readonly activeSlot: FitCoreAtomicPersistenceSlot | null;
  readonly previousSlot: FitCoreAtomicPersistenceSlot | null;
  readonly stagedSlot: FitCoreAtomicPersistenceSlot | null;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreAtomicPersistenceIssue[];
  readonly summary: FitCoreAtomicPersistenceWriteSummary;
}

export interface FitCoreAtomicPersistenceReadResult {
  readonly policy: typeof FITCORE_ATOMIC_PERSISTENCE_POLICY;
  readonly backupPolicy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreAtomicPersistenceReadStatus;
  readonly safeToUse: boolean;
  readonly requiresReview: boolean;
  readonly recoveryUsed: boolean;
  readonly requiresRewrite: boolean;
  readonly activeSlot: FitCoreAtomicPersistenceSlot | null;
  readonly previousSlot: FitCoreAtomicPersistenceSlot | null;
  readonly loadedSlot: FitCoreAtomicPersistenceSlot | null;
  readonly envelope: FitCoreBackupEnvelopeV1 | null;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreAtomicPersistenceIssue[];
  readonly summary: FitCoreAtomicPersistenceReadSummary;
}

interface OperationContext {
  readOperationCount: number;
  writeOperationCount: number;
  slotWriteCount: number;
  manifestWriteCount: number;
  verificationReadCount: number;
}

interface AdapterReadResult {
  ok: boolean;
  value: string | null;
}

interface SlotInspection {
  state: "missing" | "valid" | "invalid" | "noncanonical";
  envelope: FitCoreBackupEnvelopeV1 | null;
  requiresReview: boolean;
  characterCount: number;
  detail: "missing" | "invalid_json" | "invalid_backup" | "noncanonical" | "valid";
}

interface ManifestInspection {
  status: "valid" | "invalid" | "unsupported";
  manifest: FitCoreAtomicPersistenceManifestV1 | null;
  issueCode: FitCoreAtomicPersistenceIssueCode | null;
}

interface InternalReadResult {
  report: FitCoreAtomicPersistenceReadResult;
  manifest: FitCoreAtomicPersistenceManifestV1 | null;
  manifestRaw: string | null;
  slotRaw: Readonly<Record<FitCoreAtomicPersistenceSlot, string | null>>;
}

const MANIFEST_FIELDS = [
  "format",
  "version",
  "policy",
  "backupPolicy",
  "activeSlot",
  "previousSlot",
] as const;

const WRITE_LIMITATIONS = [
  "persistence.atomic.limitation.cross_tab_revision_not_enforced",
  "persistence.atomic.limitation.stale_write_protection_not_enforced",
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
  code: FitCoreAtomicPersistenceIssueCode,
  severity: FitCoreAtomicPersistenceIssueSeverity = "error",
  limitationKeys: readonly string[] = [],
): FitCoreAtomicPersistenceIssue {
  return {
    code,
    severity,
    reasonKey: `persistence.atomic.reason.${code}`,
    limitationKeys: [...limitationKeys].sort(compareText),
  };
}

function limitations(
  issues: readonly FitCoreAtomicPersistenceIssue[],
  additional: readonly string[] = [],
): string[] {
  return [...new Set([...additional, ...issues.flatMap((item) => item.limitationKeys)])].sort(
    compareText,
  );
}

function emptyContext(): OperationContext {
  return {
    readOperationCount: 0,
    writeOperationCount: 0,
    slotWriteCount: 0,
    manifestWriteCount: 0,
    verificationReadCount: 0,
  };
}

function isSlot(value: unknown): value is FitCoreAtomicPersistenceSlot {
  return value === "a" || value === "b";
}

function slotKey(slot: FitCoreAtomicPersistenceSlot): string {
  return slot === "a"
    ? FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA
    : FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB;
}

function otherSlot(slot: FitCoreAtomicPersistenceSlot): FitCoreAtomicPersistenceSlot {
  return slot === "a" ? "b" : "a";
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

function validOptions(value: unknown): value is FitCoreAtomicPersistenceOptions {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    if (Object.getOwnPropertySymbols(value).length > 0) return false;
    const names = Object.getOwnPropertyNames(value);
    const keys = Object.keys(value);
    if (names.length !== 1 || keys.length !== 1 || keys[0] !== "exportedAt") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, "exportedAt");
    return (
      descriptor !== undefined && "value" in descriptor && typeof descriptor.value === "string"
    );
  } catch {
    return false;
  }
}

function readAdapter(
  adapter: FitCoreAtomicPersistenceAdapter,
  key: string,
  context: OperationContext,
  verification = false,
): AdapterReadResult {
  context.readOperationCount += 1;
  if (verification) context.verificationReadCount += 1;
  try {
    const value = adapter.getItem(key);
    if (value !== null && typeof value !== "string") return { ok: false, value: null };
    return { ok: true, value };
  } catch {
    return { ok: false, value: null };
  }
}

function writeAdapter(
  adapter: FitCoreAtomicPersistenceAdapter,
  key: string,
  value: string,
  context: OperationContext,
  kind: "slot" | "manifest",
): boolean {
  context.writeOperationCount += 1;
  if (kind === "slot") context.slotWriteCount += 1;
  else context.manifestWriteCount += 1;
  try {
    adapter.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function inspectSlot(raw: string | null): SlotInspection {
  if (raw === null)
    return {
      state: "missing",
      envelope: null,
      requiresReview: false,
      characterCount: 0,
      detail: "missing",
    };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      state: "invalid",
      envelope: null,
      requiresReview: false,
      characterCount: raw.length,
      detail: "invalid_json",
    };
  }
  const inspection = inspectFitCoreBackupEnvelope(parsed);
  if (inspection.status !== "valid")
    return {
      state: "invalid",
      envelope: null,
      requiresReview: false,
      characterCount: raw.length,
      detail: "invalid_backup",
    };
  const serialization = serializeFitCoreBackupEnvelope(parsed);
  if (serialization.status !== "serialized" || serialization.json !== raw)
    return {
      state: "noncanonical",
      envelope: null,
      requiresReview: false,
      characterCount: raw.length,
      detail: "noncanonical",
    };
  return {
    state: "valid",
    envelope: deepFreeze(parsed as FitCoreBackupEnvelopeV1),
    requiresReview: inspection.requiresReview,
    characterCount: raw.length,
    detail: "valid",
  };
}

function manifestJson(manifest: FitCoreAtomicPersistenceManifestV1): string {
  return (
    `{"format":${JSON.stringify(manifest.format)},` +
    `"version":${manifest.version},` +
    `"policy":${JSON.stringify(manifest.policy)},` +
    `"backupPolicy":${JSON.stringify(manifest.backupPolicy)},` +
    `"activeSlot":${JSON.stringify(manifest.activeSlot)},` +
    `"previousSlot":${manifest.previousSlot === null ? "null" : JSON.stringify(manifest.previousSlot)}}`
  );
}

function inspectManifest(raw: string): ManifestInspection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_json" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_shape" };
  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !(MANIFEST_FIELDS as readonly string[]).includes(key)))
    return { status: "invalid", manifest: null, issueCode: "manifest_unknown_field" };
  if (
    keys.length !== MANIFEST_FIELDS.length ||
    MANIFEST_FIELDS.some((key) => !Object.hasOwn(record, key))
  )
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_shape" };
  if (record.format !== FITCORE_ATOMIC_MANIFEST_FORMAT)
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_shape" };
  if (record.version !== FITCORE_ATOMIC_MANIFEST_VERSION)
    return { status: "unsupported", manifest: null, issueCode: "manifest_unsupported_version" };
  if (record.policy !== FITCORE_ATOMIC_PERSISTENCE_POLICY)
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_policy" };
  if (record.backupPolicy !== FITCORE_BACKUP_ENVELOPE_POLICY)
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_backup_policy" };
  if (!isSlot(record.activeSlot) || (record.previousSlot !== null && !isSlot(record.previousSlot)))
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_slot" };
  if (record.previousSlot === record.activeSlot)
    return {
      status: "invalid",
      manifest: null,
      issueCode: "manifest_invalid_slot_relationship",
    };
  const manifest = deepFreeze<FitCoreAtomicPersistenceManifestV1>({
    format: FITCORE_ATOMIC_MANIFEST_FORMAT,
    version: FITCORE_ATOMIC_MANIFEST_VERSION,
    policy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    activeSlot: record.activeSlot,
    previousSlot: record.previousSlot,
  });
  if (manifestJson(manifest) !== raw)
    return { status: "invalid", manifest: null, issueCode: "manifest_invalid_shape" };
  return { status: "valid", manifest, issueCode: null };
}

function readSummary(
  context: OperationContext,
  slots: readonly SlotInspection[],
  issues: readonly FitCoreAtomicPersistenceIssue[],
  loadedSerializedCharacterCount: number,
): FitCoreAtomicPersistenceReadSummary {
  return {
    readOperationCount: context.readOperationCount,
    validSlotCount: slots.filter(({ state }) => state === "valid").length,
    invalidSlotCount: slots.filter(({ state }) => state === "invalid" || state === "noncanonical")
      .length,
    missingSlotCount: slots.filter(({ state }) => state === "missing").length,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
    loadedSerializedCharacterCount,
  };
}

function makeReadResult(
  context: OperationContext,
  status: FitCoreAtomicPersistenceReadStatus,
  slots: readonly SlotInspection[],
  issues: FitCoreAtomicPersistenceIssue[],
  metadata: {
    activeSlot?: FitCoreAtomicPersistenceSlot | null;
    previousSlot?: FitCoreAtomicPersistenceSlot | null;
    loadedSlot?: FitCoreAtomicPersistenceSlot | null;
    envelope?: FitCoreBackupEnvelopeV1 | null;
    requiresReview?: boolean;
    loadedSerializedCharacterCount?: number;
  } = {},
): FitCoreAtomicPersistenceReadResult {
  const safeToUse =
    status === "loaded" || status === "loaded_with_warnings" || status === "recovered_previous";
  return deepFreeze({
    policy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status,
    safeToUse,
    requiresReview: safeToUse && (metadata.requiresReview ?? false),
    recoveryUsed: status === "recovered_previous",
    requiresRewrite: status === "recovered_previous",
    activeSlot: metadata.activeSlot ?? null,
    previousSlot: metadata.previousSlot ?? null,
    loadedSlot: safeToUse ? (metadata.loadedSlot ?? null) : null,
    envelope: safeToUse ? (metadata.envelope ?? null) : null,
    reasonKey: `persistence.atomic.reason.${status}`,
    limitationKeys: limitations(
      issues,
      status === "recovered_previous"
        ? ["persistence.atomic.limitation.recovery_does_not_rewrite"]
        : status === "recovery_required" || status === "corrupt"
          ? ["persistence.atomic.limitation.manual_recovery_required"]
          : [],
    ),
    issues,
    summary: readSummary(
      context,
      slots,
      issues,
      safeToUse ? (metadata.loadedSerializedCharacterCount ?? 0) : 0,
    ),
  });
}

function slotIssue(
  slot: "active" | "previous",
  inspection: SlotInspection,
): FitCoreAtomicPersistenceIssue {
  if (slot === "active") {
    if (inspection.state === "missing") return issue("active_slot_missing");
    if (inspection.state === "noncanonical") return issue("active_slot_noncanonical");
    return issue("active_slot_invalid");
  }
  if (inspection.state === "missing") return issue("previous_slot_missing");
  if (inspection.state === "noncanonical") return issue("previous_slot_noncanonical");
  return issue("previous_slot_invalid");
}

function readInternal(
  adapter: FitCoreAtomicPersistenceAdapter,
  context: OperationContext,
): InternalReadResult {
  const manifestRead = readAdapter(adapter, FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest, context);
  const slotARead = readAdapter(adapter, FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA, context);
  const slotBRead = readAdapter(adapter, FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB, context);
  if (!manifestRead.ok || !slotARead.ok || !slotBRead.ok) {
    return {
      report: makeReadResult(context, "storage_error", [], [issue("existing_storage_error")]),
      manifest: null,
      manifestRaw: null,
      slotRaw: { a: null, b: null },
    };
  }

  const slotRaw = { a: slotARead.value, b: slotBRead.value } as const;
  const slotA = inspectSlot(slotRaw.a);
  const slotB = inspectSlot(slotRaw.b);
  const slots = [slotA, slotB] as const;
  if (manifestRead.value === null) {
    if (slotRaw.a === null && slotRaw.b === null) {
      return {
        report: makeReadResult(context, "empty", slots, []),
        manifest: null,
        manifestRaw: null,
        slotRaw,
      };
    }
    const code =
      slotA.state === "valid" && slotB.state === "valid"
        ? "ambiguous_valid_slots"
        : "orphaned_slot_data";
    return {
      report: makeReadResult(context, "recovery_required", slots, [issue(code)]),
      manifest: null,
      manifestRaw: null,
      slotRaw,
    };
  }

  const manifestInspection = inspectManifest(manifestRead.value);
  if (manifestInspection.status !== "valid" || manifestInspection.manifest === null) {
    const status: FitCoreAtomicPersistenceReadStatus =
      manifestInspection.status === "unsupported" || slotRaw.a !== null || slotRaw.b !== null
        ? "recovery_required"
        : "corrupt";
    return {
      report: makeReadResult(context, status, slots, [
        issue(manifestInspection.issueCode ?? "manifest_invalid_shape"),
      ]),
      manifest: null,
      manifestRaw: manifestRead.value,
      slotRaw,
    };
  }

  const manifest = manifestInspection.manifest;
  const bySlot = { a: slotA, b: slotB } as const;
  const active = bySlot[manifest.activeSlot];
  if (active.state === "valid" && active.envelope !== null) {
    const status = active.requiresReview ? "loaded_with_warnings" : "loaded";
    return {
      report: makeReadResult(context, status, slots, [], {
        activeSlot: manifest.activeSlot,
        previousSlot: manifest.previousSlot,
        loadedSlot: manifest.activeSlot,
        envelope: active.envelope,
        requiresReview: active.requiresReview,
        loadedSerializedCharacterCount: active.characterCount,
      }),
      manifest,
      manifestRaw: manifestRead.value,
      slotRaw,
    };
  }

  if (manifest.previousSlot !== null) {
    const previous = bySlot[manifest.previousSlot];
    if (previous.state === "valid" && previous.envelope !== null) {
      return {
        report: makeReadResult(
          context,
          "recovered_previous",
          slots,
          [slotIssue("active", active)],
          {
            activeSlot: manifest.activeSlot,
            previousSlot: manifest.previousSlot,
            loadedSlot: manifest.previousSlot,
            envelope: previous.envelope,
            requiresReview: previous.requiresReview,
            loadedSerializedCharacterCount: previous.characterCount,
          },
        ),
        manifest,
        manifestRaw: manifestRead.value,
        slotRaw,
      };
    }
    return {
      report: makeReadResult(context, "corrupt", slots, [
        slotIssue("active", active),
        slotIssue("previous", previous),
      ]),
      manifest,
      manifestRaw: manifestRead.value,
      slotRaw,
    };
  }

  const unreferenced = bySlot[otherSlot(manifest.activeSlot)];
  if (unreferenced.state === "valid") {
    return {
      report: makeReadResult(context, "recovery_required", slots, [
        slotIssue("active", active),
        issue("orphaned_slot_data"),
      ]),
      manifest,
      manifestRaw: manifestRead.value,
      slotRaw,
    };
  }
  return {
    report: makeReadResult(context, "corrupt", slots, [slotIssue("active", active)]),
    manifest,
    manifestRaw: manifestRead.value,
    slotRaw,
  };
}

function writeSummary(
  context: OperationContext,
  issues: readonly FitCoreAtomicPersistenceIssue[],
  serializedCharacterCount: number,
): FitCoreAtomicPersistenceWriteSummary {
  return {
    readOperationCount: context.readOperationCount,
    writeOperationCount: context.writeOperationCount,
    slotWriteCount: context.slotWriteCount,
    manifestWriteCount: context.manifestWriteCount,
    verificationReadCount: context.verificationReadCount,
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
    serializedCharacterCount,
  };
}

function makeWriteResult(
  context: OperationContext,
  status: FitCoreAtomicPersistenceWriteStatus,
  issues: FitCoreAtomicPersistenceIssue[],
  metadata: {
    activeSlot?: FitCoreAtomicPersistenceSlot | null;
    previousSlot?: FitCoreAtomicPersistenceSlot | null;
    stagedSlot?: FitCoreAtomicPersistenceSlot | null;
    serializedCharacterCount?: number;
  } = {},
): FitCoreAtomicPersistenceWriteResult {
  const safeToUse = status === "committed" || status === "committed_with_warnings";
  return deepFreeze({
    policy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
    backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status,
    safeToUse,
    requiresReview: status === "committed_with_warnings",
    activeSlot: status === "indeterminate" ? null : (metadata.activeSlot ?? null),
    previousSlot: status === "indeterminate" ? null : (metadata.previousSlot ?? null),
    stagedSlot: metadata.stagedSlot ?? null,
    reasonKey: `persistence.atomic.reason.${status}`,
    limitationKeys: limitations(issues, [
      ...WRITE_LIMITATIONS,
      ...(metadata.previousSlot !== null && metadata.previousSlot !== undefined
        ? ["persistence.atomic.limitation.previous_slot_retained"]
        : []),
      ...(status === "indeterminate" ? ["persistence.atomic.limitation.fresh_read_required"] : []),
    ]),
    issues,
    summary: writeSummary(context, issues, metadata.serializedCharacterCount ?? 0),
  });
}

function stagedIssue(inspection: SlotInspection): FitCoreAtomicPersistenceIssue {
  if (inspection.detail === "invalid_json") return issue("slot_invalid_json");
  if (inspection.detail === "invalid_backup") return issue("slot_invalid_backup");
  if (inspection.detail === "noncanonical") return issue("slot_noncanonical_backup");
  if (inspection.detail === "missing") return issue("slot_missing_after_write");
  return issue("slot_readback_mismatch");
}

function manifestMatches(
  left: FitCoreAtomicPersistenceManifestV1,
  right: FitCoreAtomicPersistenceManifestV1,
): boolean {
  return manifestJson(left) === manifestJson(right);
}

export function readFitCoreAtomicPersistence(
  adapter: FitCoreAtomicPersistenceAdapter,
): FitCoreAtomicPersistenceReadResult {
  const context = emptyContext();
  if (!validAdapter(adapter))
    return makeReadResult(context, "storage_error", [], [issue("invalid_adapter")]);
  try {
    return readInternal(adapter, context).report;
  } catch {
    return makeReadResult(context, "storage_error", [], [issue("existing_storage_error")]);
  }
}

export function persistFitCoreStateAtomically(
  adapter: FitCoreAtomicPersistenceAdapter,
  value: unknown,
  options: FitCoreAtomicPersistenceOptions,
): FitCoreAtomicPersistenceWriteResult {
  const context = emptyContext();
  if (!validAdapter(adapter))
    return makeWriteResult(context, "blocked", [issue("invalid_adapter")]);
  if (!validOptions(options))
    return makeWriteResult(context, "blocked", [issue("invalid_options")]);

  try {
    const existing = readInternal(adapter, context);
    if (existing.report.status === "storage_error")
      return makeWriteResult(context, "storage_error", [issue("existing_storage_error")]);
    if (
      existing.report.status !== "empty" &&
      existing.report.status !== "loaded" &&
      existing.report.status !== "loaded_with_warnings"
    ) {
      const code =
        existing.report.status === "corrupt"
          ? "existing_storage_corrupt"
          : "existing_storage_recovery_required";
      return makeWriteResult(context, "blocked", [issue(code)], {
        activeSlot: existing.report.activeSlot,
        previousSlot: existing.report.previousSlot,
      });
    }

    const creation = createFitCoreBackupEnvelope(value, options);
    if (creation.status === "blocked" || creation.envelope === null) {
      const code = creation.issues.some(
        ({ code: backupCode }) =>
          backupCode === "invalid_options" || backupCode === "invalid_exported_at",
      )
        ? "invalid_options"
        : "backup_creation_blocked";
      return makeWriteResult(context, "blocked", [issue(code)]);
    }
    const serialization = serializeFitCoreBackupEnvelope(creation.envelope);
    if (serialization.status !== "serialized" || serialization.json === null)
      return makeWriteResult(context, "blocked", [issue("backup_creation_blocked")]);

    const serializedCharacterCount = serialization.characterCount;
    const stagedSlot: FitCoreAtomicPersistenceSlot =
      existing.report.status === "empty" ? "a" : otherSlot(existing.report.activeSlot!);
    const previousSlot = existing.report.status === "empty" ? null : existing.report.activeSlot;
    if (previousSlot === stagedSlot)
      return makeWriteResult(context, "blocked", [issue("inactive_slot_unavailable")], {
        activeSlot: existing.report.activeSlot,
        previousSlot: existing.report.previousSlot,
        stagedSlot,
        serializedCharacterCount,
      });

    const writeWarnings: FitCoreAtomicPersistenceIssue[] = [];
    const slotWriteSucceeded = writeAdapter(
      adapter,
      slotKey(stagedSlot),
      serialization.json,
      context,
      "slot",
    );
    const stagedRead = readAdapter(adapter, slotKey(stagedSlot), context, true);
    if (!stagedRead.ok)
      return makeWriteResult(context, "storage_error", [issue("slot_read_failed")], {
        activeSlot: existing.report.activeSlot,
        previousSlot: existing.report.previousSlot,
        stagedSlot,
        serializedCharacterCount,
      });
    if (stagedRead.value !== serialization.json) {
      const code =
        stagedRead.value === null ? "slot_missing_after_write" : "slot_readback_mismatch";
      const mismatchIssues = [
        ...(!slotWriteSucceeded ? [issue("slot_write_failed")] : []),
        issue(code),
      ];
      return makeWriteResult(
        context,
        slotWriteSucceeded ? "verification_failed" : "storage_error",
        mismatchIssues,
        {
          activeSlot: existing.report.activeSlot,
          previousSlot: existing.report.previousSlot,
          stagedSlot,
          serializedCharacterCount,
        },
      );
    }
    const stagedInspection = inspectSlot(stagedRead.value);
    if (stagedInspection.state !== "valid")
      return makeWriteResult(context, "verification_failed", [stagedIssue(stagedInspection)], {
        activeSlot: existing.report.activeSlot,
        previousSlot: existing.report.previousSlot,
        stagedSlot,
        serializedCharacterCount,
      });
    if (!slotWriteSucceeded) writeWarnings.push(issue("slot_write_failed", "warning"));

    const newManifest = deepFreeze<FitCoreAtomicPersistenceManifestV1>({
      format: FITCORE_ATOMIC_MANIFEST_FORMAT,
      version: FITCORE_ATOMIC_MANIFEST_VERSION,
      policy: FITCORE_ATOMIC_PERSISTENCE_POLICY,
      backupPolicy: FITCORE_BACKUP_ENVELOPE_POLICY,
      activeSlot: stagedSlot,
      previousSlot,
    });
    const newManifestJson = manifestJson(newManifest);
    const manifestWriteSucceeded = writeAdapter(
      adapter,
      FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
      newManifestJson,
      context,
      "manifest",
    );
    const manifestRead = readAdapter(
      adapter,
      FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
      context,
      true,
    );
    if (!manifestRead.ok)
      return makeWriteResult(
        context,
        "indeterminate",
        [
          issue("manifest_read_failed"),
          issue("commit_outcome_indeterminate", "error", [
            "persistence.atomic.limitation.fresh_read_required",
          ]),
        ],
        {
          activeSlot: existing.report.activeSlot,
          previousSlot: existing.report.previousSlot,
          stagedSlot,
          serializedCharacterCount,
        },
      );

    if (manifestRead.value !== newManifestJson) {
      const oldManifestStillAuthoritative = manifestRead.value === existing.manifestRaw;
      return makeWriteResult(
        context,
        oldManifestStillAuthoritative
          ? manifestWriteSucceeded
            ? "verification_failed"
            : "storage_error"
          : "indeterminate",
        [
          issue(
            oldManifestStillAuthoritative
              ? manifestWriteSucceeded
                ? "manifest_readback_mismatch"
                : "manifest_write_failed"
              : "commit_outcome_indeterminate",
          ),
        ],
        {
          activeSlot: existing.report.activeSlot,
          previousSlot: existing.report.previousSlot,
          stagedSlot,
          serializedCharacterCount,
        },
      );
    }
    const verifiedManifest = inspectManifest(manifestRead.value);
    if (
      verifiedManifest.status !== "valid" ||
      verifiedManifest.manifest === null ||
      !manifestMatches(verifiedManifest.manifest, newManifest)
    )
      return makeWriteResult(
        context,
        "indeterminate",
        [
          issue("commit_outcome_indeterminate", "error", [
            "persistence.atomic.limitation.fresh_read_required",
          ]),
        ],
        {
          activeSlot: existing.report.activeSlot,
          previousSlot: existing.report.previousSlot,
          stagedSlot,
          serializedCharacterCount,
        },
      );
    if (!manifestWriteSucceeded) writeWarnings.push(issue("manifest_write_failed", "warning"));

    const finalSlotRead = readAdapter(adapter, slotKey(stagedSlot), context, true);
    const finalSlot = finalSlotRead.ok ? inspectSlot(finalSlotRead.value) : inspectSlot(null);
    if (
      !finalSlotRead.ok ||
      finalSlotRead.value !== serialization.json ||
      finalSlot.state !== "valid"
    ) {
      const authorityRead = readAdapter(
        adapter,
        FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
        context,
        true,
      );
      const authorityKnown =
        authorityRead.ok &&
        (authorityRead.value === newManifestJson || authorityRead.value === existing.manifestRaw);
      return makeWriteResult(
        context,
        authorityKnown ? "verification_failed" : "indeterminate",
        [
          issue(
            authorityKnown ? "final_verification_failed" : "commit_outcome_indeterminate",
            "error",
            authorityKnown ? [] : ["persistence.atomic.limitation.fresh_read_required"],
          ),
        ],
        {
          activeSlot:
            authorityRead.value === newManifestJson ? stagedSlot : existing.report.activeSlot,
          previousSlot:
            authorityRead.value === newManifestJson ? previousSlot : existing.report.previousSlot,
          stagedSlot,
          serializedCharacterCount,
        },
      );
    }

    if (creation.status === "created_with_warnings")
      writeWarnings.push(issue("backup_warnings", "warning"));
    const status: FitCoreAtomicPersistenceWriteStatus =
      creation.status === "created_with_warnings" ? "committed_with_warnings" : "committed";
    return makeWriteResult(context, status, writeWarnings, {
      activeSlot: stagedSlot,
      previousSlot,
      stagedSlot,
      serializedCharacterCount,
    });
  } catch {
    return makeWriteResult(context, "indeterminate", [
      issue("commit_outcome_indeterminate", "error", [
        "persistence.atomic.limitation.fresh_read_required",
      ]),
    ]);
  }
}
