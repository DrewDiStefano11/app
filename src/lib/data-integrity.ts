export const FITCORE_DATA_INTEGRITY_POLICY = "fitcore_data_integrity_v1" as const;

export type DataIntegrityStatus = "valid" | "warnings" | "invalid";
export type DataIntegritySeverity = "warning" | "error";

export type DataIntegrityIssueCode =
  | "invalid_root"
  | "missing_required_top_level_field"
  | "invalid_top_level_type"
  | "unknown_top_level_field"
  | "malformed_record"
  | "partial_record"
  | "missing_required_field"
  | "invalid_field_type"
  | "empty_required_string"
  | "empty_id"
  | "duplicate_id"
  | "duplicate_id_cross_collection"
  | "invalid_timestamp"
  | "invalid_time_order"
  | "non_finite_number"
  | "prohibited_negative_value"
  | "out_of_range_value"
  | "invalid_enum_value"
  | "unknown_record_field"
  | "orphaned_reference";

export interface DataIntegrityIssue {
  issueKey: string;
  code: DataIntegrityIssueCode;
  severity: DataIntegritySeverity;
  path: string;
  collection: string | null;
  recordId: string | null;
  field: string | null;
  valueType: string;
  relatedPaths: string[];
  messageKey: string;
}

export interface DataIntegrityReport {
  policy: typeof FITCORE_DATA_INTEGRITY_POLICY;
  status: DataIntegrityStatus;
  rootRecognized: boolean;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  collectionCount: number;
  recordCount: number;
  checkedCollections: string[];
  issueCounts: Record<DataIntegrityIssueCode, number>;
  issues: DataIntegrityIssue[];
}

type PlainRecord = Record<string, unknown>;
type IssueDraft = Omit<DataIntegrityIssue, "issueKey" | "messageKey">;

const TOP_LEVEL_FIELDS = [
  "version",
  "onboardingComplete",
  "profile",
  "personalization",
  "nutritionTargets",
  "workouts",
  "activeWorkout",
  "workoutTemplates",
  "customExercises",
  "cardioEntries",
  "mealEntries",
  "bodyweightEntries",
  "sleepEntries",
  "recoveryCheckIns",
  "recoverySignals",
  "muscleFatigue",
  "prs",
  "goals",
  "progressPhotos",
  "aiMessages",
  "reminders",
  "demoMode",
  "jarvisSettings",
  "jarvisAudit",
  "jarvisLearning",
  "userGoalsProfile",
  "supplementLogs",
  "dismissedSuggestions",
] as const;

const ARRAY_COLLECTIONS = [
  "workouts",
  "workoutTemplates",
  "customExercises",
  "cardioEntries",
  "mealEntries",
  "bodyweightEntries",
  "sleepEntries",
  "recoveryCheckIns",
  "recoverySignals",
  "prs",
  "goals",
  "progressPhotos",
  "aiMessages",
  "jarvisAudit",
  "supplementLogs",
] as const;

const REQUIRED_ARRAY_FIELDS = [...ARRAY_COLLECTIONS, "dismissedSuggestions"] as const;

const OBJECT_FIELDS = [
  "profile",
  "personalization",
  "nutritionTargets",
  "muscleFatigue",
  "reminders",
  "jarvisSettings",
  "jarvisLearning",
  "userGoalsProfile",
] as const;

const CHECKED_COLLECTIONS = [...REQUIRED_ARRAY_FIELDS, "activeWorkout"].sort();
const TOP_LEVEL_SET = new Set<string>(TOP_LEVEL_FIELDS);
const ARRAY_COLLECTION_SET = new Set<string>(REQUIRED_ARRAY_FIELDS);
const OBJECT_FIELD_SET = new Set<string>(OBJECT_FIELDS);

const ISSUE_CODE_ORDER: DataIntegrityIssueCode[] = [
  "invalid_root",
  "missing_required_top_level_field",
  "invalid_top_level_type",
  "unknown_top_level_field",
  "malformed_record",
  "partial_record",
  "missing_required_field",
  "invalid_field_type",
  "empty_required_string",
  "empty_id",
  "duplicate_id",
  "duplicate_id_cross_collection",
  "invalid_timestamp",
  "invalid_time_order",
  "non_finite_number",
  "prohibited_negative_value",
  "out_of_range_value",
  "invalid_enum_value",
  "unknown_record_field",
  "orphaned_reference",
];
const ISSUE_RANK = new Map(ISSUE_CODE_ORDER.map((code, index) => [code, index]));

const SET_MODIFIERS = [
  "normal",
  "warmup",
  "drop",
  "failure",
  "partials",
  "unilateral",
  "paused",
  "tempo",
] as const;
const DATA_SOURCES = [
  "manual",
  "jarvis",
  "jarvis-confirmed",
  "barcode",
  "camera",
  "whoop",
  "apple-health",
  "imported",
  "edited",
] as const;
const CONFIDENCES = ["high", "medium", "low"] as const;
const PROVENANCE_SOURCES = [
  "manual",
  "jarvis",
  "ai-estimated",
  "imported",
  "wearable",
  "apple-health",
  "health-connect",
  "barcode",
  "system-derived",
] as const;
const PROVENANCE_CONFIDENCES = [...CONFIDENCES, "unknown"] as const;
const CONFIRMATIONS = ["confirmed", "unconfirmed", "not-required"] as const;

function isPlainRecord(value: unknown): value is PlainRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function valueType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (value instanceof Map) return "map";
  if (value instanceof Set) return "set";
  return typeof value;
}

function safeId(record: PlainRecord | null): string | null {
  return record && typeof record.id === "string" && record.id.trim() ? record.id : null;
}

class ValidationContext {
  readonly issues: IssueDraft[] = [];
  recordCount = 0;
  readonly identityPaths = new Map<string, Map<string, string[]>>();

  add(
    code: DataIntegrityIssueCode,
    severity: DataIntegritySeverity,
    path: string,
    options: {
      collection?: string | null;
      recordId?: string | null;
      field?: string | null;
      value?: unknown;
      relatedPaths?: string[];
    } = {},
  ): void {
    this.issues.push({
      code,
      severity,
      path,
      collection: options.collection ?? null,
      recordId: options.recordId ?? null,
      field: options.field ?? null,
      valueType: valueType(options.value),
      relatedPaths: [...new Set(options.relatedPaths ?? [])].sort(),
    });
  }

  registerId(scope: string, id: unknown, idPath: string): void {
    if (typeof id !== "string" || !id.trim()) return;
    const byId = this.identityPaths.get(scope) ?? new Map<string, string[]>();
    const paths = byId.get(id) ?? [];
    paths.push(idPath);
    byId.set(id, paths);
    this.identityPaths.set(scope, byId);
  }
}

