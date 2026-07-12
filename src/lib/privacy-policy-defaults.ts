export type DataCategory =
  | "basic_profile"
  | "goals"
  | "training_history"
  | "active_workout"
  | "nutrition_history"
  | "recovery_check_ins"
  | "sleep"
  | "bodyweight"
  | "body_measurements"
  | "medical_history"
  | "allergies"
  | "medications"
  | "conditions"
  | "surgeries"
  | "emergency_contacts"
  | "progress_photos"
  | "conversations"
  | "ai_memories"
  | "wearable_data"
  | "location"
  | "imported_records";

export type RetentionMode = "persistent" | "session-only" | "reduced-history" | "disabled";

export type SourceVisibility = "always" | "on-request" | "hidden";

export interface PrivacyPolicy {
  enabled: boolean;
  memoryAllowed: boolean;
  aiUseAllowed: boolean;
  localOnly: boolean;
  cloudSyncAllowed: boolean;
  exportAllowed: boolean;
  deletionAllowed: boolean;
  requiresSensitiveUnlock: boolean;
  requiresExplicitConsent: boolean;
  retentionMode: RetentionMode;
  sourceVisibility: SourceVisibility;
  reasonVisibility: SourceVisibility;
}

export type PartialPrivacyPolicy = Partial<PrivacyPolicy>;

const _DEFAULT_PRIVACY_POLICIES: Record<DataCategory, PrivacyPolicy> = {
  basic_profile: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  goals: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  training_history: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  active_workout: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: true,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: false,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "session-only",
    sourceVisibility: "hidden",
    reasonVisibility: "hidden",
  },
  nutrition_history: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  recovery_check_ins: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  sleep: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  bodyweight: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  body_measurements: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  medical_history: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "on-request",
    reasonVisibility: "on-request",
  },
  allergies: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "on-request",
    reasonVisibility: "on-request",
  },
  medications: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "on-request",
    reasonVisibility: "on-request",
  },
  conditions: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "on-request",
    reasonVisibility: "on-request",
  },
  surgeries: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "on-request",
    reasonVisibility: "on-request",
  },
  emergency_contacts: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: false,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "hidden",
    reasonVisibility: "hidden",
  },
  progress_photos: {
    enabled: true,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "hidden",
    reasonVisibility: "hidden",
  },
  conversations: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  ai_memories: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  wearable_data: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: false,
    cloudSyncAllowed: true,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: false,
    requiresExplicitConsent: false,
    retentionMode: "reduced-history",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
  location: {
    enabled: false,
    memoryAllowed: false,
    aiUseAllowed: false,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: false,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "disabled",
    sourceVisibility: "hidden",
    reasonVisibility: "hidden",
  },
  imported_records: {
    enabled: true,
    memoryAllowed: true,
    aiUseAllowed: true,
    localOnly: true,
    cloudSyncAllowed: false,
    exportAllowed: true,
    deletionAllowed: true,
    requiresSensitiveUnlock: true,
    requiresExplicitConsent: true,
    retentionMode: "persistent",
    sourceVisibility: "always",
    reasonVisibility: "always",
  },
};

export function getImmutableDefaultPolicy(category: DataCategory): PrivacyPolicy {
  return { ..._DEFAULT_PRIVACY_POLICIES[category] };
}

export function getAllImmutableDefaultPolicies(): Record<DataCategory, PrivacyPolicy> {
  const cloned = {} as Record<DataCategory, PrivacyPolicy>;
  for (const key of Object.keys(_DEFAULT_PRIVACY_POLICIES) as DataCategory[]) {
    cloned[key] = { ..._DEFAULT_PRIVACY_POLICIES[key] };
  }
  return cloned;
}
