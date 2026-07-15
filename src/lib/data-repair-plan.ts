import {
  FITCORE_DATA_INTEGRITY_POLICY,
  validateFitCoreDataIntegrity,
  type DataIntegrityIssue,
  type DataIntegrityIssueCode,
  type DataIntegritySeverity,
  type DataIntegrityStatus,
} from "./data-integrity";

export const FITCORE_DATA_REPAIR_PLAN_POLICY = "fitcore_data_repair_plan_v1" as const;

export type DataRepairPlanStatus =
  | "no_action"
  | "review_required"
  | "actions_proposed"
  | "invalid_input";

export type DataRepairPlanDisposition =
  | "proposed_action"
  | "manual_review"
  | "informational"
  | "blocked";

export type DataRepairPlanSafety =
  | "non_destructive"
  | "potentially_destructive"
  | "requires_domain_decision"
  | "not_actionable";

export type FitCoreDataRepairActionCode =
  | "remove_unknown_field"
  | "quarantine_malformed_record"
  | "resolve_duplicate_identifier"
  | "clear_or_relink_reference"
  | "review_missing_required_value"
  | "review_invalid_field_value"
  | "review_invalid_timestamp"
  | "review_invalid_time_order"
  | "review_cross_collection_identifier"
  | "review_root_structure";

export interface DataRepairPlanIssueAttribution {
  readonly policy: typeof FITCORE_DATA_INTEGRITY_POLICY;
  readonly issueKey: string;
  readonly issueCode: DataIntegrityIssueCode;
  readonly severity: DataIntegritySeverity;
  readonly path: string;
  readonly relatedPaths: readonly string[];
}

export interface DataRepairPlanEntry {
  readonly entryId: string;
  readonly disposition: DataRepairPlanDisposition;
  readonly action: FitCoreDataRepairActionCode;
  readonly safety: DataRepairPlanSafety;
  readonly requiresUserConfirmation: boolean;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly source: DataRepairPlanIssueAttribution;
}

export interface DataRepairPlanSummary {
  readonly totalEntries: number;
  readonly proposedActionCount: number;
  readonly manualReviewCount: number;
  readonly informationalCount: number;
  readonly blockedCount: number;
  readonly confirmationRequiredCount: number;
  readonly nonDestructiveCount: number;
  readonly potentiallyDestructiveCount: number;
  readonly domainDecisionCount: number;
  readonly notActionableCount: number;
}

export interface FitCoreDataRepairPlan {
  readonly policy: typeof FITCORE_DATA_REPAIR_PLAN_POLICY;
  readonly integrityPolicy: typeof FITCORE_DATA_INTEGRITY_POLICY;
  readonly status: DataRepairPlanStatus;
  readonly integrityStatus: DataIntegrityStatus;
  readonly integrityIssueCount: number;
  readonly summary: DataRepairPlanSummary;
  readonly entries: readonly DataRepairPlanEntry[];
}

interface IssuePlanMapping {
  readonly disposition: DataRepairPlanDisposition;
  readonly action: FitCoreDataRepairActionCode;
  readonly safety: DataRepairPlanSafety;
  readonly requiresUserConfirmation: boolean;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
}

const REPLACEMENT_UNKNOWN = "repair_plan.limitation.replacement_value_unknown";
const NO_AUTOMATIC_CHANGE = "repair_plan.limitation.automatic_change_not_permitted";

