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

export type CanonicalUnit =
  | "bpm"
  | "ms"
  | "count"
  | "kcal"
  | "celsius"
  | "percentage"
  | "meters"
  | "lb"
  | "rpm"
  | "unknown";

export type UnitCategory =
  | "weight"
  | "distance"
  | "temperature"
  | "energy"
  | "duration"
  | "percentage"
  | "heart_rate"
  | "respiratory_rate"
  | "steps";

export type SleepStage = "awake" | "light" | "deep" | "rem" | "unknown";

export interface SleepStageRecord {
  stage: SleepStage;
  start: number; // timestamp ms
  end: number; // timestamp ms
}

export interface SleepSessionPayload {
  stages?: SleepStageRecord[];
  totalDurationMs?: number;
  hasOverlap?: boolean;
}

export interface WorkoutSessionPayload {
  workoutType: string;
  duration?: number;
  distance?: number;
  calories?: number;
  averageHeartRate?: number;
}

export type RecordPayload = SleepSessionPayload | WorkoutSessionPayload | Record<string, unknown> | undefined;

export type RejectionReason =
  | "non_finite_value"
  | "unsupported_unit"
  | "incompatible_unit"
  | "below_minimum"
  | "above_maximum"
  | "invalid_timestamp"
  | "end_before_start"
  | "stage_outside_session"
  | "malformed_payload"
  | "unsupported_record_type"
  | "missing_record_id"
  | "missing_value_and_payload";

export interface RejectedRecord {
  record: unknown; // Need to use unknown because raw input can be anything
  reason: RejectionReason;
  message?: string;
}

export interface WarningRecord {
  record: NormalizedRecord;
  warning: string;
}

export type ResolutionType =
  | "keep-existing"
  | "replace-existing"
  | "merge"
  | "keep-both"
  | "mark-conflict"
  | "revoke-existing";

export interface DeduplicationResolution {
  kind: "duplicate";
  type: ResolutionType;
  recordType: WearableRecordType;
  existingId: string;
  incomingId: string;
  droppedRecordIds?: string[];
  mergedRecord?: NormalizedRecord;
  reason: string;
  manualProtectionApplied?: boolean;
  directProviderPreferenceApplied?: boolean;
}

export interface WearableConflict {
  kind: "conflict";
  involvedIds: string[];
  recordType: WearableRecordType;
  conflictType: "overlapping_session" | "material_difference";
  overlapMs?: number;
  reason: string;
  recommendedAction: "keep_both" | "review" | "merge_manually";
}

export type DuplicateEvaluation = DeduplicationResolution | WearableConflict | null;

export interface DeduplicationResult {
  records: NormalizedRecord[];
  resolutions: DeduplicationResolution[];
  conflicts: WearableConflict[];
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
  payload?: RecordPayload;
  canonicalUnit: CanonicalUnit;
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
  metadata?: Record<string, unknown>;

  // State
  revoked?: boolean; // if source record was deleted/revoked
}
