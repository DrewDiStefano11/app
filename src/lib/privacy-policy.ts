import {
  DataCategory,
  PartialPrivacyPolicy,
  PrivacyPolicy,
  getImmutableDefaultPolicy,
  getAllImmutableDefaultPolicies,
} from "./privacy-policy-defaults";

export type DataUseAction =
  | "store"
  | "remember"
  | "ai_context"
  | "sync"
  | "export"
  | "delete"
  | "display_source";

export type DataSource =
  | "manual"
  | "jarvis"
  | "import"
  | "wearable"
  | "system";

export interface DataUseDecision {
  allowed: boolean;
  reason: string;
  rule: string;
}

export interface WhyDoYouKnowThisModel {
  category: DataCategory;
  categoryLabel: string;
  source: DataSource | "hidden";
  isSourceVisible: boolean;
  isLocalOnly: boolean;
  mayBeInAiContext: boolean;
  mayBeRemembered: boolean;
  mayBeSynced: boolean;
  requiresExplicitConsent: boolean;
  requiresSensitiveUnlock: boolean;
  userSuppliedConsent: boolean;
  userSuppliedUnlock: boolean;
  allowedRules: string[];
  deniedRules: string[];
  explanation: string;
}

const CATEGORY_LABELS: Record<DataCategory, string> = {
  basic_profile: "Basic Profile",
  goals: "Goals",
  training_history: "Training History",
  active_workout: "Active Workout",
  nutrition_history: "Nutrition History",
  recovery_check_ins: "Recovery Check-ins",
  sleep: "Sleep",
  bodyweight: "Bodyweight",
  body_measurements: "Body Measurements",
  medical_history: "Medical History",
  allergies: "Allergies",
  medications: "Medications",
  conditions: "Conditions",
  surgeries: "Surgeries",
  emergency_contacts: "Emergency Contacts",
  progress_photos: "Progress Photos",
  conversations: "Conversations",
  ai_memories: "AI Memories",
  wearable_data: "Wearable Data",
  location: "Location",
  imported_records: "Imported Records"
};

export function isValidCategory(category: string): category is DataCategory {
  return category in CATEGORY_LABELS;
}

export function validateOverride(category: DataCategory, override: unknown): PartialPrivacyPolicy {
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return {};
  }

  const defaultPolicy = getImmutableDefaultPolicy(category);
  const safeOverride: PartialPrivacyPolicy = {};
  const recordOverride = override as Record<string, unknown>;

  if (typeof recordOverride.enabled === "boolean") safeOverride.enabled = recordOverride.enabled;
  if (typeof recordOverride.memoryAllowed === "boolean") safeOverride.memoryAllowed = recordOverride.memoryAllowed;
  if (typeof recordOverride.aiUseAllowed === "boolean") safeOverride.aiUseAllowed = recordOverride.aiUseAllowed;
  if (typeof recordOverride.localOnly === "boolean") safeOverride.localOnly = recordOverride.localOnly;
  if (typeof recordOverride.cloudSyncAllowed === "boolean") safeOverride.cloudSyncAllowed = recordOverride.cloudSyncAllowed;
  if (typeof recordOverride.exportAllowed === "boolean") safeOverride.exportAllowed = recordOverride.exportAllowed;
  if (typeof recordOverride.deletionAllowed === "boolean") safeOverride.deletionAllowed = recordOverride.deletionAllowed;
  if (typeof recordOverride.requiresSensitiveUnlock === "boolean") safeOverride.requiresSensitiveUnlock = recordOverride.requiresSensitiveUnlock;
  if (typeof recordOverride.requiresExplicitConsent === "boolean") safeOverride.requiresExplicitConsent = recordOverride.requiresExplicitConsent;

  if (typeof recordOverride.retentionMode === "string" && ["persistent", "session-only", "reduced-history", "disabled"].includes(recordOverride.retentionMode)) {
    safeOverride.retentionMode = recordOverride.retentionMode as "persistent" | "session-only" | "reduced-history" | "disabled";
  }

  if (typeof recordOverride.sourceVisibility === "string" && ["always", "on-request", "hidden"].includes(recordOverride.sourceVisibility)) {
    safeOverride.sourceVisibility = recordOverride.sourceVisibility as "always" | "on-request" | "hidden";
  }

  if (typeof recordOverride.reasonVisibility === "string" && ["always", "on-request", "hidden"].includes(recordOverride.reasonVisibility)) {
    safeOverride.reasonVisibility = recordOverride.reasonVisibility as "always" | "on-request" | "hidden";
  }

  if (defaultPolicy.requiresSensitiveUnlock) {
    safeOverride.requiresSensitiveUnlock = true;
  }
  if (defaultPolicy.requiresExplicitConsent) {
    safeOverride.requiresExplicitConsent = true;
  }
  if (defaultPolicy.localOnly) {
    safeOverride.localOnly = true;
  }

  return safeOverride;
}

