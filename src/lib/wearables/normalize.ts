import { NormalizedRecord, WearableProvider, WearableRecordType, SleepStageRecord } from "./types";

export interface NormalizationResult {
  accepted: NormalizedRecord[];
  rejected: { record: any; reason: string }[];
  warnings: { record: NormalizedRecord; warning: string }[];
}

export interface RawRecord {
  id?: string;
  provider?: WearableProvider | string;
  providerRecordId?: string;
  type?: WearableRecordType | string;
  startAt?: number;
  endAt?: number;
  timezoneOffset?: number;
  value?: number;
  payload?: any;
  unit?: string;
  sourceDevice?: string;
  sourceApp?: string;
  confidence?: "high" | "medium" | "low" | "unknown";
  confirmation?: "confirmed" | "unconfirmed" | "not-required";
  provenance?: "direct" | "aggregator" | "manual" | "unknown";
  metadata?: Record<string, any>;
  updatedAt?: number;
  revoked?: boolean;
}

// Canonical unit choices:
// Heart rate: bpm
// HRV: ms
// Steps: count
// Calories: kcal
// Temperature: celsius
// SpO2: percentage
// Distance: meters
// Elevation: meters
// Weight: lb
// Body fat: percentage
// Sleep duration: ms

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

export function convertUnit(value: number, fromUnit: string, type: WearableRecordType): { value: number; canonicalUnit: string } | null {
  const u = fromUnit.toLowerCase();

  if (type === "weight") {
    if (u === "kg" || u === "kilogram" || u === "kilograms") return { value: value * 2.20462, canonicalUnit: "lb" };
    if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return { value, canonicalUnit: "lb" };
    return null;
  }
  if (type === "temperature") {
    if (u === "f" || u === "fahrenheit") return { value: (value - 32) * 5/9, canonicalUnit: "celsius" };
    if (u === "c" || u === "celsius") return { value, canonicalUnit: "celsius" };
    return null;
  }
  if (type === "distance" || type === "elevation") {
    if (u === "mi" || u === "mile" || u === "miles") return { value: value * 1609.34, canonicalUnit: "meters" };
    if (u === "km" || u === "kilometer" || u === "kilometers") return { value: value * 1000, canonicalUnit: "meters" };
    if (u === "m" || u === "meter" || u === "meters") return { value, canonicalUnit: "meters" };
    if (u === "ft" || u === "foot" || u === "feet") return { value: value * 0.3048, canonicalUnit: "meters" };
    return null;
  }
  if (type === "active_calories" || type === "total_calories") {
    if (u === "j" || u === "joule" || u === "joules") return { value: value / 4184, canonicalUnit: "kcal" };
    if (u === "kj" || u === "kilojoule") return { value: value / 4.184, canonicalUnit: "kcal" };
    if (u === "kcal" || u === "calorie" || u === "calories" || u === "cal") return { value, canonicalUnit: "kcal" };
    return null;
  }
  if (type === "heart_rate" || type === "resting_heart_rate") {
    if (u === "bpm" || u === "count/min") return { value, canonicalUnit: "bpm" };
    return null;
  }
  if (type === "heart_rate_variability") {
    if (u === "s" || u === "sec" || u === "seconds") return { value: value * 1000, canonicalUnit: "ms" };
    if (u === "ms" || u === "milliseconds") return { value, canonicalUnit: "ms" };
    return null;
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
    return null;
  }
  if (type === "steps") {
    if (u === "count" || u === "steps") return { value, canonicalUnit: "count" };
    return null;
  }
  if (type === "respiratory_rate") {
    if (u === "rpm" || u === "breaths/min") return { value, canonicalUnit: "rpm" };
    return null;
  }

  // fallback
  return { value, canonicalUnit: fromUnit };
}

