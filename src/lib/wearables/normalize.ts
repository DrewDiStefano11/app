import {
  NormalizedRecord,
  WearableProvider,
  WearableRecordType,
  SleepStageRecord,
  SleepStage,
  CanonicalUnit,
  RejectedRecord,
  WarningRecord,
  RejectionReason,
  SleepSessionPayload,
  WorkoutSessionPayload
} from "./types";

export interface NormalizationResult {
  accepted: NormalizedRecord[];
  rejected: RejectedRecord[];
  warnings: WarningRecord[];
}

export interface RawRecord {
  id?: string;
  provider?: string;
  providerRecordId?: string;
  type?: string;
  startAt?: number;
  endAt?: number;
  timezoneOffset?: number;
  value?: number;
  payload?: unknown;
  unit?: string;
  sourceDevice?: string;
  sourceApp?: string;
  confidence?: "high" | "medium" | "low" | "unknown";
  confirmation?: "confirmed" | "unconfirmed" | "not-required";
  provenance?: "direct" | "aggregator" | "manual" | "unknown";
  metadata?: Record<string, unknown>;
  updatedAt?: number;
  revoked?: boolean;
}

export interface NormalizeOptions {
  normalizedAt?: number;
}

function parseProvider(raw: string | undefined): WearableProvider {
  if (!raw) return "unknown";
  const p = raw.toLowerCase();
  switch (p) {
    case "apple-health":
    case "apple": return "apple-health";
    case "health-connect":
    case "google": return "health-connect";
    case "whoop": return "whoop";
    case "garmin": return "garmin";
    case "fitbit": return "fitbit";
    case "oura": return "oura";
    case "manual": return "manual";
    default: return "unknown";
  }
}

function parseRecordType(raw: string | undefined): WearableRecordType {
  if (!raw) return "unknown";
  const t = raw.toLowerCase().replace(/-/g, "_");
  const types: WearableRecordType[] = [
    "heart_rate", "resting_heart_rate", "heart_rate_variability", "steps",
    "active_calories", "total_calories", "sleep_session", "sleep_stages",
    "respiratory_rate", "temperature", "spo2", "workout_session", "distance",
    "elevation", "weight", "body_fat_percentage"
  ];
  if (types.includes(t as WearableRecordType)) {
    return t as WearableRecordType;
  }
  return "unknown";
}

