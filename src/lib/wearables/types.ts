export type WearableProvider =
  | "apple-health"
  | "health-connect"
  | "whoop"
  | "garmin"
  | "fitbit"
  | "oura"
  | "manual"
  | "unknown";

export type WearableRecordType =
  | "heart_rate"
  | "resting_heart_rate"
  | "heart_rate_variability"
  | "steps"
  | "active_calories"
  | "total_calories"
  | "sleep_session"
  | "sleep_stages"
  | "respiratory_rate"
  | "temperature"
  | "spo2"
  | "workout_session"
  | "distance"
  | "elevation"
  | "weight"
  | "body_fat_percentage"
  | "unknown";

export type SleepStage = "awake" | "light" | "deep" | "rem" | "unknown";

export interface SleepStageRecord {
  stage: SleepStage;
  start: number; // timestamp ms
  end: number; // timestamp ms
}

export type ResolutionType =
  | "keep-existing"
  | "replace-existing"
  | "merge"
  | "keep-both"
  | "mark-conflict"
  | "revoke-existing";

export interface DeduplicationResolution {
  type: ResolutionType;
  existingId?: string;
  incomingId?: string;
  mergedRecord?: NormalizedRecord;
  reason: string;
}

export interface NormalizedRecord {
  // Core identification
  id: string; // Stable normalized ID
  provider: WearableProvider;
  providerRecordId?: string;

  // Data type & temporal
  type: WearableRecordType;
  startAt: number; // ms timestamp
  endAt?: number; // ms timestamp, if applicable
  timezoneOffset?: number; // minutes from UTC, if available

  // Value & Unit
  value?: number;
  payload?: any; // For structured payloads like sleep stages or workout data
  canonicalUnit: string;
  originalUnit: string;
  originalValue?: number;

  // Provenance & Metadata
  sourceDevice?: string; // Direct device (e.g. Apple Watch)
  sourceApp?: string; // e.g. "Apple Health" or aggregator
  importedAt: number;
  updatedAt?: number;
  confidence?: "high" | "medium" | "low" | "unknown";
  confirmation?: "confirmed" | "unconfirmed" | "not-required";
  provenance: "direct" | "aggregator" | "manual" | "unknown";
  metadata?: Record<string, any>;

  // State
  revoked?: boolean; // if source record was deleted/revoked
}

export type UnitCategory =
  | "weight"
  | "distance"
  | "temperature"
  | "energy"
  | "duration"
  | "percentage";