interface RecordLocation {
  collection: string;
  path: string;
  recordId: string | null;
}

const fieldPath = (location: RecordLocation, field: string): string => `${location.path}.${field}`;

function unknownFields(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  for (const field of Object.keys(record)
    .filter((key) => !allowedSet.has(key))
    .sort()) {
    context.add("unknown_record_field", "warning", fieldPath(location, field), {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value: record[field],
    });
  }
}

function missingFields(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
  required: readonly string[],
): void {
  const missing = required.filter((field) => !Object.hasOwn(record, field)).sort();
  if (!missing.length) return;
  context.add("partial_record", "error", location.path, {
    collection: location.collection,
    recordId: location.recordId,
    value: record,
  });
  for (const field of missing) {
    context.add("missing_required_field", "error", fieldPath(location, field), {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value: null,
    });
  }
}

function validateString(
  context: ValidationContext,
  value: unknown,
  location: RecordLocation,
  field: string,
  options: { requiredNonEmpty?: boolean; id?: boolean } = {},
): boolean {
  if (typeof value !== "string") {
    context.add("invalid_field_type", "error", fieldPath(location, field), {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  if ((options.requiredNonEmpty || options.id) && !value.trim()) {
    context.add(
      options.id ? "empty_id" : "empty_required_string",
      "error",
      fieldPath(location, field),
      {
        collection: location.collection,
        recordId: location.recordId,
        field,
        value,
      },
    );
    return false;
  }
  return true;
}

function validateBoolean(
  context: ValidationContext,
  value: unknown,
  location: RecordLocation,
  field: string,
): boolean {
  if (typeof value === "boolean") return true;
  context.add("invalid_field_type", "error", fieldPath(location, field), {
    collection: location.collection,
    recordId: location.recordId,
    field,
    value,
  });
  return false;
}

function validateNumber(
  context: ValidationContext,
  value: unknown,
  location: RecordLocation,
  field: string,
  options: {
    nonNegative?: boolean;
    positive?: boolean;
    integer?: boolean;
    min?: number;
    max?: number;
  } = {},
): boolean {
  const path = fieldPath(location, field);
  if (typeof value !== "number") {
    context.add("invalid_field_type", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  if (!Number.isFinite(value)) {
    context.add("non_finite_number", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  if ((options.positive || options.nonNegative) && value < 0) {
    context.add("prohibited_negative_value", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  if (options.positive && value === 0) {
    context.add("out_of_range_value", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  if (
    (options.integer && !Number.isInteger(value)) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    context.add("out_of_range_value", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  return true;
}

function validateTimestamp(
  context: ValidationContext,
  value: unknown,
  location: RecordLocation,
  field: string,
): boolean {
  const path = fieldPath(location, field);
  if (typeof value !== "number") {
    context.add("invalid_timestamp", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  if (!Number.isFinite(value)) {
    context.add("non_finite_number", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    context.add("invalid_timestamp", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  if (Math.abs(value) > 8.64e15 || Number.isNaN(new Date(value).getTime())) {
    context.add("invalid_timestamp", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  return true;
}

function validateEnum(
  context: ValidationContext,
  value: unknown,
  location: RecordLocation,
  field: string,
  allowed: readonly (string | number)[],
): boolean {
  if (allowed.includes(value as never)) return true;
  context.add(
    typeof value === typeof allowed[0] ? "invalid_enum_value" : "invalid_field_type",
    "error",
    fieldPath(location, field),
    {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    },
  );
  return false;
}

function validateStringArray(
  context: ValidationContext,
  value: unknown,
  location: RecordLocation,
  field: string,
  options: { nonEmptyItems?: boolean; enumValues?: readonly string[] } = {},
): boolean {
  const path = fieldPath(location, field);
  if (!Array.isArray(value)) {
    context.add("invalid_field_type", "error", path, {
      collection: location.collection,
      recordId: location.recordId,
      field,
      value,
    });
    return false;
  }
  value.forEach((item, index) => {
    const itemLocation = { ...location, path: `${path}[${index}]` };
    if (typeof item !== "string") {
      context.add("invalid_field_type", "error", itemLocation.path, {
        collection: location.collection,
        recordId: location.recordId,
        field,
        value: item,
      });
    } else if (options.nonEmptyItems && !item.trim()) {
      context.add("empty_required_string", "error", itemLocation.path, {
        collection: location.collection,
        recordId: location.recordId,
        field,
        value: item,
      });
    } else if (options.enumValues && !options.enumValues.includes(item)) {
      context.add("invalid_enum_value", "error", itemLocation.path, {
        collection: location.collection,
        recordId: location.recordId,
        field,
        value: item,
      });
    }
  });
  return true;
}

function validateOptionalString(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
  field: string,
): void {
  if (Object.hasOwn(record, field)) validateString(context, record[field], location, field);
}

function validateOptionalBoolean(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
  field: string,
): void {
  if (Object.hasOwn(record, field)) validateBoolean(context, record[field], location, field);
}

function validateOptionalNumber(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
  field: string,
  options: Parameters<typeof validateNumber>[4] = {},
): void {
  if (Object.hasOwn(record, field))
    validateNumber(context, record[field], location, field, options);
}

function validateProvenance(
  context: ValidationContext,
  value: unknown,
  parent: RecordLocation,
): void {
  const location = { ...parent, path: fieldPath(parent, "provenance") };
  if (!isPlainRecord(value)) {
    context.add("invalid_field_type", "error", location.path, {
      collection: parent.collection,
      recordId: parent.recordId,
      field: "provenance",
      value,
    });
    return;
  }
  missingFields(context, value, location, ["source", "confidence", "confirmation"]);
  unknownFields(context, value, location, [
    "source",
    "confidence",
    "confirmation",
    "auditId",
    "originalText",
    "assumptions",
    "editedBy",
    "editedAt",
    "editAuditId",
  ]);
  if (Object.hasOwn(value, "source"))
    validateEnum(context, value.source, location, "source", PROVENANCE_SOURCES);
  if (Object.hasOwn(value, "confidence"))
    validateEnum(context, value.confidence, location, "confidence", PROVENANCE_CONFIDENCES);
  if (Object.hasOwn(value, "confirmation"))
    validateEnum(context, value.confirmation, location, "confirmation", CONFIRMATIONS);
  validateOptionalString(context, value, location, "auditId");
  validateOptionalString(context, value, location, "originalText");
  if (Object.hasOwn(value, "assumptions"))
    validateStringArray(context, value.assumptions, location, "assumptions");
  if (Object.hasOwn(value, "editedBy"))
    validateEnum(context, value.editedBy, location, "editedBy", ["user", "jarvis"]);
  if (Object.hasOwn(value, "editedAt"))
    validateTimestamp(context, value.editedAt, location, "editedAt");
  validateOptionalString(context, value, location, "editAuditId");
}

function validateOptionalProvenance(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  if (Object.hasOwn(record, "provenance")) validateProvenance(context, record.provenance, location);
}

function validateObjectRecord(
  context: ValidationContext,
  value: unknown,
  collection: string,
  path: string,
  validator: (context: ValidationContext, record: PlainRecord, location: RecordLocation) => void,
): void {
  context.recordCount += 1;
  if (!isPlainRecord(value)) {
    context.add("malformed_record", "error", path, { collection, value });
    return;
  }
  validator(context, value, { collection, path, recordId: safeId(value) });
}

function validateSet(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "completed"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [
    ...required,
    "reps",
    "weight",
    "durationMin",
    "distanceMi",
    "modifier",
    "provenance",
  ]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "completed"))
    validateBoolean(context, record.completed, location, "completed");
  for (const field of ["reps", "weight", "durationMin", "distanceMi"] as const) {
    validateOptionalNumber(context, record, location, field, { nonNegative: true });
  }
  if (Object.hasOwn(record, "modifier"))
    validateEnum(context, record.modifier, location, "modifier", SET_MODIFIERS);
  validateOptionalProvenance(context, record, location);
}

function validateWorkoutExercise(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "exerciseId", "sets", "completed"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "notes", "exerciseTags", "provenance"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "exerciseId"))
    validateString(context, record.exerciseId, location, "exerciseId", { requiredNonEmpty: true });
  if (Object.hasOwn(record, "completed"))
    validateBoolean(context, record.completed, location, "completed");
  validateOptionalString(context, record, location, "notes");
  if (Object.hasOwn(record, "exerciseTags")) {
    validateStringArray(context, record.exerciseTags, location, "exerciseTags", {
      enumValues: SET_MODIFIERS,
    });
  }
  validateOptionalProvenance(context, record, location);
  if (!Object.hasOwn(record, "sets")) return;
  if (!Array.isArray(record.sets)) {
    context.add("invalid_field_type", "error", fieldPath(location, "sets"), {
      collection: location.collection,
      recordId: location.recordId,
      field: "sets",
      value: record.sets,
    });
    return;
  }
  const scope = `${location.path}.sets`;
  record.sets.forEach((set, index) => {
    const path = `${scope}[${index}]`;
    validateObjectRecord(context, set, location.collection, path, validateSet);
    if (isPlainRecord(set)) context.registerId(scope, set.id, `${path}.id`);
  });
}

function validateWorkout(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "name", "startedAt", "exercises"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [
    ...required,
    "endedAt",
    "templateId",
    "notes",
    "provenance",
  ]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "name"))
    validateString(context, record.name, location, "name", { requiredNonEmpty: true });
  const validStart =
    Object.hasOwn(record, "startedAt") &&
    validateTimestamp(context, record.startedAt, location, "startedAt");
  const validEnd =
    !Object.hasOwn(record, "endedAt") ||
    validateTimestamp(context, record.endedAt, location, "endedAt");
  if (
    validStart &&
    validEnd &&
    Object.hasOwn(record, "endedAt") &&
    (record.endedAt as number) < (record.startedAt as number)
  ) {
    context.add("invalid_time_order", "error", fieldPath(location, "endedAt"), {
      collection: location.collection,
      recordId: location.recordId,
      field: "endedAt",
      value: record.endedAt,
      relatedPaths: [fieldPath(location, "startedAt")],
    });
  }
  validateOptionalString(context, record, location, "templateId");
  validateOptionalString(context, record, location, "notes");
  validateOptionalProvenance(context, record, location);
  if (!Object.hasOwn(record, "exercises")) return;
  if (!Array.isArray(record.exercises)) {
    context.add("invalid_field_type", "error", fieldPath(location, "exercises"), {
      collection: location.collection,
      recordId: location.recordId,
      field: "exercises",
      value: record.exercises,
    });
    return;
  }
  const scope = `${location.path}.exercises`;
  record.exercises.forEach((exercise, index) => {
    const path = `${scope}[${index}]`;
    validateObjectRecord(context, exercise, location.collection, path, validateWorkoutExercise);
    if (isPlainRecord(exercise)) context.registerId(scope, exercise.id, `${path}.id`);
  });
}

function validateWorkoutTemplate(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "name", "templateId"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, required);
  for (const field of required) {
    if (Object.hasOwn(record, field))
      validateString(context, record[field], location, field, {
        id: field === "id",
        requiredNonEmpty: field !== "id",
      });
  }
}

function validateCustomExercise(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "name", "primary", "equipment", "category", "isCustom", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "secondary", "tracking", "notes"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  for (const field of ["name", "equipment"] as const) {
    if (Object.hasOwn(record, field))
      validateString(context, record[field], location, field, { requiredNonEmpty: true });
  }
  if (Object.hasOwn(record, "primary"))
    validateStringArray(context, record.primary, location, "primary", { nonEmptyItems: true });
  if (Object.hasOwn(record, "secondary"))
    validateStringArray(context, record.secondary, location, "secondary", { nonEmptyItems: true });
  if (Object.hasOwn(record, "category"))
    validateEnum(context, record.category, location, "category", [
      "compound",
      "isolation",
      "cardio",
    ]);
  if (Object.hasOwn(record, "tracking"))
    validateEnum(context, record.tracking, location, "tracking", [
      "weight_reps",
      "time",
      "distance",
      "bodyweight",
    ]);
  if (Object.hasOwn(record, "isCustom")) {
    if (
      validateBoolean(context, record.isCustom, location, "isCustom") &&
      record.isCustom !== true
    ) {
      context.add("invalid_enum_value", "error", fieldPath(location, "isCustom"), {
        collection: location.collection,
        recordId: location.recordId,
        field: "isCustom",
        value: record.isCustom,
      });
    }
  }
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  validateOptionalString(context, record, location, "notes");
}

function validateCardio(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "type", "minutes", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [
    ...required,
    "distanceMi",
    "calories",
    "heartRate",
    "speed",
    "incline",
    "notes",
    "provenance",
  ]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "type"))
    validateString(context, record.type, location, "type", { requiredNonEmpty: true });
  if (Object.hasOwn(record, "minutes"))
    validateNumber(context, record.minutes, location, "minutes", { nonNegative: true });
  for (const field of ["distanceMi", "calories", "heartRate", "speed"] as const)
    validateOptionalNumber(context, record, location, field, { nonNegative: true });
  validateOptionalNumber(context, record, location, "incline");
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  validateOptionalString(context, record, location, "notes");
  validateOptionalProvenance(context, record, location);
}

function validateMealItem(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["name", "calories", "protein", "carbs", "fat"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [
    ...required,
    "qty",
    "source",
    "confidence",
    "provenance",
  ]);
  if (Object.hasOwn(record, "name"))
    validateString(context, record.name, location, "name", { requiredNonEmpty: true });
  validateOptionalString(context, record, location, "qty");
  for (const field of ["calories", "protein", "carbs", "fat"] as const) {
    if (Object.hasOwn(record, field))
      validateNumber(context, record[field], location, field, { nonNegative: true });
  }
  if (Object.hasOwn(record, "source"))
    validateEnum(context, record.source, location, "source", DATA_SOURCES);
  if (Object.hasOwn(record, "confidence"))
    validateEnum(context, record.confidence, location, "confidence", CONFIDENCES);
  validateOptionalProvenance(context, record, location);
}

function validateMeal(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "name", "type", "calories", "protein", "carbs", "fat", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [
    ...required,
    "fiber",
    "notes",
    "items",
    "source",
    "confidence",
    "originalText",
    "assumptions",
    "confirmed",
    "auditId",
    "provenance",
  ]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  for (const field of ["name", "type"] as const) {
    if (Object.hasOwn(record, field))
      validateString(context, record[field], location, field, { requiredNonEmpty: true });
  }
  for (const field of ["calories", "protein", "carbs", "fat"] as const) {
    if (Object.hasOwn(record, field))
      validateNumber(context, record[field], location, field, { nonNegative: true });
  }
  validateOptionalNumber(context, record, location, "fiber", { nonNegative: true });
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  if (Object.hasOwn(record, "source"))
    validateEnum(context, record.source, location, "source", DATA_SOURCES);
  if (Object.hasOwn(record, "confidence"))
    validateEnum(context, record.confidence, location, "confidence", CONFIDENCES);
  validateOptionalString(context, record, location, "notes");
  validateOptionalString(context, record, location, "originalText");
  validateOptionalString(context, record, location, "auditId");
  validateOptionalBoolean(context, record, location, "confirmed");
  if (Object.hasOwn(record, "assumptions"))
    validateStringArray(context, record.assumptions, location, "assumptions");
  validateOptionalProvenance(context, record, location);
  if (!Object.hasOwn(record, "items")) return;
  if (!Array.isArray(record.items)) {
    context.add("invalid_field_type", "error", fieldPath(location, "items"), {
      collection: location.collection,
      recordId: location.recordId,
      field: "items",
      value: record.items,
    });
    return;
  }
  record.items.forEach((item, index) =>
    validateObjectRecord(
      context,
      item,
      location.collection,
      `${location.path}.items[${index}]`,
      validateMealItem,
    ),
  );
}

function validateBodyweight(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "weightLb", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "notes", "provenance"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "weightLb"))
    validateNumber(context, record.weightLb, location, "weightLb", { positive: true });
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  validateOptionalString(context, record, location, "notes");
  validateOptionalProvenance(context, record, location);
}

function validateSleep(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "hours", "quality", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "notes", "provenance"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "hours"))
    validateNumber(context, record.hours, location, "hours", { nonNegative: true });
  if (Object.hasOwn(record, "quality"))
    validateNumber(context, record.quality, location, "quality", { nonNegative: true });
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  validateOptionalString(context, record, location, "notes");
  validateOptionalProvenance(context, record, location);
}

function validateRecoveryCheckIn(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "energy", "soreness", "stress", "motivation", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "notes", "provenance"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  for (const field of ["energy", "soreness", "stress", "motivation"] as const) {
    if (Object.hasOwn(record, field))
      validateNumber(context, record[field], location, field, { nonNegative: true });
  }
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  validateOptionalString(context, record, location, "notes");
  validateOptionalProvenance(context, record, location);
}

function validateRecoverySignal(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "sourceLogId", "kind", "severity", "notes", "createdAt", "source"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "bodyArea", "provenance"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "sourceLogId"))
    validateString(context, record.sourceLogId, location, "sourceLogId", {
      requiredNonEmpty: true,
    });
  if (Object.hasOwn(record, "kind"))
    validateEnum(context, record.kind, location, "kind", [
      "pain",
      "soreness",
      "fatigue",
      "sleep",
      "injury",
      "discomfort",
    ]);
  if (Object.hasOwn(record, "severity"))
    validateNumber(context, record.severity, location, "severity", { nonNegative: true });
  if (Object.hasOwn(record, "notes")) validateString(context, record.notes, location, "notes");
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  if (Object.hasOwn(record, "source"))
    validateEnum(context, record.source, location, "source", [
      "manual",
      "ai",
      "camera",
      "imported",
      "barcode",
      "health",
    ]);
  validateOptionalString(context, record, location, "bodyArea");
  validateOptionalProvenance(context, record, location);
}

function validatePr(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "exerciseId", "type", "value", "date"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "reps", "weight"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "exerciseId"))
    validateString(context, record.exerciseId, location, "exerciseId", { requiredNonEmpty: true });
  if (Object.hasOwn(record, "type"))
    validateEnum(context, record.type, location, "type", ["1rm", "weight", "volume"]);
  if (Object.hasOwn(record, "value"))
    validateNumber(context, record.value, location, "value", { nonNegative: true });
  validateOptionalNumber(context, record, location, "reps", { nonNegative: true });
  validateOptionalNumber(context, record, location, "weight", { nonNegative: true });
  if (Object.hasOwn(record, "date")) validateTimestamp(context, record.date, location, "date");
}

function validateGoal(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "type", "label", "target", "current"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "section", "pinned"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "type"))
    validateEnum(context, record.type, location, "type", [
      "lift",
      "weekly_workouts",
      "bodyweight",
      "cardio",
      "habit",
      "volume",
      "sleep",
      "readiness",
      "macro",
      "consistency",
      "photo",
    ]);
  if (Object.hasOwn(record, "label"))
    validateString(context, record.label, location, "label", { requiredNonEmpty: true });
  if (Object.hasOwn(record, "target"))
    validateNumber(context, record.target, location, "target", { nonNegative: true });
  if (Object.hasOwn(record, "current"))
    validateNumber(context, record.current, location, "current");
  if (Object.hasOwn(record, "section"))
    validateEnum(context, record.section, location, "section", [
      "home",
      "training",
      "nutrition",
      "recovery",
      "progress",
    ]);
  validateOptionalBoolean(context, record, location, "pinned");
}

function validateProgressPhoto(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "dataUrl", "view", "phase", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [...required, "notes"]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "dataUrl"))
    validateString(context, record.dataUrl, location, "dataUrl", { requiredNonEmpty: true });
  if (Object.hasOwn(record, "view"))
    validateEnum(context, record.view, location, "view", ["front", "side", "back"]);
  if (Object.hasOwn(record, "phase"))
    validateEnum(context, record.phase, location, "phase", ["bulk", "cut", "maintenance"]);
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  validateOptionalString(context, record, location, "notes");
}

