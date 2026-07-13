import {
  FITCORE_DATA_INTEGRITY_POLICY,
  validateFitCoreDataIntegrity,
  type DataIntegrityIssueCode,
  type DataIntegritySeverity,
  type DataIntegrityStatus,
} from "./data-integrity";

export const FITCORE_BACKUP_ENVELOPE_POLICY = "fitcore_backup_envelope_v1" as const;
export const FITCORE_BACKUP_FORMAT = "fitcore_backup" as const;
export const FITCORE_BACKUP_FORMAT_VERSION = 1 as const;
export const FITCORE_BACKUP_PAYLOAD_KIND = "fitcore_app_state" as const;
export const FITCORE_BACKUP_PAYLOAD_SCHEMA_VERSION = 1 as const;

export const FITCORE_BACKUP_EXPORT_LIMITS = Object.freeze({
  maxSerializedCharacters: 10_000_000,
  maxDepth: 64,
  maxNodes: 250_000,
  maxArrayLength: 50_000,
  maxObjectKeys: 10_000,
  maxStringLength: 1_000_000,
} as const);

export type FitCoreBackupJsonPrimitive = null | boolean | number | string;
export type FitCoreBackupJsonValue =
  | FitCoreBackupJsonPrimitive
  | FitCoreBackupJsonValue[]
  | FitCoreBackupJsonObject;
export interface FitCoreBackupJsonObject {
  [key: string]: FitCoreBackupJsonValue;
}

export interface FitCoreBackupCreationOptions {
  exportedAt: string;
}

export interface FitCoreBackupEnvelopeV1 {
  readonly format: typeof FITCORE_BACKUP_FORMAT;
  readonly formatVersion: typeof FITCORE_BACKUP_FORMAT_VERSION;
  readonly payloadKind: typeof FITCORE_BACKUP_PAYLOAD_KIND;
  readonly payloadSchemaVersion: typeof FITCORE_BACKUP_PAYLOAD_SCHEMA_VERSION;
  readonly exportedAt: string;
  readonly policies: {
    readonly backupEnvelope: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
    readonly dataIntegrity: typeof FITCORE_DATA_INTEGRITY_POLICY;
  };
  readonly payload: FitCoreBackupJsonObject;
}

export type FitCoreBackupCreationStatus = "created" | "created_with_warnings" | "blocked";
export type FitCoreBackupInspectionStatus = "valid" | "invalid" | "unsupported_version";
export type FitCoreBackupSerializationStatus = "serialized" | "blocked" | "unsupported_version";
export type FitCoreBackupIssueSeverity = "warning" | "error";

export type FitCoreBackupIssueCode =
  | "invalid_options"
  | "invalid_exported_at"
  | "invalid_root"
  | "unsupported_json_value"
  | "non_finite_number"
  | "negative_zero_not_serializable"
  | "cyclic_reference"
  | "sparse_array"
  | "symbol_key"
  | "unsafe_object_key"
  | "maximum_depth_exceeded"
  | "maximum_node_count_exceeded"
  | "maximum_array_length_exceeded"
  | "maximum_object_key_count_exceeded"
  | "maximum_string_length_exceeded"
  | "maximum_serialized_characters_exceeded"
  | "integrity_invalid"
  | "integrity_warnings"
  | "invalid_envelope_shape"
  | "unknown_envelope_field"
  | "invalid_policy_identifier"
  | "invalid_format_identifier"
  | "unsupported_format_version"
  | "invalid_payload_kind"
  | "unsupported_payload_schema_version"
  | "canonical_serialization_failed";

export interface FitCoreBackupIssue {
  readonly code: FitCoreBackupIssueCode;
  readonly severity: FitCoreBackupIssueSeverity;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
}

export interface FitCoreBackupStructuralSummary {
  readonly nodeCount: number;
  readonly maximumDepthObserved: number;
  readonly objectCount: number;
  readonly arrayCount: number;
  readonly stringCount: number;
  readonly numberCount: number;
  readonly booleanCount: number;
  readonly nullCount: number;
  readonly topLevelFieldCount: number;
}

export interface FitCoreBackupIntegrityIssue {
  readonly issueKey: string;
  readonly code: DataIntegrityIssueCode;
  readonly severity: DataIntegritySeverity;
  readonly path: string;
  readonly collection: string | null;
  readonly field: string | null;
  readonly valueType: string;
  readonly relatedPaths: readonly string[];
  readonly messageKey: string;
}

