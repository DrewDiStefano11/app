export const ANALYTICS_SCHEMA_VERSION = "1.1.0";
export const ANALYTICS_ENGINE_VERSION = "2.0.0";
export const ANALYTICS_PHASE = 2;
export const ANALYTICS_GENERATED_BY = "fitcore-analytics";

export type AnalyticsVersionMetadata = {
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  engineVersion: typeof ANALYTICS_ENGINE_VERSION;
  phase: typeof ANALYTICS_PHASE;
  generatedBy: typeof ANALYTICS_GENERATED_BY;
};

/** Returns stable engine metadata as a fresh object so callers cannot mutate shared state. */
export function getAnalyticsVersionMetadata(): AnalyticsVersionMetadata {
  return {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    engineVersion: ANALYTICS_ENGINE_VERSION,
    phase: ANALYTICS_PHASE,
    generatedBy: ANALYTICS_GENERATED_BY,
  };
}