function validateAiMessage(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "role", "content", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, required);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "role"))
    validateEnum(context, record.role, location, "role", ["user", "assistant"]);
  if (Object.hasOwn(record, "content"))
    validateString(context, record.content, location, "content");
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
}

function validateJarvisAudit(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "tool", "summary", "status", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [
    ...required,
    "originalText",
    "assumptions",
    "confidence",
    "entityIds",
    "entityKind",
    "patch",
    "undone",
  ]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  for (const field of ["tool", "summary"] as const)
    if (Object.hasOwn(record, field))
      validateString(context, record[field], location, field, { requiredNonEmpty: true });
  if (Object.hasOwn(record, "status"))
    validateEnum(context, record.status, location, "status", [
      "logged",
      "suggested",
      "edited",
      "skipped",
      "undone",
    ]);
  if (Object.hasOwn(record, "confidence"))
    validateEnum(context, record.confidence, location, "confidence", CONFIDENCES);
  validateOptionalString(context, record, location, "originalText");
  validateOptionalString(context, record, location, "entityKind");
  if (Object.hasOwn(record, "assumptions"))
    validateStringArray(context, record.assumptions, location, "assumptions");
  if (Object.hasOwn(record, "entityIds"))
    validateStringArray(context, record.entityIds, location, "entityIds", { nonEmptyItems: true });
  if (Object.hasOwn(record, "patch") && !isPlainRecord(record.patch)) {
    context.add("invalid_field_type", "error", fieldPath(location, "patch"), {
      collection: location.collection,
      recordId: location.recordId,
      field: "patch",
      value: record.patch,
    });
  }
  validateOptionalBoolean(context, record, location, "undone");
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
}