export interface FitCoreBackupIntegrityReport {
  readonly policy: typeof FITCORE_DATA_INTEGRITY_POLICY;
  readonly status: DataIntegrityStatus;
  readonly rootRecognized: boolean;
  readonly issueCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly collectionCount: number;
  readonly recordCount: number;
  readonly checkedCollections: readonly string[];
  readonly issueCounts: Readonly<Record<DataIntegrityIssueCode, number>>;
  readonly issues: readonly FitCoreBackupIntegrityIssue[];
}

export interface FitCoreBackupSummary extends FitCoreBackupStructuralSummary {
  readonly issueCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly integrityIssueCount: number;
  readonly serializedCharacterCount: number;
}

export interface FitCoreBackupCreationResult {
  readonly status: FitCoreBackupCreationStatus;
  readonly safeToExport: boolean;
  readonly requiresReview: boolean;
  readonly envelope: FitCoreBackupEnvelopeV1 | null;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreBackupIssue[];
  readonly integrity: FitCoreBackupIntegrityReport | null;
  readonly summary: FitCoreBackupSummary;
}

export interface FitCoreBackupInspectionReport {
  readonly policy: typeof FITCORE_BACKUP_ENVELOPE_POLICY;
  readonly status: FitCoreBackupInspectionStatus;
  readonly validVersionOneEnvelope: boolean;
  readonly requiresReview: boolean;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreBackupIssue[];
  readonly integrity: FitCoreBackupIntegrityReport | null;
  readonly summary: FitCoreBackupSummary;
}

export interface FitCoreBackupSerializationResult {
  readonly status: FitCoreBackupSerializationStatus;
  readonly safeToExport: boolean;
  readonly requiresReview: boolean;
  readonly json: string | null;
  readonly characterCount: number;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly issues: readonly FitCoreBackupIssue[];
  readonly summary: FitCoreBackupSummary;
}

type MutableStructuralSummary = {
  -readonly [Key in keyof FitCoreBackupStructuralSummary]: FitCoreBackupStructuralSummary[Key];
};

interface CopySuccess {
  ok: true;
  value: FitCoreBackupJsonValue;
  summary: MutableStructuralSummary;
}

interface CopyFailure {
  ok: false;
  issue: FitCoreBackupIssue;
  summary: MutableStructuralSummary;
}

type CopyResult = CopySuccess | CopyFailure;

interface EnvelopeValidation {
  status: FitCoreBackupInspectionStatus;
  envelope: FitCoreBackupEnvelopeV1 | null;
  requiresReview: boolean;
  issues: FitCoreBackupIssue[];
  integrity: FitCoreBackupIntegrityReport | null;
  summary: FitCoreBackupSummary;
}

const ENVELOPE_FIELDS = [
  "format",
  "formatVersion",
  "payloadKind",
  "payloadSchemaVersion",
  "exportedAt",
  "policies",
  "payload",
] as const;
const POLICY_FIELDS = ["backupEnvelope", "dataIntegrity"] as const;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const BASE_LIMITATIONS = [
  "backup.limitation.export_not_written",
  "backup.limitation.import_not_executed",
] as const;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function issue(
  code: FitCoreBackupIssueCode,
  severity: FitCoreBackupIssueSeverity = "error",
  limitationKeys: readonly string[] = [],
): FitCoreBackupIssue {
  return {
    code,
    severity,
    reasonKey: `backup.reason.${code}`,
    limitationKeys: [...limitationKeys].sort(compareText),
  };
}