function normalizeSleepStages(payload: any, sessionStart: number, sessionEnd?: number): { stages: SleepStageRecord[], totalDurationMs: number, hasOverlap: boolean } | null {
  if (!Array.isArray(payload)) return null;
  const stages: SleepStageRecord[] = [];

  for (const item of payload) {
    if (!item.stage || typeof item.start !== 'number' || typeof item.end !== 'number') continue;
    if (item.start >= item.end || item.start < 0 || item.end < 0) continue;

    // Bounds check with session if available
    if (sessionStart && item.start < sessionStart) continue;
    if (sessionEnd && item.end > sessionEnd) continue;

    // Normalize stage
    let s: SleepStage = "unknown";
    const rawStage = String(item.stage).toLowerCase();
    if (rawStage.includes("awake") || rawStage.includes("wake")) s = "awake";
    else if (rawStage.includes("light") || rawStage.includes("core")) s = "light";
    else if (rawStage.includes("deep")) s = "deep";
    else if (rawStage.includes("rem")) s = "rem";

    stages.push({ stage: s, start: item.start, end: item.end });
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

function normalizeWorkout(payload: any): any {
  if (!payload || typeof payload !== 'object') return null;
  return {
    workoutType: payload.workoutType ? String(payload.workoutType).toLowerCase() : "unknown",
    duration: typeof payload.duration === 'number' && payload.duration > 0 ? payload.duration : undefined,
    distance: typeof payload.distance === 'number' && payload.distance >= 0 ? payload.distance : undefined,
    calories: typeof payload.calories === 'number' && payload.calories >= 0 ? payload.calories : undefined,
    averageHeartRate: typeof payload.averageHeartRate === 'number' && payload.averageHeartRate > 0 ? payload.averageHeartRate : undefined,
  };
}

export function normalizeRecord(raw: RawRecord): { record?: NormalizedRecord, error?: string, warning?: string } {
  if (!raw.id && !raw.providerRecordId) return { error: "Missing record ID" };
  const provider = parseProvider(raw.provider);
  const type = parseRecordType(raw.type);

  if (provider === "unknown") return { error: "Unknown or missing provider" };
  if (type === "unknown") return { error: "Unknown or missing record type" };

  if (typeof raw.startAt !== 'number' || raw.startAt <= 0) return { error: "Invalid start timestamp" };
  if (raw.endAt !== undefined && (typeof raw.endAt !== 'number' || raw.endAt < raw.startAt)) {
    return { error: "Invalid end timestamp" };
  }

  let value = raw.value;
  let canonicalUnit = raw.unit || "unknown";
  let warning: string | undefined;

  if (value !== undefined) {
    if (!Number.isFinite(value)) return { error: "Non-finite value" };

    if (raw.unit) {
      const converted = convertUnit(value, raw.unit, type);
      if (converted) {
        value = converted.value;
        canonicalUnit = converted.canonicalUnit;
      } else {
        warning = `Incompatible or unknown unit: ${raw.unit}`;
      }
    }

    if (!validateBounds(value, type)) {
      return { error: `Value ${value} is out of physiological bounds for ${type}` };
    }
  }

  let payload = raw.payload;
  if (type === "sleep_stages") {
    const sleepNorm = normalizeSleepStages(raw.payload, raw.startAt, raw.endAt);
    if (!sleepNorm && !value) return { error: "Invalid or missing sleep stages payload" };
    if (sleepNorm) {
       payload = {
         stages: sleepNorm.stages,
         totalDurationMs: sleepNorm.totalDurationMs,
         hasOverlap: sleepNorm.hasOverlap
       };
    } else {
       payload = undefined;
    }
  } else if (type === "workout_session") {
    payload = normalizeWorkout(raw.payload);
  }

  if (value === undefined && payload === undefined) {
    return { error: "Record must have a value or valid payload" };
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
    importedAt: Date.now(),
    updatedAt: raw.updatedAt,
    confidence: raw.confidence || "unknown",
    confirmation: raw.confirmation || "not-required",
    provenance: raw.provenance || "unknown",
    metadata: raw.metadata,
    revoked: raw.revoked,
  };

  return { record, warning };
}

export function normalizeBatch(records: RawRecord[]): NormalizationResult {
  const result: NormalizationResult = { accepted: [], rejected: [], warnings: [] };

  if (!Array.isArray(records)) {
    result.rejected.push({ record: records, reason: "Batch payload must be an array" });
    return result;
  }

  for (const raw of records) {
    const { record, error, warning } = normalizeRecord(raw);
    if (error) {
      result.rejected.push({ record: raw, reason: error });
    } else if (record) {
      result.accepted.push(record);
      if (warning) {
        result.warnings.push({ record, warning });
      }
    }
  }

  return result;
}

export function validateBounds(value: number, type: WearableRecordType): boolean {
  if (!Number.isFinite(value)) return false;

  switch (type) {
    case "heart_rate":
    case "resting_heart_rate":
      return value > 0 && value < 300;
    case "heart_rate_variability":
      return value >= 0 && value < 500;
    case "steps":
      return value >= 0;
    case "active_calories":
    case "total_calories":
      return value >= 0 && value < 20000;
    case "temperature": // celsius
      return value > 20 && value < 45;
    case "spo2":
      return value >= 0 && value <= 100;
    case "distance":
    case "elevation":
      return value >= 0;
    case "weight": // lb
      return value > 0 && value < 1000;
    case "body_fat_percentage":
      return value >= 0 && value <= 100;
    case "respiratory_rate":
      return value > 0 && value < 100;
    default:
      return true;
  }
}