function validateSupplement(
  context: ValidationContext,
  record: PlainRecord,
  location: RecordLocation,
): void {
  const required = ["id", "name", "createdAt"];
  missingFields(context, record, location, required);
  unknownFields(context, record, location, [
    ...required,
    "dose",
    "notes",
    "source",
    "auditId",
    "provenance",
  ]);
  if (Object.hasOwn(record, "id")) validateString(context, record.id, location, "id", { id: true });
  if (Object.hasOwn(record, "name"))
    validateString(context, record.name, location, "name", { requiredNonEmpty: true });
  validateOptionalString(context, record, location, "dose");
  validateOptionalString(context, record, location, "notes");
  validateOptionalString(context, record, location, "auditId");
  if (Object.hasOwn(record, "source"))
    validateEnum(context, record.source, location, "source", DATA_SOURCES);
  if (Object.hasOwn(record, "createdAt"))
    validateTimestamp(context, record.createdAt, location, "createdAt");
  validateOptionalProvenance(context, record, location);
}

const COLLECTION_VALIDATORS: Record<
  string,
  (context: ValidationContext, record: PlainRecord, location: RecordLocation) => void
> = {
  workouts: validateWorkout,
  workoutTemplates: validateWorkoutTemplate,
  customExercises: validateCustomExercise,
  cardioEntries: validateCardio,
  mealEntries: validateMeal,
  bodyweightEntries: validateBodyweight,
  sleepEntries: validateSleep,
  recoveryCheckIns: validateRecoveryCheckIn,
  recoverySignals: validateRecoverySignal,
  prs: validatePr,
  goals: validateGoal,
  progressPhotos: validateProgressPhoto,
  aiMessages: validateAiMessage,
  jarvisAudit: validateJarvisAudit,
  supplementLogs: validateSupplement,
};