export function getEffectivePolicy(category: DataCategory, override: unknown = {}): PrivacyPolicy {
  const defaultPolicy = getImmutableDefaultPolicy(category);
  const validOverride = validateOverride(category, override);

  const effective = { ...defaultPolicy, ...validOverride };

  if (!effective.enabled) {
    effective.memoryAllowed = false;
    effective.aiUseAllowed = false;
    effective.cloudSyncAllowed = false;
    effective.exportAllowed = false;
    effective.retentionMode = "disabled";
  }

  if (effective.localOnly) {
    effective.cloudSyncAllowed = false;
  }

  return effective;
}

export function decideDataUse(
  category: DataCategory,
  action: DataUseAction,
  override: unknown = {},
  hasConsent: boolean = false,
  isUnlocked: boolean = false
): DataUseDecision {
  if (!isValidCategory(category)) {
    return { allowed: false, reason: "Unknown category", rule: "unknown_category_denied" };
  }

  const policy = getEffectivePolicy(category, override);

  if (!policy.enabled && action !== "delete") {
    return { allowed: false, reason: "Category is disabled", rule: "category_disabled" };
  }

  if (policy.requiresSensitiveUnlock && !isUnlocked && action !== "delete" && action !== "store") {
    return { allowed: false, reason: "Sensitive category requires unlock", rule: "sensitive_unlock_required" };
  }

  switch (action) {
    case "store":
      return { allowed: true, reason: "Storage allowed", rule: "storage_allowed" };

    case "remember":
      if (!policy.memoryAllowed || policy.retentionMode === "disabled") {
        return { allowed: false, reason: "Memory is disabled for this category", rule: "memory_disabled" };
      }
      if (policy.requiresExplicitConsent && !hasConsent) {
        return { allowed: false, reason: "Explicit consent required for memory", rule: "consent_required" };
      }
      return { allowed: true, reason: "Memory allowed", rule: "memory_allowed" };

    case "ai_context":
      if (!policy.aiUseAllowed) {
        return { allowed: false, reason: "AI use is disabled for this category", rule: "ai_use_disabled" };
      }
      if (policy.requiresExplicitConsent && !hasConsent) {
        return { allowed: false, reason: "Explicit consent required for AI use", rule: "consent_required" };
      }
      return { allowed: true, reason: "AI context allowed", rule: "ai_context_allowed" };

    case "sync":
      if (policy.localOnly) {
        return { allowed: false, reason: "Category is local-only", rule: "local_only_enforced" };
      }
      if (!policy.cloudSyncAllowed) {
        return { allowed: false, reason: "Cloud sync is disabled", rule: "cloud_sync_disabled" };
      }
      if (policy.requiresExplicitConsent && !hasConsent) {
        return { allowed: false, reason: "Explicit consent required for cloud sync", rule: "consent_required" };
      }
      return { allowed: true, reason: "Cloud sync allowed", rule: "cloud_sync_allowed" };

    case "export":
      if (!policy.exportAllowed) {
        return { allowed: false, reason: "Export is disabled", rule: "export_disabled" };
      }
      return { allowed: true, reason: "Export allowed", rule: "export_allowed" };

    case "delete":
      if (!policy.deletionAllowed) {
        return { allowed: false, reason: "Deletion is disabled by policy", rule: "deletion_disabled" };
      }
      return { allowed: true, reason: "Deletion is permitted", rule: "deletion_allowed" };

    case "display_source":
      if (policy.sourceVisibility === "hidden") {
        return { allowed: false, reason: "Source visibility is hidden", rule: "source_hidden" };
      }
      if (policy.sourceVisibility === "on-request" && !isUnlocked) {
        return { allowed: false, reason: "Source visibility requires unlock", rule: "source_on_request_locked" };
      }
      return { allowed: true, reason: "Source visibility allowed", rule: "source_visible" };

    default:
      return { allowed: false, reason: "Unknown action", rule: "unknown_action" };
  }
}