function limitationKeys(
  issues: readonly FitCoreBackupIssue[],
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

function zeroStructure(): MutableStructuralSummary {
  return {
    nodeCount: 0,
    maximumDepthObserved: 0,
    objectCount: 0,
    arrayCount: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
    topLevelFieldCount: 0,
  };
}

function summarize(
  structural: FitCoreBackupStructuralSummary,
  issues: readonly FitCoreBackupIssue[],
  integrity: FitCoreBackupIntegrityReport | null,
  serializedCharacterCount: number,
): FitCoreBackupSummary {
  return {
    issueCount: issues.length,
    warningCount: issues.filter(({ severity }) => severity === "warning").length,
    errorCount: issues.filter(({ severity }) => severity === "error").length,
    integrityIssueCount: integrity?.issueCount ?? 0,
    ...structural,
    serializedCharacterCount,
  };
}

function structureFromSummary(summary: FitCoreBackupSummary): FitCoreBackupStructuralSummary {
  return {
    nodeCount: summary.nodeCount,
    maximumDepthObserved: summary.maximumDepthObserved,
    objectCount: summary.objectCount,
    arrayCount: summary.arrayCount,
    stringCount: summary.stringCount,
    numberCount: summary.numberCount,
    booleanCount: summary.booleanCount,
    nullCount: summary.nullCount,
    topLevelFieldCount: summary.topLevelFieldCount,
  };
}

function cloneIntegrityReport(
  report: ReturnType<typeof validateFitCoreDataIntegrity>,
): FitCoreBackupIntegrityReport {
  return {
    policy: report.policy,
    status: report.status,
    rootRecognized: report.rootRecognized,
    issueCount: report.issueCount,
    errorCount: report.errorCount,
    warningCount: report.warningCount,
    collectionCount: report.collectionCount,
    recordCount: report.recordCount,
    checkedCollections: [...report.checkedCollections],
    issueCounts: { ...report.issueCounts },
    issues: report.issues.map((item) => ({
      issueKey: item.issueKey,
      code: item.code,
      severity: item.severity,
      path: item.path,
      collection: item.collection,
      field: item.field,
      valueType: item.valueType,
      relatedPaths: [...item.relatedPaths],
      messageKey: item.messageKey,
    })),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownValue(
  record: Record<string, unknown>,
  key: string,
): { ok: true; value: unknown } | { ok: false } {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (
    descriptor === undefined ||
    descriptor.enumerable !== true ||
    !("value" in descriptor) ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined
  )
    return { ok: false };
  return { ok: true, value: descriptor.value };
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  const time = new Date(value);
  return Number.isFinite(time.getTime()) && time.toISOString() === value;
}

function copyJsonValue(value: unknown): CopyResult {
  const summary = zeroStructure();
  const active = new Set<object>();

  const fail = (
    code: FitCoreBackupIssueCode,
    limitationKeys: readonly string[] = ["backup.limitation.unsupported_value_not_transformed"],
  ): CopyFailure => ({ ok: false, issue: issue(code, "error", limitationKeys), summary });

  const visit = (
    current: unknown,
    depth: number,
    topLevel: boolean,
  ): FitCoreBackupJsonValue | CopyFailure => {
    summary.nodeCount += 1;
    if (summary.nodeCount > FITCORE_BACKUP_EXPORT_LIMITS.maxNodes)
      return fail("maximum_node_count_exceeded", ["backup.limitation.content_not_truncated"]);
    if (depth > summary.maximumDepthObserved) summary.maximumDepthObserved = depth;
    if (depth > FITCORE_BACKUP_EXPORT_LIMITS.maxDepth)
      return fail("maximum_depth_exceeded", ["backup.limitation.content_not_truncated"]);

    if (current === null) {
      summary.nullCount += 1;
      return null;
    }
    if (typeof current === "string") {
      summary.stringCount += 1;
      if (current.length > FITCORE_BACKUP_EXPORT_LIMITS.maxStringLength)
        return fail("maximum_string_length_exceeded", ["backup.limitation.content_not_truncated"]);
      return current;
    }
    if (typeof current === "boolean") {
      summary.booleanCount += 1;
      return current;
    }
    if (typeof current === "number") {
      summary.numberCount += 1;
      if (!Number.isFinite(current)) return fail("non_finite_number");
      if (Object.is(current, -0))
        return fail("negative_zero_not_serializable", [
          "backup.limitation.negative_zero_not_preserved",
        ]);
      return current;
    }
    if (
      typeof current === "undefined" ||
      typeof current === "bigint" ||
      typeof current === "symbol" ||
      typeof current === "function"
    )
      return fail("unsupported_json_value");

    if (active.has(current))
      return fail("cyclic_reference", ["backup.limitation.cycle_not_removed"]);
    active.add(current);
    try {
      if (Array.isArray(current)) {
        if (Object.getPrototypeOf(current) !== Array.prototype)
          return fail("unsupported_json_value");
        summary.arrayCount += 1;
        if (current.length > FITCORE_BACKUP_EXPORT_LIMITS.maxArrayLength)
          return fail("maximum_array_length_exceeded", ["backup.limitation.content_not_truncated"]);
        if (Object.getOwnPropertySymbols(current).length > 0) return fail("symbol_key");
        for (let index = 0; index < current.length; index += 1) {
          if (!Object.hasOwn(current, index)) return fail("sparse_array");
        }
        const names = Object.getOwnPropertyNames(current);
        if (names.length !== current.length + 1) return fail("unsupported_json_value");
        const result: FitCoreBackupJsonValue[] = [];
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (descriptor === undefined || !("value" in descriptor))
            return fail("unsupported_json_value");
          const copied = visit(descriptor.value, depth + 1, false);
          if (isCopyFailure(copied)) return copied;
          result.push(copied);
        }
        return result;
      }

      if (!isPlainObject(current)) return fail("unsupported_json_value");
      summary.objectCount += 1;
      if (Object.getOwnPropertySymbols(current).length > 0) return fail("symbol_key");
      const enumerableKeys = Object.keys(current).sort(compareText);
      const allNames = Object.getOwnPropertyNames(current);
      if (allNames.length !== enumerableKeys.length) return fail("unsupported_json_value");
      if (topLevel) summary.topLevelFieldCount = enumerableKeys.length;
      if (enumerableKeys.length > FITCORE_BACKUP_EXPORT_LIMITS.maxObjectKeys)
        return fail("maximum_object_key_count_exceeded", [
          "backup.limitation.content_not_truncated",
        ]);
      if (enumerableKeys.some((key) => UNSAFE_KEYS.has(key)))
        return fail("unsafe_object_key", ["backup.limitation.unsafe_key_not_removed"]);

      const result: FitCoreBackupJsonObject = Object.create(null) as FitCoreBackupJsonObject;
      for (const key of enumerableKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor === undefined || !("value" in descriptor))
          return fail("unsupported_json_value");
        const copied = visit(descriptor.value, depth + 1, false);
        if (isCopyFailure(copied)) return copied;
        Object.defineProperty(result, key, {
          value: copied,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      return result;
    } finally {
      active.delete(current);
    }
  };

  try {
    const copied = visit(value, 0, true);
    return isCopyFailure(copied) ? copied : { ok: true, value: copied, summary };
  } catch {
    return fail("unsupported_json_value");
  }
}

function isCopyFailure(value: FitCoreBackupJsonValue | CopyFailure): value is CopyFailure {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    "ok" in value &&
    value.ok === false
  );
}

function canonicalJson(value: FitCoreBackupJsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function canonicalEnvelopeJson(envelope: FitCoreBackupEnvelopeV1): string {
  return (
    `{` +
    `"format":${JSON.stringify(envelope.format)},` +
    `"formatVersion":${envelope.formatVersion},` +
    `"payloadKind":${JSON.stringify(envelope.payloadKind)},` +
    `"payloadSchemaVersion":${envelope.payloadSchemaVersion},` +
    `"exportedAt":${JSON.stringify(envelope.exportedAt)},` +
    `"policies":{"backupEnvelope":${JSON.stringify(envelope.policies.backupEnvelope)},"dataIntegrity":${JSON.stringify(envelope.policies.dataIntegrity)}},` +
    `"payload":${canonicalJson(envelope.payload)}` +
    `}`
  );
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function makeEnvelope(
  payload: FitCoreBackupJsonObject,
  exportedAt: string,
): FitCoreBackupEnvelopeV1 {
  return {
    format: FITCORE_BACKUP_FORMAT,
    formatVersion: FITCORE_BACKUP_FORMAT_VERSION,
    payloadKind: FITCORE_BACKUP_PAYLOAD_KIND,
    payloadSchemaVersion: FITCORE_BACKUP_PAYLOAD_SCHEMA_VERSION,
    exportedAt,
    policies: {
      backupEnvelope: FITCORE_BACKUP_ENVELOPE_POLICY,
      dataIntegrity: FITCORE_DATA_INTEGRITY_POLICY,
    },
    payload,
  };
}

function blockedCreation(
  issues: FitCoreBackupIssue[],
  structural: FitCoreBackupStructuralSummary = zeroStructure(),
  integrity: FitCoreBackupIntegrityReport | null = null,
  serializedCharacterCount = 0,
): FitCoreBackupCreationResult {
  return deepFreeze({
    status: "blocked",
    safeToExport: false,
    requiresReview: false,
    envelope: null,
    reasonKey: `backup.reason.${issues[0]?.code ?? "creation_blocked"}`,
    limitationKeys: limitationKeys(issues),
    issues,
    integrity,
    summary: summarize(structural, issues, integrity, serializedCharacterCount),
  });
}

function validOptions(value: unknown): value is FitCoreBackupCreationOptions {
  if (!isPlainObject(value)) return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  const keys = Object.keys(value).sort(compareText);
  if (keys.length !== 1 || keys[0] !== "exportedAt") return false;
  const exportedAt = ownValue(value, "exportedAt");
  return exportedAt.ok && canonicalTimestamp(exportedAt.value);
}

function createFitCoreBackupEnvelopeInternal(
  value: unknown,
  options: FitCoreBackupCreationOptions,
): FitCoreBackupCreationResult {
  if (
    !isPlainObject(options) ||
    Object.getOwnPropertyNames(options).length !== 1 ||
    !Object.hasOwn(options, "exportedAt")
  )
    return blockedCreation([issue("invalid_options")]);
  if (!validOptions(options)) return blockedCreation([issue("invalid_exported_at")]);
  if (!isPlainObject(value)) return blockedCreation([issue("invalid_root")]);

  const copied = copyJsonValue(value);
  if (!copied.ok) return blockedCreation([copied.issue], copied.summary);
  if (!isPlainObject(copied.value)) return blockedCreation([issue("invalid_root")], copied.summary);

  const upstreamIntegrity = validateFitCoreDataIntegrity(value);
  const integrity = cloneIntegrityReport(upstreamIntegrity);
  if (upstreamIntegrity.status === "invalid")
    return blockedCreation([issue("integrity_invalid")], copied.summary, integrity);

  const issues =
    upstreamIntegrity.status === "warnings"
      ? [
          issue("integrity_warnings", "warning", [
            "backup.limitation.review_required",
            "backup.limitation.warning_fields_preserved",
          ]),
        ]
      : [];
  const envelope = makeEnvelope(copied.value as FitCoreBackupJsonObject, options.exportedAt);
  let serialized: string;
  try {
    serialized = canonicalEnvelopeJson(envelope);
  } catch {
    return blockedCreation([issue("canonical_serialization_failed")], copied.summary, integrity);
  }
  if (serialized.length > FITCORE_BACKUP_EXPORT_LIMITS.maxSerializedCharacters)
    return blockedCreation(
      [
        issue("maximum_serialized_characters_exceeded", "error", [
          "backup.limitation.content_not_truncated",
        ]),
      ],
      copied.summary,
      integrity,
      serialized.length,
    );

  const status: FitCoreBackupCreationStatus =
    upstreamIntegrity.status === "warnings" ? "created_with_warnings" : "created";
  return deepFreeze({
    status,
    safeToExport: true,
    requiresReview: status === "created_with_warnings",
    envelope,
    reasonKey:
      status === "created_with_warnings"
        ? "backup.reason.created_with_warnings"
        : "backup.reason.created",
    limitationKeys: limitationKeys(issues),
    issues,
    integrity,
    summary: summarize(copied.summary, issues, integrity, serialized.length),
  });
}

export function createFitCoreBackupEnvelope(
  value: unknown,
  options: FitCoreBackupCreationOptions,
): FitCoreBackupCreationResult {
  try {
    return createFitCoreBackupEnvelopeInternal(value, options);
  } catch {
    return blockedCreation([issue("unsupported_json_value")]);
  }
}

function envelopeFailure(
  status: FitCoreBackupInspectionStatus,
  issues: FitCoreBackupIssue[],
  structural: FitCoreBackupStructuralSummary = zeroStructure(),
  integrity: FitCoreBackupIntegrityReport | null = null,
  serializedCharacterCount = 0,
): EnvelopeValidation {
  return {
    status,
    envelope: null,
    requiresReview: false,
    issues,
    integrity,
    summary: summarize(structural, issues, integrity, serializedCharacterCount),
  };
}

function validateEnvelopeCandidate(value: unknown): EnvelopeValidation {
  try {
    if (!isPlainObject(value)) return envelopeFailure("invalid", [issue("invalid_root")]);
    if (Object.getOwnPropertySymbols(value).length > 0)
      return envelopeFailure("invalid", [issue("symbol_key")]);
    const names = Object.getOwnPropertyNames(value);
    const keys = Object.keys(value).sort(compareText);
    if (keys.some((key) => UNSAFE_KEYS.has(key)))
      return envelopeFailure("invalid", [
        issue("unsafe_object_key", "error", ["backup.limitation.unsafe_key_not_removed"]),
      ]);
    if (names.length !== keys.length)
      return envelopeFailure("invalid", [issue("invalid_envelope_shape")]);
    const unknown = keys.filter((key) => !(ENVELOPE_FIELDS as readonly string[]).includes(key));
    if (unknown.length > 0) return envelopeFailure("invalid", [issue("unknown_envelope_field")]);

    const format = ownValue(value, "format");
    const formatVersion = ownValue(value, "formatVersion");
    const payloadSchemaVersion = ownValue(value, "payloadSchemaVersion");
    if (
      format.ok &&
      format.value === FITCORE_BACKUP_FORMAT &&
      ((formatVersion.ok && formatVersion.value !== FITCORE_BACKUP_FORMAT_VERSION) ||
        (payloadSchemaVersion.ok &&
          payloadSchemaVersion.value !== FITCORE_BACKUP_PAYLOAD_SCHEMA_VERSION))
    ) {
      const code =
        formatVersion.ok && formatVersion.value !== FITCORE_BACKUP_FORMAT_VERSION
          ? "unsupported_format_version"
          : "unsupported_payload_schema_version";
      return envelopeFailure("unsupported_version", [
        issue(code, "error", ["backup.limitation.migration_not_attempted"]),
      ]);
    }
    if (
      keys.length !== ENVELOPE_FIELDS.length ||
      ENVELOPE_FIELDS.some((key) => !Object.hasOwn(value, key))
    )
      return envelopeFailure("invalid", [issue("invalid_envelope_shape")]);
    if (!format.ok || format.value !== FITCORE_BACKUP_FORMAT)
      return envelopeFailure("invalid", [issue("invalid_format_identifier")]);

    const payloadKind = ownValue(value, "payloadKind");
    if (!payloadKind.ok || payloadKind.value !== FITCORE_BACKUP_PAYLOAD_KIND)
      return envelopeFailure("invalid", [issue("invalid_payload_kind")]);
    const exportedAt = ownValue(value, "exportedAt");
    if (!exportedAt.ok || !canonicalTimestamp(exportedAt.value))
      return envelopeFailure("invalid", [issue("invalid_exported_at")]);
    const policies = ownValue(value, "policies");
    if (!policies.ok || !isPlainObject(policies.value))
      return envelopeFailure("invalid", [issue("invalid_policy_identifier")]);
    const policyObject = policies.value;
    if (Object.getOwnPropertySymbols(policyObject).length > 0)
      return envelopeFailure("invalid", [issue("symbol_key")]);
    const policyNames = Object.getOwnPropertyNames(policyObject);
    const policyKeys = Object.keys(policyObject).sort(compareText);
    if (policyKeys.some((key) => UNSAFE_KEYS.has(key)))
      return envelopeFailure("invalid", [
        issue("unsafe_object_key", "error", ["backup.limitation.unsafe_key_not_removed"]),
      ]);
    if (
      policyNames.length !== policyKeys.length ||
      policyKeys.length !== POLICY_FIELDS.length ||
      POLICY_FIELDS.some((key) => !Object.hasOwn(policyObject, key))
    )
      return envelopeFailure("invalid", [
        issue(
          policyKeys.some((key) => !(POLICY_FIELDS as readonly string[]).includes(key))
            ? "unknown_envelope_field"
            : "invalid_policy_identifier",
        ),
      ]);
    const backupPolicy = ownValue(policyObject, "backupEnvelope");
    const integrityPolicy = ownValue(policyObject, "dataIntegrity");
    if (
      !backupPolicy.ok ||
      backupPolicy.value !== FITCORE_BACKUP_ENVELOPE_POLICY ||
      !integrityPolicy.ok ||
      integrityPolicy.value !== FITCORE_DATA_INTEGRITY_POLICY
    )
      return envelopeFailure("invalid", [issue("invalid_policy_identifier")]);

    const payload = ownValue(value, "payload");
    if (!payload.ok || !isPlainObject(payload.value))
      return envelopeFailure("invalid", [issue("invalid_root")]);
    const copied = copyJsonValue(payload.value);
    if (!copied.ok) return envelopeFailure("invalid", [copied.issue], copied.summary);
    const upstreamIntegrity = validateFitCoreDataIntegrity(payload.value);
    const integrity = cloneIntegrityReport(upstreamIntegrity);
    if (upstreamIntegrity.status === "invalid")
      return envelopeFailure("invalid", [issue("integrity_invalid")], copied.summary, integrity);

    const issues =
      upstreamIntegrity.status === "warnings"
        ? [issue("integrity_warnings", "warning", ["backup.limitation.review_required"])]
        : [];
    const envelope = makeEnvelope(
      copied.value as FitCoreBackupJsonObject,
      exportedAt.value as string,
    );
    let serialized: string;
    try {
      serialized = canonicalEnvelopeJson(envelope);
    } catch {
      return envelopeFailure(
        "invalid",
        [issue("canonical_serialization_failed")],
        copied.summary,
        integrity,
      );
    }
    if (serialized.length > FITCORE_BACKUP_EXPORT_LIMITS.maxSerializedCharacters)
      return envelopeFailure(
        "invalid",
        [issue("maximum_serialized_characters_exceeded")],
        copied.summary,
        integrity,
        serialized.length,
      );
    return {
      status: "valid",
      envelope,
      requiresReview: upstreamIntegrity.status === "warnings",
      issues,
      integrity,
      summary: summarize(copied.summary, issues, integrity, serialized.length),
    };
  } catch {
    return envelopeFailure("invalid", [issue("unsupported_json_value")]);
  }
}

export function inspectFitCoreBackupEnvelope(value: unknown): FitCoreBackupInspectionReport {
  const validation = validateEnvelopeCandidate(value);
  return deepFreeze({
    policy: FITCORE_BACKUP_ENVELOPE_POLICY,
    status: validation.status,
    validVersionOneEnvelope: validation.status === "valid",
    requiresReview: validation.status === "valid" && validation.requiresReview,
    reasonKey:
      validation.status === "valid"
        ? validation.requiresReview
          ? "backup.reason.valid_with_warnings"
          : "backup.reason.valid"
        : validation.status === "unsupported_version"
          ? "backup.reason.unsupported_version"
          : "backup.reason.invalid_envelope",
    limitationKeys: limitationKeys(
      validation.issues,
      validation.status === "unsupported_version"
        ? ["backup.limitation.migration_not_attempted"]
        : [],
    ),
    issues: validation.issues,
    integrity: validation.integrity,
    summary: validation.summary,
  });
}

export function serializeFitCoreBackupEnvelope(value: unknown): FitCoreBackupSerializationResult {
  const validation = validateEnvelopeCandidate(value);
  if (validation.status !== "valid" || validation.envelope === null) {
    const status: FitCoreBackupSerializationStatus =
      validation.status === "unsupported_version" ? "unsupported_version" : "blocked";
    return deepFreeze({
      status,
      safeToExport: false,
      requiresReview: false,
      json: null,
      characterCount: 0,
      reasonKey:
        status === "unsupported_version"
          ? "backup.reason.unsupported_version"
          : "backup.reason.serialization_blocked",
      limitationKeys: limitationKeys(
        validation.issues,
        status === "unsupported_version" ? ["backup.limitation.migration_not_attempted"] : [],
      ),
      issues: validation.issues,
      summary: validation.summary,
    });
  }
  let json: string;
  try {
    json = canonicalEnvelopeJson(validation.envelope);
  } catch {
    const issues = [issue("canonical_serialization_failed")];
    return deepFreeze({
      status: "blocked",
      safeToExport: false,
      requiresReview: false,
      json: null,
      characterCount: 0,
      reasonKey: "backup.reason.serialization_blocked",
      limitationKeys: limitationKeys(issues),
      issues,
      summary: summarize(structureFromSummary(validation.summary), issues, validation.integrity, 0),
    });
  }
  if (json.length > FITCORE_BACKUP_EXPORT_LIMITS.maxSerializedCharacters) {
    const issues = [issue("maximum_serialized_characters_exceeded")];
    return deepFreeze({
      status: "blocked",
      safeToExport: false,
      requiresReview: false,
      json: null,
      characterCount: 0,
      reasonKey: "backup.reason.serialization_blocked",
      limitationKeys: limitationKeys(issues),
      issues,
      summary: summarize(
        structureFromSummary(validation.summary),
        issues,
        validation.integrity,
        json.length,
      ),
    });
  }
  return deepFreeze({
    status: "serialized",
    safeToExport: true,
    requiresReview: validation.requiresReview,
    json,
    characterCount: json.length,
    reasonKey: "backup.reason.serialized",
    limitationKeys: limitationKeys(validation.issues),
    issues: validation.issues,
    summary: validation.summary,
  });
}