function validateClosedObject(
  context: ValidationContext,
  value: PlainRecord,
  collection: string,
  required: readonly string[],
  allowed: readonly string[],
  validate: (record: PlainRecord, location: RecordLocation) => void,
): void {
  const location = { collection, path: `$.${collection}`, recordId: null };
  missingFields(context, value, location, required);
  unknownFields(context, value, location, allowed);
  validate(value, location);
}

function validateProfile(context: ValidationContext, value: PlainRecord): void {
  const required = [
    "goal",
    "experience",
    "daysPerWeek",
    "split",
    "bodyweightLb",
    "targetBodyweightLb",
    "units",
  ];
  const allowed = [
    ...required,
    "name",
    "age",
    "sex",
    "heightIn",
    "trainingAgeYears",
    "preferredWorkoutDays",
    "preferredWorkoutTime",
    "sessionLengthMin",
    "favoriteMuscles",
    "weakMuscles",
    "exercisesToAvoid",
    "equipment",
    "gymOrHome",
    "intensity",
    "dietStyle",
    "carbFatPreference",
    "mealsPerDay",
    "foodsToAvoid",
    "allergies",
    "macroStrictness",
    "sleepGoalH",
    "stepGoal",
    "cardioGoalMin",
    "recoveryPriority",
    "injuries",
    "sorenessSensitivity",
  ];
  validateClosedObject(context, value, "profile", required, allowed, (record, location) => {
    if (Object.hasOwn(record, "goal"))
      validateEnum(context, record.goal, location, "goal", [
        "strength",
        "hypertrophy",
        "lean_bulk",
        "cut",
        "maintenance",
      ]);
    if (Object.hasOwn(record, "experience"))
      validateEnum(context, record.experience, location, "experience", [
        "beginner",
        "intermediate",
        "advanced",
      ]);
    if (Object.hasOwn(record, "units"))
      validateEnum(context, record.units, location, "units", ["lb", "kg"]);
    if (Object.hasOwn(record, "split"))
      validateString(context, record.split, location, "split", { requiredNonEmpty: true });
    if (Object.hasOwn(record, "daysPerWeek"))
      validateNumber(context, record.daysPerWeek, location, "daysPerWeek", {
        nonNegative: true,
        integer: true,
      });
    for (const field of ["bodyweightLb", "targetBodyweightLb"] as const)
      if (Object.hasOwn(record, field))
        validateNumber(context, record[field], location, field, { positive: true });
    for (const field of [
      "age",
      "heightIn",
      "trainingAgeYears",
      "sessionLengthMin",
      "mealsPerDay",
      "sleepGoalH",
      "stepGoal",
      "cardioGoalMin",
    ] as const)
      validateOptionalNumber(context, record, location, field, { nonNegative: true });
    validateOptionalString(context, record, location, "name");
    const enums: [string, readonly string[]][] = [
      ["sex", ["male", "female", "other"]],
      ["preferredWorkoutTime", ["morning", "midday", "evening", "anytime"]],
      ["gymOrHome", ["gym", "home", "both"]],
      ["intensity", ["easy", "moderate", "hard"]],
      [
        "dietStyle",
        ["balanced", "high_protein", "low_carb", "keto", "vegetarian", "vegan", "mediterranean"],
      ],
      ["carbFatPreference", ["high_carb", "balanced", "high_fat"]],
      ["macroStrictness", ["loose", "moderate", "strict"]],
      ["recoveryPriority", ["low", "moderate", "high"]],
      ["sorenessSensitivity", ["low", "normal", "high"]],
    ];
    for (const [field, values] of enums)
      if (Object.hasOwn(record, field))
        validateEnum(context, record[field], location, field, values);
    for (const field of [
      "preferredWorkoutDays",
      "favoriteMuscles",
      "weakMuscles",
      "exercisesToAvoid",
      "equipment",
      "foodsToAvoid",
      "allergies",
      "injuries",
    ] as const) {
      if (Object.hasOwn(record, field))
        validateStringArray(context, record[field], location, field);
    }
  });
}