export function explainWhyYouKnowThis(
  category: DataCategory,
  source: DataSource,
  override: unknown = {},
  hasConsent: boolean = false,
  isUnlocked: boolean = false
): WhyDoYouKnowThisModel {
  const policy = getEffectivePolicy(category, override);

  const isReasonVisible = policy.reasonVisibility === "always" || (policy.reasonVisibility === "on-request" && isUnlocked);

  // Use decideDataUse for display_source to enforce all constraints (like disabled category blocking source)
  const isSourceVisible = decideDataUse(category, "display_source", override, hasConsent, isUnlocked).allowed;

  let explanation = "";
  if (!isReasonVisible) {
    explanation = policy.reasonVisibility === "hidden"
      ? "Data usage explanation is hidden by privacy rules."
      : "Data usage explanation requires sensitive unlock.";
  } else {
    explanation = `Data in category ${CATEGORY_LABELS[category]} is currently ${policy.enabled ? 'enabled' : 'disabled'}.`;
  }

  const rules: string[] = [];
  const deniedRules: string[] = [];

  if (isReasonVisible) {
    if (policy.enabled) rules.push("category_enabled"); else deniedRules.push("category_disabled");
    if (policy.memoryAllowed) rules.push("memory_allowed"); else deniedRules.push("memory_disabled");
    if (policy.aiUseAllowed) rules.push("ai_use_allowed"); else deniedRules.push("ai_use_disabled");
    if (policy.localOnly) rules.push("local_only"); else rules.push("cloud_capable");
    if (policy.requiresExplicitConsent) {
      if (hasConsent) rules.push("consent_granted"); else deniedRules.push("consent_required");
    }
    if (policy.requiresSensitiveUnlock) {
      if (isUnlocked) rules.push("sensitive_unlocked"); else deniedRules.push("sensitive_unlock_required");
    }
  }

  return {
    category,
    categoryLabel: CATEGORY_LABELS[category],
    source: isSourceVisible ? source : "hidden",
    isSourceVisible,
    isLocalOnly: policy.localOnly,
    mayBeInAiContext: decideDataUse(category, "ai_context", override, hasConsent, isUnlocked).allowed,
    mayBeRemembered: decideDataUse(category, "remember", override, hasConsent, isUnlocked).allowed,
    mayBeSynced: decideDataUse(category, "sync", override, hasConsent, isUnlocked).allowed,
    requiresExplicitConsent: policy.requiresExplicitConsent,
    requiresSensitiveUnlock: policy.requiresSensitiveUnlock,
    userSuppliedConsent: hasConsent,
    userSuppliedUnlock: isUnlocked,
    allowedRules: rules,
    deniedRules,
    explanation,
  };
}

export function getDefaultPolicies(): Record<DataCategory, PrivacyPolicy> {
  return getAllImmutableDefaultPolicies();
}

export function applyOverrides(
  overrides: Record<string, unknown>
): Record<DataCategory, PrivacyPolicy> {
  const result = {} as Record<DataCategory, PrivacyPolicy>;
  const categories = Object.keys(getAllImmutableDefaultPolicies()) as DataCategory[];
  categories.sort().forEach((cat) => {
    result[cat] = getEffectivePolicy(cat, overrides[cat]);
  });
  return result;
}

export function resetCategory(category: DataCategory): PrivacyPolicy {
  if (!isValidCategory(category)) {
    throw new Error(`Unknown category: ${category}`);
  }
  return getImmutableDefaultPolicy(category);
}

export function resetAll(): Record<DataCategory, PrivacyPolicy> {
  const result = {} as Record<DataCategory, PrivacyPolicy>;
  const categories = Object.keys(getAllImmutableDefaultPolicies()) as DataCategory[];
  categories.sort().forEach((cat) => {
    result[cat] = getImmutableDefaultPolicy(cat);
  });
  return result;
}

export function getCategoriesForAI(overrides: Record<string, unknown> = {}, hasConsent: boolean = false, isUnlocked: boolean = false): DataCategory[] {
  const allowed: DataCategory[] = [];
  const categories = Object.keys(getAllImmutableDefaultPolicies()) as DataCategory[];
  categories.sort().forEach((cat) => {
    const decision = decideDataUse(cat, "ai_context", overrides[cat], hasConsent, isUnlocked);
    if (decision.allowed) {
      allowed.push(cat);
    }
  });
  return allowed;
}