const ISSUE_PLAN_MAPPING: Readonly<Record<DataIntegrityIssueCode, IssuePlanMapping>> = {
  invalid_root: {
    disposition: "blocked",
    action: "review_root_structure",
    safety: "not_actionable",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.invalid_root",
    limitationKeys: ["repair_plan.limitation.replacement_root_unknown", NO_AUTOMATIC_CHANGE],
  },
  missing_required_top_level_field: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.missing_required_top_level_field",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.default_not_inferred"],
  },
  invalid_top_level_type: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.invalid_top_level_type",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.coercion_not_permitted"],
  },
  unknown_top_level_field: {
    disposition: "proposed_action",
    action: "remove_unknown_field",
    safety: "potentially_destructive",
    requiresUserConfirmation: true,
    reasonKey: "repair_plan.reason.unknown_field",
    limitationKeys: ["repair_plan.limitation.unknown_content_not_copied"],
  },
  malformed_record: {
    disposition: "proposed_action",
    action: "quarantine_malformed_record",
    safety: "potentially_destructive",
    requiresUserConfirmation: true,
    reasonKey: "repair_plan.reason.malformed_record",
    limitationKeys: [
      "repair_plan.limitation.repaired_shape_unknown",
      "repair_plan.limitation.quarantine_not_executed",
    ],
  },
  partial_record: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.partial_record",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.record_not_rebuilt"],
  },
  missing_required_field: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.missing_required_field",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.default_not_inferred"],
  },
  invalid_field_type: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.invalid_field_type",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.coercion_not_permitted"],
  },
  empty_required_string: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.empty_required_string",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.text_not_invented"],
  },
  empty_id: {
    disposition: "manual_review",
    action: "review_missing_required_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.empty_identifier",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.identifier_not_generated"],
  },
  duplicate_id: {
    disposition: "proposed_action",
    action: "resolve_duplicate_identifier",
    safety: "potentially_destructive",
    requiresUserConfirmation: true,
    reasonKey: "repair_plan.reason.duplicate_identifier",
    limitationKeys: [
      "repair_plan.limitation.duplicate_winner_unknown",
      "repair_plan.limitation.merge_not_permitted",
    ],
  },
  duplicate_id_cross_collection: {
    disposition: "informational",
    action: "review_cross_collection_identifier",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.cross_collection_identifier",
    limitationKeys: [
      "repair_plan.limitation.cross_collection_reuse_may_be_valid",
      NO_AUTOMATIC_CHANGE,
    ],
  },
  invalid_timestamp: {
    disposition: "manual_review",
    action: "review_invalid_timestamp",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.invalid_timestamp",
    limitationKeys: [
      "repair_plan.limitation.timestamp_substitute_unknown",
      "repair_plan.limitation.current_time_not_used",
    ],
  },
  invalid_time_order: {
    disposition: "manual_review",
    action: "review_invalid_time_order",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.invalid_time_order",
    limitationKeys: ["repair_plan.limitation.timestamp_order_intent_unknown", NO_AUTOMATIC_CHANGE],
  },
  non_finite_number: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.non_finite_number",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.numeric_coercion_not_permitted"],
  },
  prohibited_negative_value: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.prohibited_negative_value",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.clamping_not_permitted"],
  },
  out_of_range_value: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.out_of_range_value",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.clamping_not_permitted"],
  },
  invalid_enum_value: {
    disposition: "manual_review",
    action: "review_invalid_field_value",
    safety: "requires_domain_decision",
    requiresUserConfirmation: false,
    reasonKey: "repair_plan.reason.invalid_enum_value",
    limitationKeys: [REPLACEMENT_UNKNOWN, "repair_plan.limitation.enum_value_not_substituted"],
  },
  unknown_record_field: {
    disposition: "proposed_action",
    action: "remove_unknown_field",
    safety: "potentially_destructive",
    requiresUserConfirmation: true,
    reasonKey: "repair_plan.reason.unknown_field",
    limitationKeys: ["repair_plan.limitation.unknown_content_not_copied"],
  },
  orphaned_reference: {
    disposition: "proposed_action",
    action: "clear_or_relink_reference",
    safety: "potentially_destructive",
    requiresUserConfirmation: true,
    reasonKey: "repair_plan.reason.orphaned_reference",
    limitationKeys: [
      "repair_plan.limitation.intended_target_unknown",
      "repair_plan.limitation.reference_not_cleared",
    ],
  },
};