function validateNutritionTargets(context: ValidationContext, value: PlainRecord): void {
  const fields = ["calories", "protein", "carbs", "fat"];
  validateClosedObject(context, value, "nutritionTargets", fields, fields, (record, location) => {
    for (const field of fields)
      if (Object.hasOwn(record, field))
        validateNumber(context, record[field], location, field, { nonNegative: true });
  });
}

function validateReminders(context: ValidationContext, value: PlainRecord): void {
  const fields = ["workout", "weighIn", "lunch"];
  validateClosedObject(context, value, "reminders", [], fields, (record, location) => {
    for (const field of fields)
      if (Object.hasOwn(record, field)) validateBoolean(context, record[field], location, field);
  });
}

function validatePersonalization(context: ValidationContext, value: PlainRecord): void {
  const allowed = [
    "themeAccent",
    "defaultDashboardFocus",
    "defaultGraphModes",
    "units",
    "reminders",
    "aiCoachTone",
    "aiResponseLength",
    "uiComplexity",
    "showAdvancedStats",
  ];
  validateClosedObject(context, value, "personalization", [], allowed, (record, location) => {
    const enums: [string, readonly string[]][] = [
      ["themeAccent", ["auto", "purple", "blue", "green", "red"]],
      ["defaultDashboardFocus", ["training", "nutrition", "recovery", "progress"]],
      ["aiCoachTone", ["direct", "supportive", "detailed", "simple"]],
      ["aiResponseLength", ["quick", "detailed"]],
      ["uiComplexity", ["simple", "advanced"]],
    ];
    for (const [field, values] of enums)
      if (Object.hasOwn(record, field))
        validateEnum(context, record[field], location, field, values);
    validateOptionalBoolean(context, record, location, "showAdvancedStats");
    if (Object.hasOwn(record, "defaultGraphModes") && !isPlainRecord(record.defaultGraphModes))
      context.add("invalid_field_type", "error", fieldPath(location, "defaultGraphModes"), {
        collection: location.collection,
        field: "defaultGraphModes",
        value: record.defaultGraphModes,
      });
    else if (isPlainRecord(record.defaultGraphModes)) {
      const nested = { ...location, path: fieldPath(location, "defaultGraphModes") };
      unknownFields(context, record.defaultGraphModes, nested, ["volume", "heatmap"]);
      validateOptionalString(context, record.defaultGraphModes, nested, "volume");
      validateOptionalString(context, record.defaultGraphModes, nested, "heatmap");
    }
    if (Object.hasOwn(record, "units")) {
      if (!isPlainRecord(record.units))
        context.add("invalid_field_type", "error", fieldPath(location, "units"), {
          collection: location.collection,
          field: "units",
          value: record.units,
        });
      else {
        const nested = { ...location, path: fieldPath(location, "units") };
        unknownFields(context, record.units, nested, ["weight", "distance"]);
        if (Object.hasOwn(record.units, "weight"))
          validateEnum(context, record.units.weight, nested, "weight", ["lb", "kg"]);
        if (Object.hasOwn(record.units, "distance"))
          validateEnum(context, record.units.distance, nested, "distance", ["mi", "km"]);
      }
    }
    if (Object.hasOwn(record, "reminders") && !isPlainRecord(record.reminders))
      context.add("invalid_field_type", "error", fieldPath(location, "reminders"), {
        collection: location.collection,
        field: "reminders",
        value: record.reminders,
      });
    else if (isPlainRecord(record.reminders)) {
      const nested = { ...location, path: fieldPath(location, "reminders") };
      const booleanFields = ["workoutEnabled", "weighInEnabled", "mealLogEnabled"];
      const stringFields = ["workoutTime", "weighInTime", "mealLogTime"];
      unknownFields(context, record.reminders, nested, [...booleanFields, ...stringFields]);
      for (const field of booleanFields)
        if (Object.hasOwn(record.reminders, field))
          validateBoolean(context, record.reminders[field], nested, field);
      for (const field of stringFields)
        validateOptionalString(context, record.reminders, nested, field);
    }
  });
}

function validateMuscleFatigue(context: ValidationContext, value: PlainRecord): void {
  const location = { collection: "muscleFatigue", path: "$.muscleFatigue", recordId: null };
  for (const field of Object.keys(value).sort())
    validateEnum(context, value[field], location, field, ["fresh", "moderate", "fatigued", "very"]);
}

function validateUserGoalsProfile(context: ValidationContext, value: PlainRecord): void {
  const allowed = [
    "goal",
    "targetBodyweightLb",
    "currentBodyweightLb",
    "calorieGoal",
    "proteinGoal",
    "carbGoal",
    "fatGoal",
    "fiberGoal",
    "weeklyWeightChangeLb",
    "workoutSplit",
    "normalWorkoutDays",
    "normalWorkoutTime",
    "weakPoints",
    "injuryAreas",
    "supplementRoutine",
    "normalWeighInTime",
    "foodPreferences",
    "dislikedFoods",
    "usualBreakfast",
    "usualLunch",
    "usualDinner",
    "usualSnack",
    "usualProteinShake",
    "usualPreWorkoutMeal",
    "usualPostWorkoutMeal",
    "commonRestaurantOrders",
    "preferredCardio",
    "recoveryPriorities",
  ];
  validateClosedObject(context, value, "userGoalsProfile", [], allowed, (record, location) => {
    if (Object.hasOwn(record, "goal"))
      validateEnum(context, record.goal, location, "goal", [
        "bulk",
        "cut",
        "maintain",
        "recomp",
        "strength",
        "hypertrophy",
        "general",
      ]);
    for (const field of [
      "targetBodyweightLb",
      "currentBodyweightLb",
      "calorieGoal",
      "proteinGoal",
      "carbGoal",
      "fatGoal",
      "fiberGoal",
    ] as const)
      validateOptionalNumber(context, record, location, field, { nonNegative: true });
    validateOptionalNumber(context, record, location, "weeklyWeightChangeLb");
    for (const field of [
      "workoutSplit",
      "normalWorkoutTime",
      "normalWeighInTime",
      "usualBreakfast",
      "usualLunch",
      "usualDinner",
      "usualSnack",
      "usualProteinShake",
      "usualPreWorkoutMeal",
      "usualPostWorkoutMeal",
    ] as const)
      validateOptionalString(context, record, location, field);
    for (const field of [
      "normalWorkoutDays",
      "weakPoints",
      "injuryAreas",
      "supplementRoutine",
      "foodPreferences",
      "dislikedFoods",
      "commonRestaurantOrders",
      "preferredCardio",
      "recoveryPriorities",
    ] as const)
      if (Object.hasOwn(record, field))
        validateStringArray(context, record[field], location, field);
  });
}