export function getCategoriesForExport(overrides: Record<string, unknown> = {}, hasConsent: boolean = false, isUnlocked: boolean = false): DataCategory[] {
  const allowed: DataCategory[] = [];
  const categories = Object.keys(getAllImmutableDefaultPolicies()) as DataCategory[];
  categories.sort().forEach((cat) => {
    const decision = decideDataUse(cat, "export", overrides[cat], hasConsent, isUnlocked);
    if (decision.allowed) {
      allowed.push(cat);
    }
  });
  return allowed;
}

export function getCategoriesRequiringConsent(): DataCategory[] {
  const required: DataCategory[] = [];
  const policies = getAllImmutableDefaultPolicies();
  const categories = Object.keys(policies) as DataCategory[];
  categories.sort().forEach((cat) => {
    if (policies[cat].requiresExplicitConsent) {
      required.push(cat);
    }
  });
  return required;
}

export function getLocalOnlyCategories(overrides: Record<string, unknown> = {}): DataCategory[] {
  const localOnly: DataCategory[] = [];
  const categories = Object.keys(getAllImmutableDefaultPolicies()) as DataCategory[];
  categories.sort().forEach((cat) => {
    const policy = getEffectivePolicy(cat, overrides[cat]);
    if (policy.localOnly) {
      localOnly.push(cat);
    }
  });
  return localOnly;
}

export interface DeletionPlanEntry {
  category: string;
  requiresConfirmation: boolean;
  requiresSensitiveUnlock: boolean;
  reason: string;
}

export function generateDeletionPlan(overrides: Record<string, unknown> = {}): DeletionPlanEntry[] {
  const plan: DeletionPlanEntry[] = [];

  // Handle known categories
  const categories = Object.keys(getAllImmutableDefaultPolicies()) as DataCategory[];
  categories.sort().forEach((cat) => {
    const policy = getEffectivePolicy(cat, overrides[cat]);

    if (policy.deletionAllowed) {
      plan.push({
        category: cat,
        requiresConfirmation: policy.requiresSensitiveUnlock || policy.requiresExplicitConsent,
        requiresSensitiveUnlock: policy.requiresSensitiveUnlock,
        reason: policy.requiresSensitiveUnlock ? "Sensitive unlock required to confirm deletion." : "Standard deletion confirmation."
      });
    }
  });

  // Handle unknown categories passed in overrides deterministically
  const knownKeys = new Set(categories);
  const unknownKeys = Object.keys(overrides).filter(k => !knownKeys.has(k as DataCategory)).sort();
  unknownKeys.forEach(cat => {
    plan.push({
      category: cat,
      requiresConfirmation: true, // Fail-safe
      requiresSensitiveUnlock: true, // Fail-safe
      reason: "Unknown category treated with maximum safety restrictions."
    });
  });

  return plan;
}

export interface ExportPlan {
  included: DataCategory[];
  excluded: DataCategory[];
  exclusionReasons: Record<string, string>;
}

export function generateExportPlan(overrides: Record<string, unknown> = {}, requestCategories?: string[], hasConsent: boolean = false, isUnlocked: boolean = false): ExportPlan {
  const included: DataCategory[] = [];
  const excluded: DataCategory[] = [];
  const exclusionReasons: Record<string, string> = {};

  const defaultPolicies = getAllImmutableDefaultPolicies();
  let categoriesToEvaluate = Object.keys(defaultPolicies) as DataCategory[];

  if (requestCategories) {
    categoriesToEvaluate = requestCategories.filter(isValidCategory);

    // Explicitly reject unknown requested categories
    requestCategories.filter(c => !isValidCategory(c)).sort().forEach(cat => {
      excluded.push(cat as DataCategory); // Add to excluded list even if invalid, to report denial
      exclusionReasons[cat] = "Unknown category denied for export.";
    });
  }

  categoriesToEvaluate.sort().forEach((cat) => {
    const decision = decideDataUse(cat, "export", overrides[cat], hasConsent, isUnlocked);
    if (decision.allowed) {
      included.push(cat);
    } else {
      excluded.push(cat);
      exclusionReasons[cat] = decision.reason;
    }
  });

  return { included, excluded, exclusionReasons };
}