const ISSUE_CODE_ORDER: readonly DataIntegrityIssueCode[] = [
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

const DISPOSITION_ORDER: readonly DataRepairPlanDisposition[] = [
  "blocked",
  "manual_review",
  "informational",
  "proposed_action",
];

const ACTION_ORDER: readonly FitCoreDataRepairActionCode[] = [
  "review_root_structure",
  "review_missing_required_value",
  "review_invalid_field_value",
  "review_invalid_timestamp",
  "review_invalid_time_order",
  "review_cross_collection_identifier",
  "remove_unknown_field",
  "quarantine_malformed_record",
  "resolve_duplicate_identifier",
  "clear_or_relink_reference",
];

const issueRank = new Map(ISSUE_CODE_ORDER.map((code, index) => [code, index]));
const dispositionRank = new Map(DISPOSITION_ORDER.map((code, index) => [code, index]));
const actionRank = new Map(ACTION_ORDER.map((code, index) => [code, index]));

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function createEntry(issue: DataIntegrityIssue): DataRepairPlanEntry {
  const mapping = ISSUE_PLAN_MAPPING[issue.code];
  return {
    entryId: `repair_plan:${issue.issueKey}`,
    disposition: mapping.disposition,
    action: mapping.action,
    safety: mapping.safety,
    requiresUserConfirmation: mapping.requiresUserConfirmation,
    reasonKey: mapping.reasonKey,
    limitationKeys: [...mapping.limitationKeys].sort(compareText),
    source: {
      policy: FITCORE_DATA_INTEGRITY_POLICY,
      issueKey: issue.issueKey,
      issueCode: issue.code,
      severity: issue.severity,
      path: issue.path,
      relatedPaths: [...issue.relatedPaths].sort(compareText),
    },
  };
}

function compareEntries(left: DataRepairPlanEntry, right: DataRepairPlanEntry): number {
  return (
    compareText(left.source.path, right.source.path) ||
    (issueRank.get(left.source.issueCode) ?? Number.MAX_SAFE_INTEGER) -
      (issueRank.get(right.source.issueCode) ?? Number.MAX_SAFE_INTEGER) ||
    (dispositionRank.get(left.disposition) ?? Number.MAX_SAFE_INTEGER) -
      (dispositionRank.get(right.disposition) ?? Number.MAX_SAFE_INTEGER) ||
    (actionRank.get(left.action) ?? Number.MAX_SAFE_INTEGER) -
      (actionRank.get(right.action) ?? Number.MAX_SAFE_INTEGER) ||
    compareText(
      left.source.relatedPaths.join("\u0000"),
      right.source.relatedPaths.join("\u0000"),
    ) ||
    compareText(left.entryId, right.entryId)
  );
}

function summarize(entries: readonly DataRepairPlanEntry[]): DataRepairPlanSummary {
  return {
    totalEntries: entries.length,
    proposedActionCount: entries.filter(({ disposition }) => disposition === "proposed_action")
      .length,
    manualReviewCount: entries.filter(({ disposition }) => disposition === "manual_review").length,
    informationalCount: entries.filter(({ disposition }) => disposition === "informational").length,
    blockedCount: entries.filter(({ disposition }) => disposition === "blocked").length,
    confirmationRequiredCount: entries.filter(
      ({ requiresUserConfirmation }) => requiresUserConfirmation === true,
    ).length,
    nonDestructiveCount: entries.filter(({ safety }) => safety === "non_destructive").length,
    potentiallyDestructiveCount: entries.filter(
      ({ safety }) => safety === "potentially_destructive",
    ).length,
    domainDecisionCount: entries.filter(({ safety }) => safety === "requires_domain_decision")
      .length,
    notActionableCount: entries.filter(({ safety }) => safety === "not_actionable").length,
  };
}

function determineStatus(
  integrityStatus: DataIntegrityStatus,
  entries: readonly DataRepairPlanEntry[],
  summary: DataRepairPlanSummary,
): DataRepairPlanStatus {
  if (entries.some(({ source }) => source.issueCode === "invalid_root")) return "invalid_input";
  if (integrityStatus === "valid" && entries.length === 0) return "no_action";
  if (summary.proposedActionCount > 0) return "actions_proposed";
  return "review_required";
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Create a deterministic preview of repair categories without executing any data change. */
export function createFitCoreDataRepairPlan(value: unknown): FitCoreDataRepairPlan {
  const integrityReport = validateFitCoreDataIntegrity(value);
  const entries = integrityReport.issues.map(createEntry).sort(compareEntries);
  const summary = summarize(entries);
  const plan: FitCoreDataRepairPlan = {
    policy: FITCORE_DATA_REPAIR_PLAN_POLICY,
    integrityPolicy: FITCORE_DATA_INTEGRITY_POLICY,
    status: determineStatus(integrityReport.status, entries, summary),
    integrityStatus: integrityReport.status,
    integrityIssueCount: integrityReport.issueCount,
    summary,
    entries,
  };
  return deepFreeze(plan);
}