function validateJarvisSettings(context: ValidationContext, value: PlainRecord): void {
  const booleanFields = [
    "enabled",
    "geminiUserKeySaved",
    "groqUserKeySaved",
    "autoModelRouting",
    "autoAiFallback",
    "allowGeminiFallback",
    "autoLogSupplements",
    "autoLogBodyweight",
    "askBeforeMealEstimates",
    "askBeforeWorkouts",
    "askBeforeActiveWorkoutEdits",
    "learningEnabled",
    "autoLogMealEstimates",
    "nutritionSuggestions",
    "supplementReminders",
    "autoApplyActiveWorkoutSuggestions",
    "workoutSuggestions",
    "progressionSuggestions",
    "painBasedWorkoutWarnings",
    "saveWorkoutTemplateSuggestions",
    "voiceModeEnabled",
    "spokenResponses",
    "useWhoop",
    "useAppleHealth",
    "dailyReviewEnabled",
    "weeklyReviewEnabled",
  ];
  const enumFields: [string, readonly (string | number)[]][] = [
    ["permission", [1, 2, 3, 4]],
    ["responseStyle", ["concise", "normal", "detailed"]],
    ["personality", ["friendly", "coach", "siri", "chatgpt"]],
    ["proactive", ["off", "low", "normal", "high"]],
    ["aiProvider", ["groq", "gemini", "legacy-lovable"]],
    ["geminiKeyMode", ["local", "environment", "user"]],
    ["geminiModel", ["gemini-2.5-flash-lite", "gemini-2.5-flash"]],
    ["groqKeyMode", ["local", "environment", "user"]],
    ["groqModel", ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "qwen/qwen3-32b"]],
    ["foodEstimateDetail", ["simple", "normal", "detailed"]],
    ["weeklyReviewDay", ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]],
  ];
  const stringFields = ["dailyReviewTime", "weeklyReviewTime"];
  const allowed = [...booleanFields, ...enumFields.map(([field]) => field), ...stringFields];
  validateClosedObject(context, value, "jarvisSettings", [], allowed, (record, location) => {
    for (const field of booleanFields)
      if (Object.hasOwn(record, field)) validateBoolean(context, record[field], location, field);
    for (const [field, values] of enumFields)
      if (Object.hasOwn(record, field))
        validateEnum(context, record[field], location, field, values);
    for (const field of stringFields) validateOptionalString(context, record, location, field);
  });
}

function validateTopLevelTypes(context: ValidationContext, root: PlainRecord): void {
  for (const field of TOP_LEVEL_FIELDS) {
    if (!Object.hasOwn(root, field)) {
      context.add("missing_required_top_level_field", "error", `$.${field}`, {
        field,
        value: null,
      });
      continue;
    }
    const value = root[field];
    let valid = true;
    if (ARRAY_COLLECTION_SET.has(field)) valid = Array.isArray(value);
    else if (OBJECT_FIELD_SET.has(field)) valid = isPlainRecord(value);
    else if (field === "activeWorkout") valid = value === null || isPlainRecord(value);
    else if (field === "onboardingComplete" || field === "demoMode")
      valid = typeof value === "boolean";
    else if (field === "version") valid = typeof value === "number";
    if (!valid) context.add("invalid_top_level_type", "error", `$.${field}`, { field, value });
  }
}

function validateTopLevelValues(context: ValidationContext, root: PlainRecord): void {
  const rootLocation = { collection: "root", path: "$", recordId: null };
  if (typeof root.version === "number")
    validateNumber(context, root.version, rootLocation, "version", { min: 1, integer: true });
  for (const field of ["onboardingComplete", "demoMode"] as const) {
    if (typeof root[field] === "boolean") continue;
  }
  if (isPlainRecord(root.profile)) validateProfile(context, root.profile);
  if (isPlainRecord(root.personalization)) validatePersonalization(context, root.personalization);
  if (isPlainRecord(root.nutritionTargets))
    validateNutritionTargets(context, root.nutritionTargets);
  if (isPlainRecord(root.muscleFatigue)) validateMuscleFatigue(context, root.muscleFatigue);
  if (isPlainRecord(root.reminders)) validateReminders(context, root.reminders);
  if (isPlainRecord(root.jarvisSettings)) validateJarvisSettings(context, root.jarvisSettings);
  if (isPlainRecord(root.userGoalsProfile))
    validateUserGoalsProfile(context, root.userGoalsProfile);
}

function validateCollections(context: ValidationContext, root: PlainRecord): void {
  for (const collection of ARRAY_COLLECTIONS) {
    const value = root[collection];
    if (!Array.isArray(value)) continue;
    const validator = COLLECTION_VALIDATORS[collection];
    value.forEach((record, index) => {
      const path = `$.${collection}[${index}]`;
      validateObjectRecord(context, record, collection, path, validator);
      if (isPlainRecord(record)) context.registerId(collection, record.id, `${path}.id`);
    });
  }
  if (isPlainRecord(root.activeWorkout)) {
    validateObjectRecord(
      context,
      root.activeWorkout,
      "activeWorkout",
      "$.activeWorkout",
      validateWorkout,
    );
    context.registerId("activeWorkout", root.activeWorkout.id, "$.activeWorkout.id");
  }
  if (Array.isArray(root.dismissedSuggestions)) {
    root.dismissedSuggestions.forEach((value, index) => {
      const location = {
        collection: "dismissedSuggestions",
        path: `$.dismissedSuggestions[${index}]`,
        recordId: null,
      };
      validateString(context, value, location, "value", { requiredNonEmpty: true });
    });
  }
}