export function convertUnit(value: number, fromUnit: string, type: WearableRecordType): { value: number; canonicalUnit: CanonicalUnit; error?: RejectionReason } {
  const u = fromUnit.toLowerCase();

  if (type === "weight") {
    if (u === "kg" || u === "kilogram" || u === "kilograms") return { value: value * 2.20462, canonicalUnit: "lb" };
    if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return { value, canonicalUnit: "lb" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "temperature") {
    if (u === "f" || u === "fahrenheit") return { value: (value - 32) * 5/9, canonicalUnit: "celsius" };
    if (u === "c" || u === "celsius") return { value, canonicalUnit: "celsius" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "distance" || type === "elevation") {
    if (u === "mi" || u === "mile" || u === "miles") return { value: value * 1609.34, canonicalUnit: "meters" };
    if (u === "km" || u === "kilometer" || u === "kilometers") return { value: value * 1000, canonicalUnit: "meters" };
    if (u === "m" || u === "meter" || u === "meters") return { value, canonicalUnit: "meters" };
    if (u === "ft" || u === "foot" || u === "feet") return { value: value * 0.3048, canonicalUnit: "meters" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "active_calories" || type === "total_calories") {
    if (u === "j" || u === "joule" || u === "joules") return { value: value / 4184, canonicalUnit: "kcal" };
    if (u === "kj" || u === "kilojoule") return { value: value / 4.184, canonicalUnit: "kcal" };
    if (u === "kcal" || u === "calorie" || u === "calories" || u === "cal") return { value, canonicalUnit: "kcal" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "heart_rate" || type === "resting_heart_rate") {
    if (u === "bpm" || u === "count/min") return { value, canonicalUnit: "bpm" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "heart_rate_variability") {
    if (u === "s" || u === "sec" || u === "seconds") return { value: value * 1000, canonicalUnit: "ms" };
    if (u === "ms" || u === "milliseconds") return { value, canonicalUnit: "ms" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "spo2" || type === "body_fat_percentage") {
    if (u === "fraction") return { value: value * 100, canonicalUnit: "percentage" };
    if (u === "%" || u === "percentage" || u === "percent") {
      // Some providers send fraction as percentage, check bounds
      if (value <= 1.0 && type === "spo2") {
        return { value: value * 100, canonicalUnit: "percentage" };
      }
      return { value, canonicalUnit: "percentage" };
    }
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "steps") {
    if (u === "count" || u === "steps") return { value, canonicalUnit: "count" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "respiratory_rate") {
    if (u === "rpm" || u === "breaths/min") return { value, canonicalUnit: "rpm" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }
  if (type === "sleep_session") {
    if (u === "s" || u === "sec" || u === "seconds") return { value: value * 1000, canonicalUnit: "ms" };
    if (u === "m" || u === "min" || u === "minutes") return { value: value * 60000, canonicalUnit: "ms" };
    if (u === "h" || u === "hr" || u === "hours") return { value: value * 3600000, canonicalUnit: "ms" };
    if (u === "ms" || u === "milliseconds") return { value, canonicalUnit: "ms" };
    return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
  }

  return { value, canonicalUnit: "unknown", error: "incompatible_unit" };
}

function normalizeSleepStages(payload: unknown, sessionStart: number, sessionEnd?: number): SleepSessionPayload | null {
  if (!Array.isArray(payload)) return null;
  const stages: SleepStageRecord[] = [];

  for (const item of payload) {
    if (!item || typeof item !== 'object') continue;
    const stage = (item as Record<string, unknown>).stage;
    const start = (item as Record<string, unknown>).start;
    const end = (item as Record<string, unknown>).end;
    if (!stage || typeof start !== 'number' || typeof end !== 'number') continue;
    if (start >= end || start < 0 || end < 0) continue;

    // Bounds check with session if available
    if (sessionStart && start < sessionStart) continue;
    if (sessionEnd && end > sessionEnd) continue;

    // Normalize stage
    let s: SleepStage = "unknown";
    const rawStage = String(stage).toLowerCase();
    if (rawStage.includes("awake") || rawStage.includes("wake")) s = "awake";
    else if (rawStage.includes("light") || rawStage.includes("core")) s = "light";
    else if (rawStage.includes("deep")) s = "deep";
    else if (rawStage.includes("rem")) s = "rem";

    stages.push({ stage: s, start, end });
  }

  // Sort
  stages.sort((a, b) => a.start - b.start);

  let hasOverlap = false;
  let totalDurationMs = 0;

  for (let i = 0; i < stages.length; i++) {
    totalDurationMs += (stages[i].end - stages[i].start);
    if (i > 0 && stages[i].start < stages[i - 1].end) {
      hasOverlap = true;
    }
  }

  return stages.length > 0 ? { stages, totalDurationMs, hasOverlap } : null;
}

function normalizeWorkout(payload: unknown): WorkoutSessionPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  return {
    workoutType: typeof p.workoutType === 'string' ? String(p.workoutType).toLowerCase() : "unknown",
    duration: typeof p.duration === 'number' && p.duration > 0 ? p.duration : undefined,
    distance: typeof p.distance === 'number' && p.distance >= 0 ? p.distance : undefined,
    calories: typeof p.calories === 'number' && p.calories >= 0 ? p.calories : undefined,
    averageHeartRate: typeof p.averageHeartRate === 'number' && p.averageHeartRate > 0 ? p.averageHeartRate : undefined,
  };
}

export function normalizeRecord(raw: RawRecord, options?: NormalizeOptions): { record?: NormalizedRecord, error?: RejectionReason, message?: string, warning?: string } {
  if (!raw.id && !raw.providerRecordId) return { error: "missing_record_id" };
  const provider = parseProvider(raw.provider);
  const type = parseRecordType(raw.type);

  if (type === "unknown") return { error: "unsupported_record_type" };

  if (typeof raw.startAt !== 'number' || raw.startAt <= 0) return { error: "invalid_timestamp" };
  if (raw.endAt !== undefined && (typeof raw.endAt !== 'number' || raw.endAt < raw.startAt)) {
    return { error: "end_before_start" };
  }

  let value = raw.value;
  let canonicalUnit: CanonicalUnit = "unknown";
  let warning: string | undefined;

  if (provider === "unknown") {
    warning = "Provider is unknown or unsupported, accepting with warnings.";
  }

  if (value !== undefined) {
    if (!Number.isFinite(value)) return { error: "non_finite_value" };

    if (raw.unit) {
      const converted = convertUnit(value, raw.unit, type);
      if (converted.error) {
         return { error: converted.error, message: `Incompatible unit: ${raw.unit} for ${type}` };
      }
      value = converted.value;
      canonicalUnit = converted.canonicalUnit;
    } else {
      warning = (warning ? warning + " " : "") + "Missing unit, accepted as raw value.";
    }

    const bounds = validateBounds(value, type);
    if (bounds === "below") return { error: "below_minimum", message: `Value ${value} is below physiological minimum for ${type}` };
    if (bounds === "above") return { error: "above_maximum", message: `Value ${value} is above physiological maximum for ${type}` };
  }

  let payload: SleepSessionPayload | WorkoutSessionPayload | undefined;
  if (type === "sleep_stages" || type === "sleep_session") {
    const sleepNorm = normalizeSleepStages(raw.payload, raw.startAt, raw.endAt);
    if (!sleepNorm && !value && type === "sleep_stages") return { error: "malformed_payload", message: "Invalid or missing sleep stages payload" };
    if (sleepNorm) {
       payload = sleepNorm;
    }
  } else if (type === "workout_session") {
    const workoutNorm = normalizeWorkout(raw.payload);
    if (workoutNorm) {
        payload = workoutNorm;
    }
  }

  if (value === undefined && payload === undefined) {
    return { error: "missing_value_and_payload", message: "Record must have a value or valid payload" };
  }

  const record: NormalizedRecord = {
    id: raw.id || `norm_${provider}_${raw.providerRecordId}`,
    provider,
    providerRecordId: raw.providerRecordId,
    type,
    startAt: raw.startAt,
    endAt: raw.endAt,
    timezoneOffset: raw.timezoneOffset,
    value,
    payload,
    canonicalUnit,
    originalUnit: raw.unit || "unknown",
    originalValue: raw.value,
    sourceDevice: raw.sourceDevice,
    sourceApp: raw.sourceApp,
    importedAt: options?.normalizedAt || Date.now(),
    updatedAt: raw.updatedAt,
    confidence: provider === "unknown" ? "low" : (raw.confidence || "unknown"),
    confirmation: raw.confirmation || "not-required",
    provenance: raw.provenance || "unknown",
    metadata: raw.metadata,
    revoked: raw.revoked,
  };

  return { record, warning };
}

export function normalizeBatch(records: RawRecord[], options?: NormalizeOptions): NormalizationResult {
  const result: NormalizationResult = { accepted: [], rejected: [], warnings: [] };

  if (!Array.isArray(records)) {
    result.rejected.push({ record: records, reason: "malformed_payload", message: "Batch payload must be an array" });
    return result;
  }

  for (const raw of records) {
    const { record, error, message, warning } = normalizeRecord(raw, options);
    if (error) {
      result.rejected.push({ record: raw, reason: error, message });
    } else if (record) {
      result.accepted.push(record);
      if (warning) {
        result.warnings.push({ record, warning });
      }
    }
  }

  return result;
}

export function validateBounds(value: number, type: WearableRecordType): "valid" | "below" | "above" {
  switch (type) {
    case "heart_rate":
    case "resting_heart_rate":
      if (value <= 0) return "below";
      if (value > 300) return "above";
      break;
    case "heart_rate_variability":
      if (value < 0) return "below";
      if (value > 500) return "above";
      break;
    case "steps":
      if (value < 0) return "below";
      break;
    case "active_calories":
    case "total_calories":
      if (value < 0) return "below";
      if (value > 20000) return "above";
      break;
    case "temperature": // celsius
      if (value <= 20) return "below";
      if (value >= 45) return "above";
      break;
    case "spo2":
      if (value < 0) return "below";
      if (value > 100) return "above";
      break;
    case "distance":
    case "elevation":
      if (value < 0) return "below";
      break;
    case "weight": // lb
      if (value <= 0) return "below";
      if (value > 1000) return "above";
      break;
    case "body_fat_percentage":
      if (value < 0) return "below";
      if (value > 100) return "above";
      break;
    case "respiratory_rate":
      if (value <= 0) return "below";
      if (value > 100) return "above";
      break;
    default:
      return "valid";
  }
  return "valid";
}