function addDuplicateIssues(context: ValidationContext): void {
  for (const [scope, byId] of [...context.identityPaths.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    for (const [id, paths] of [...byId.entries()]
      .filter(([, entries]) => entries.length > 1)
      .sort(([, a], [, b]) => a[0].localeCompare(b[0]))) {
      const sorted = [...paths].sort();
      const collection = scope.startsWith("$.") ? scope.slice(2).split(/[.[]/, 1)[0] : scope;
      for (const path of sorted) {
        context.add("duplicate_id", "error", path, {
          collection,
          recordId: id,
          value: id,
          relatedPaths: sorted.filter((other) => other !== path),
        });
      }
    }
  }

  const crossCollection = new Map<string, { collection: string; path: string }[]>();
  for (const collection of ARRAY_COLLECTIONS) {
    const ids = context.identityPaths.get(collection);
    if (!ids) continue;
    for (const [id, paths] of ids) {
      const entries = crossCollection.get(id) ?? [];
      entries.push(...paths.map((path) => ({ collection, path })));
      crossCollection.set(id, entries);
    }
  }
  const activeIds = context.identityPaths.get("activeWorkout");
  if (activeIds) {
    for (const [id, paths] of activeIds) {
      const entries = crossCollection.get(id) ?? [];
      entries.push(...paths.map((path) => ({ collection: "activeWorkout", path })));
      crossCollection.set(id, entries);
    }
  }
  for (const [id, entries] of [...crossCollection.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (new Set(entries.map(({ collection }) => collection)).size < 2) continue;
    const paths = entries.map(({ path }) => path).sort();
    for (const entry of entries.sort((a, b) => a.path.localeCompare(b.path))) {
      context.add("duplicate_id_cross_collection", "warning", entry.path, {
        collection: entry.collection,
        recordId: id,
        value: id,
        relatedPaths: paths.filter((path) => path !== entry.path),
      });
    }
  }
}

function collectValidIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(value)) return ids;
  for (const record of value)
    if (isPlainRecord(record) && typeof record.id === "string" && record.id.trim())
      ids.add(record.id);
  return ids;
}

function validateReferences(context: ValidationContext, root: PlainRecord): void {
  const sourceIds = new Set<string>();
  for (const collection of [
    "workouts",
    "cardioEntries",
    "mealEntries",
    "bodyweightEntries",
    "sleepEntries",
    "recoveryCheckIns",
    "supplementLogs",
  ] as const) {
    for (const id of collectValidIds(root[collection])) sourceIds.add(id);
  }
  if (Array.isArray(root.recoverySignals)) {
    root.recoverySignals.forEach((record, index) => {
      if (
        !isPlainRecord(record) ||
        typeof record.sourceLogId !== "string" ||
        !record.sourceLogId.trim() ||
        sourceIds.has(record.sourceLogId)
      )
        return;
      const path = `$.recoverySignals[${index}].sourceLogId`;
      context.add("orphaned_reference", "warning", path, {
        collection: "recoverySignals",
        recordId: safeId(record),
        field: "sourceLogId",
        value: record.sourceLogId,
      });
    });
  }

  const templateIds = collectValidIds(root.workoutTemplates);
  if (Array.isArray(root.workoutTemplates)) {
    for (const template of root.workoutTemplates)
      if (
        isPlainRecord(template) &&
        typeof template.templateId === "string" &&
        template.templateId.trim()
      )
        templateIds.add(template.templateId);
  }
  const checkWorkout = (record: unknown, path: string, collection: string) => {
    if (
      !isPlainRecord(record) ||
      typeof record.templateId !== "string" ||
      !record.templateId.trim() ||
      templateIds.has(record.templateId)
    )
      return;
    context.add("orphaned_reference", "warning", `${path}.templateId`, {
      collection,
      recordId: safeId(record),
      field: "templateId",
      value: record.templateId,
    });
  };
  if (Array.isArray(root.workouts))
    root.workouts.forEach((record, index) =>
      checkWorkout(record, `$.workouts[${index}]`, "workouts"),
    );
  if (isPlainRecord(root.activeWorkout))
    checkWorkout(root.activeWorkout, "$.activeWorkout", "activeWorkout");
}

function emptyIssueCounts(): Record<DataIntegrityIssueCode, number> {
  return Object.fromEntries(ISSUE_CODE_ORDER.map((code) => [code, 0])) as Record<
    DataIntegrityIssueCode,
    number
  >;
}

function finalizeReport(context: ValidationContext, rootRecognized: boolean): DataIntegrityReport {
  const drafts = [...context.issues].sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      (ISSUE_RANK.get(a.code) ?? 999) - (ISSUE_RANK.get(b.code) ?? 999) ||
      a.severity.localeCompare(b.severity) ||
      a.relatedPaths.join("\u0000").localeCompare(b.relatedPaths.join("\u0000")) ||
      (a.recordId ?? "").localeCompare(b.recordId ?? ""),
  );
  const occurrence = new Map<string, number>();
  const issues = drafts.map((draft) => {
    const base = `${draft.code}:${draft.path}`;
    const ordinal = occurrence.get(base) ?? 0;
    occurrence.set(base, ordinal + 1);
    return {
      issueKey: `${base}:${ordinal}`,
      ...draft,
      messageKey: `data_integrity.${draft.code}`,
    };
  });
  const issueCounts = emptyIssueCounts();
  for (const issue of issues) issueCounts[issue.code] += 1;
  const errorCount = issues.filter(({ severity }) => severity === "error").length;
  const warningCount = issues.length - errorCount;
  return {
    policy: FITCORE_DATA_INTEGRITY_POLICY,
    status: errorCount ? "invalid" : warningCount ? "warnings" : "valid",
    rootRecognized,
    issueCount: issues.length,
    errorCount,
    warningCount,
    collectionCount: rootRecognized ? CHECKED_COLLECTIONS.length : 0,
    recordCount: context.recordCount,
    checkedCollections: rootRecognized ? [...CHECKED_COLLECTIONS] : [],
    issueCounts,
    issues,
  };
}

/** Inspect untrusted FitCore state without migrating, repairing, mutating, or persisting it. */
export function validateFitCoreDataIntegrity(value: unknown): DataIntegrityReport {
  const context = new ValidationContext();
  if (!isPlainRecord(value)) {
    context.add("invalid_root", "error", "$", { value });
    return finalizeReport(context, false);
  }

  for (const field of Object.keys(value)
    .filter((key) => !TOP_LEVEL_SET.has(key))
    .sort()) {
    context.add("unknown_top_level_field", "warning", `$.${field}`, { field, value: value[field] });
  }
  validateTopLevelTypes(context, value);
  validateTopLevelValues(context, value);
  validateCollections(context, value);
  addDuplicateIssues(context);
  validateReferences(context, value);
  return finalizeReport(context, true);
}
