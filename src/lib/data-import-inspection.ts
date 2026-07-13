import {
  FITCORE_DATA_INTEGRITY_POLICY,
  validateFitCoreDataIntegrity,
  type DataIntegrityIssueCode,
  type DataIntegritySeverity,
  type DataIntegrityStatus,
} from "./data-integrity";
import {
  createFitCoreDataRepairPlan,
  FITCORE_DATA_REPAIR_PLAN_POLICY,
  type DataRepairPlanDisposition,
  type DataRepairPlanSafety,
  type DataRepairPlanStatus,
  type FitCoreDataRepairActionCode,
} from "./data-repair-plan";

export const FITCORE_IMPORT_INSPECTION_POLICY = "fitcore_import_inspection_v1" as const;

export const FITCORE_IMPORT_INSPECTION_LIMITS = Object.freeze({
  maxCharacters: 10_000_000,
  maxDepth: 64,
  maxNodes: 250_000,
  maxArrayLength: 50_000,
  maxObjectKeys: 10_000,
  maxStringLength: 1_000_000,
} as const);

export type FitCoreImportInspectionStatus =
  | "invalid_input"
  | "blocked"
  | "review_required"
  | "eligible";

export type FitCoreImportInputKind = "unsupported" | "json_text";

export type FitCoreImportRootKind =
  | "unavailable"
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

export type FitCoreImportInspectionStageCode =
  | "input"
  | "parse"
  | "structure"
  | "integrity"
  | "repair_plan"
  | "eligibility";

export type FitCoreImportInspectionCheckStatus = "not_run" | "passed" | "warning" | "failed";

export type FitCoreImportInspectionCheckCode =
  | "unsupported_input_type"
  | "empty_input"
  | "payload_character_limit_exceeded"
  | "invalid_json"
  | "unsupported_root"
  | "unsafe_object_key"
  | "maximum_depth_exceeded"
  | "maximum_node_count_exceeded"
  | "maximum_array_length_exceeded"
  | "maximum_object_key_count_exceeded"
  | "maximum_string_length_exceeded"
  | "integrity_invalid"
  | "integrity_warnings"
  | "repair_review_required"
  | "repair_actions_proposed"
  | "repair_blocked"
  | "eligible_current_format";

export interface FitCoreImportInspectionCheck {
  readonly code: FitCoreImportInspectionCheckCode;
  readonly stage: FitCoreImportInspectionStageCode;
  readonly status: FitCoreImportInspectionCheckStatus;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
}

export interface FitCoreImportInspectionStage {
  readonly stage: FitCoreImportInspectionStageCode;
  readonly status: FitCoreImportInspectionCheckStatus;
}

export interface FitCoreImportStructuralSummary {
  readonly characterCount: number;
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

export interface FitCoreImportIntegrityIssue {
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

export interface FitCoreImportIntegrityReport {
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
  readonly issues: readonly FitCoreImportIntegrityIssue[];
}

export interface FitCoreImportRepairPlanAttribution {
  readonly policy: typeof FITCORE_DATA_INTEGRITY_POLICY;
  readonly issueKey: string;
  readonly issueCode: DataIntegrityIssueCode;
  readonly severity: DataIntegritySeverity;
  readonly path: string;
  readonly relatedPaths: readonly string[];
}

export interface FitCoreImportRepairPlanEntry {
  readonly entryId: string;
  readonly disposition: DataRepairPlanDisposition;
  readonly action: FitCoreDataRepairActionCode;
  readonly safety: DataRepairPlanSafety;
  readonly requiresUserConfirmation: boolean;
  readonly reasonKey: string;
  readonly limitationKeys: readonly string[];
  readonly source: FitCoreImportRepairPlanAttribution;
}

export interface FitCoreImportRepairPlanSummary {
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

export interface FitCoreImportRepairPlan {
  readonly policy: typeof FITCORE_DATA_REPAIR_PLAN_POLICY;
  readonly integrityPolicy: typeof FITCORE_DATA_INTEGRITY_POLICY;
  readonly status: DataRepairPlanStatus;
  readonly integrityStatus: DataIntegrityStatus;
  readonly integrityIssueCount: number;
  readonly summary: FitCoreImportRepairPlanSummary;
  readonly entries: readonly FitCoreImportRepairPlanEntry[];
}

export interface FitCoreImportInspectionSummary {
  readonly totalCheckCount: number;
  readonly passedCheckCount: number;
  readonly warningCheckCount: number;
  readonly failedCheckCount: number;
  readonly notRunCheckCount: number;
  readonly integrityIssueCount: number;
  readonly repairPlanEntryCount: number;
  readonly confirmationRequiredCount: number;
  readonly structuralLimitViolationCount: number;
  readonly unsafeKeyCount: number;
}

export interface FitCoreImportInspectionReport {
  readonly policy: typeof FITCORE_IMPORT_INSPECTION_POLICY;
  readonly integrityPolicy: typeof FITCORE_DATA_INTEGRITY_POLICY;
  readonly repairPlanPolicy: typeof FITCORE_DATA_REPAIR_PLAN_POLICY;
  readonly status: FitCoreImportInspectionStatus;
  readonly safeToImport: boolean;
  readonly inputKind: FitCoreImportInputKind;
  readonly rootKind: FitCoreImportRootKind;
  readonly limitationKeys: readonly string[];
  readonly stages: readonly FitCoreImportInspectionStage[];
  readonly checks: readonly FitCoreImportInspectionCheck[];
  readonly structure: FitCoreImportStructuralSummary;
  readonly integrityReport: FitCoreImportIntegrityReport | null;
  readonly repairPlan: FitCoreImportRepairPlan | null;
  readonly summary: FitCoreImportInspectionSummary;
}

interface MutableCheck {
  code: FitCoreImportInspectionCheckCode;
  stage: FitCoreImportInspectionStageCode;
  status: FitCoreImportInspectionCheckStatus;
  reasonKey: string;
  limitationKeys: string[];
}

interface StructuralScanResult {
  summary: MutableStructuralSummary;
  blocker: StructuralBlocker | null;
  unsafeKeyCount: number;
}

type MutableStructuralSummary = {
  -readonly [Key in keyof FitCoreImportStructuralSummary]: FitCoreImportStructuralSummary[Key];
};

type StructuralBlocker =
  | "unsafe_object_key"
  | "maximum_depth_exceeded"
  | "maximum_node_count_exceeded"
  | "maximum_array_length_exceeded"
  | "maximum_object_key_count_exceeded"
  | "maximum_string_length_exceeded";

const STAGE_ORDER: readonly FitCoreImportInspectionStageCode[] = [
  "input",
  "parse",
  "structure",
  "integrity",
  "repair_plan",
  "eligibility",
];

const CHECK_DEFINITIONS: readonly [
  FitCoreImportInspectionCheckCode,
  FitCoreImportInspectionStageCode,
][] = [
  ["unsupported_input_type", "input"],
  ["empty_input", "input"],
  ["payload_character_limit_exceeded", "input"],
  ["invalid_json", "parse"],
  ["unsupported_root", "structure"],
  ["unsafe_object_key", "structure"],
  ["maximum_depth_exceeded", "structure"],
  ["maximum_node_count_exceeded", "structure"],
  ["maximum_array_length_exceeded", "structure"],
  ["maximum_object_key_count_exceeded", "structure"],
  ["maximum_string_length_exceeded", "structure"],
  ["integrity_invalid", "integrity"],
  ["integrity_warnings", "integrity"],
  ["repair_review_required", "repair_plan"],
  ["repair_actions_proposed", "repair_plan"],
  ["repair_blocked", "repair_plan"],
  ["eligible_current_format", "eligibility"],
];

const LIMIT_CHECKS = new Set<FitCoreImportInspectionCheckCode>([
  "payload_character_limit_exceeded",
  "maximum_depth_exceeded",
  "maximum_node_count_exceeded",
  "maximum_array_length_exceeded",
  "maximum_object_key_count_exceeded",
  "maximum_string_length_exceeded",
]);

const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const REPORT_LIMITATIONS = [
  "import.inspection.limitation.import_not_executed",
  "import.inspection.limitation.payload_not_returned",
  "import.inspection.limitation.repair_not_executed",
] as const;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function makeChecks(): MutableCheck[] {
  return CHECK_DEFINITIONS.map(([code, stage]) => ({
    code,
    stage,
    status: "not_run",
    reasonKey: "import.inspection.reason.not_run",
    limitationKeys: [],
  }));
}

function updateCheck(
  checks: MutableCheck[],
  code: FitCoreImportInspectionCheckCode,
  status: FitCoreImportInspectionCheckStatus,
  reasonKey: string,
  limitationKeys: readonly string[] = [],
): void {
  const check = checks.find((candidate) => candidate.code === code);
  if (check === undefined) throw new Error("Import inspection check invariant failed");
  check.status = status;
  check.reasonKey = reasonKey;
  check.limitationKeys = [...limitationKeys].sort(compareText);
}

function passCheck(checks: MutableCheck[], code: FitCoreImportInspectionCheckCode): void {
  updateCheck(checks, code, "passed", `import.inspection.reason.${code}.passed`);
}

function zeroStructure(characterCount: number): MutableStructuralSummary {
  return {
    characterCount,
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

function classifyRoot(value: unknown): FitCoreImportRootKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "unavailable";
}

/**
 * The parsed root is node one at depth zero. Each object property value and
 * each array element is one additional value node; object keys are not nodes.
 */
function scanStructure(root: object, characterCount: number): StructuralScanResult {
  const summary = zeroStructure(characterCount);
  summary.topLevelFieldCount = Array.isArray(root) ? 0 : Object.keys(root).length;
  const stack: { value: unknown; depth: number }[] = [{ value: root, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    summary.nodeCount += 1;
    if (summary.nodeCount > FITCORE_IMPORT_INSPECTION_LIMITS.maxNodes) {
      return { summary, blocker: "maximum_node_count_exceeded", unsafeKeyCount: 0 };
    }
    if (current.depth > summary.maximumDepthObserved) summary.maximumDepthObserved = current.depth;
    if (current.depth > FITCORE_IMPORT_INSPECTION_LIMITS.maxDepth) {
      return { summary, blocker: "maximum_depth_exceeded", unsafeKeyCount: 0 };
    }

    const value = current.value;
    if (value === null) {
      summary.nullCount += 1;
      continue;
    }
    if (typeof value === "string") {
      summary.stringCount += 1;
      if (value.length > FITCORE_IMPORT_INSPECTION_LIMITS.maxStringLength) {
        return { summary, blocker: "maximum_string_length_exceeded", unsafeKeyCount: 0 };
      }
      continue;
    }
    if (typeof value === "number") {
      summary.numberCount += 1;
      continue;
    }
    if (typeof value === "boolean") {
      summary.booleanCount += 1;
      continue;
    }
    if (Array.isArray(value)) {
      summary.arrayCount += 1;
      if (value.length > FITCORE_IMPORT_INSPECTION_LIMITS.maxArrayLength) {
        return { summary, blocker: "maximum_array_length_exceeded", unsafeKeyCount: 0 };
      }
      for (let index = value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: value[index], depth: current.depth + 1 });
      }
      continue;
    }
    if (typeof value === "object") {
      summary.objectCount += 1;
      const keys = Object.keys(value).sort(compareText);
      if (keys.length > FITCORE_IMPORT_INSPECTION_LIMITS.maxObjectKeys) {
        return { summary, blocker: "maximum_object_key_count_exceeded", unsafeKeyCount: 0 };
      }
      const unsafeKeyCount = keys.filter((key) => UNSAFE_KEYS.has(key)).length;
      if (unsafeKeyCount > 0) {
        return { summary, blocker: "unsafe_object_key", unsafeKeyCount };
      }
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        stack.push({
          value: (value as Record<string, unknown>)[keys[index]],
          depth: current.depth + 1,
        });
      }
    }
  }

  return { summary, blocker: null, unsafeKeyCount: 0 };
}

function cloneIntegrityReport(
  report: ReturnType<typeof validateFitCoreDataIntegrity>,
): FitCoreImportIntegrityReport {
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
    issues: report.issues.map((issue) => ({
      issueKey: issue.issueKey,
      code: issue.code,
      severity: issue.severity,
      path: issue.path,
      collection: issue.collection,
      field: issue.field,
      valueType: issue.valueType,
      relatedPaths: [...issue.relatedPaths],
      messageKey: issue.messageKey,
    })),
  };
}

function cloneRepairPlan(
  plan: ReturnType<typeof createFitCoreDataRepairPlan>,
): FitCoreImportRepairPlan {
  return {
    policy: plan.policy,
    integrityPolicy: plan.integrityPolicy,
    status: plan.status,
    integrityStatus: plan.integrityStatus,
    integrityIssueCount: plan.integrityIssueCount,
    summary: { ...plan.summary },
    entries: plan.entries.map((entry) => ({
      entryId: entry.entryId,
      disposition: entry.disposition,
      action: entry.action,
      safety: entry.safety,
      requiresUserConfirmation: entry.requiresUserConfirmation,
      reasonKey: entry.reasonKey,
      limitationKeys: [...entry.limitationKeys],
      source: {
        policy: entry.source.policy,
        issueKey: entry.source.issueKey,
        issueCode: entry.source.issueCode,
        severity: entry.source.severity,
        path: entry.source.path,
        relatedPaths: [...entry.source.relatedPaths],
      },
    })),
  };
}

function stageStatus(
  checks: readonly FitCoreImportInspectionCheck[],
  stage: FitCoreImportInspectionStageCode,
): FitCoreImportInspectionCheckStatus {
  const statuses = checks.filter((check) => check.stage === stage).map((check) => check.status);
  if (statuses.every((status) => status === "not_run")) return "not_run";
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("warning")) return "warning";
  if (statuses.some((status) => status === "passed")) return "passed";
  return "not_run";
}

function summarize(
  checks: readonly FitCoreImportInspectionCheck[],
  integrityReport: FitCoreImportIntegrityReport | null,
  repairPlan: FitCoreImportRepairPlan | null,
  unsafeKeyCount: number,
): FitCoreImportInspectionSummary {
  return {
    totalCheckCount: checks.length,
    passedCheckCount: checks.filter(({ status }) => status === "passed").length,
    warningCheckCount: checks.filter(({ status }) => status === "warning").length,
    failedCheckCount: checks.filter(({ status }) => status === "failed").length,
    notRunCheckCount: checks.filter(({ status }) => status === "not_run").length,
    integrityIssueCount: integrityReport?.issueCount ?? 0,
    repairPlanEntryCount: repairPlan?.entries.length ?? 0,
    confirmationRequiredCount: repairPlan?.summary.confirmationRequiredCount ?? 0,
    structuralLimitViolationCount: checks.filter(
      ({ code, status }) => LIMIT_CHECKS.has(code) && status === "failed",
    ).length,
    unsafeKeyCount,
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function finish(options: {
  status: FitCoreImportInspectionStatus;
  inputKind: FitCoreImportInputKind;
  rootKind: FitCoreImportRootKind;
  checks: MutableCheck[];
  structure: FitCoreImportStructuralSummary;
  integrityReport?: FitCoreImportIntegrityReport | null;
  repairPlan?: FitCoreImportRepairPlan | null;
  unsafeKeyCount?: number;
}): FitCoreImportInspectionReport {
  const checks = options.checks.map((check) => ({
    ...check,
    limitationKeys: [...check.limitationKeys],
  }));
  const integrityReport = options.integrityReport ?? null;
  const repairPlan = options.repairPlan ?? null;
  const report: FitCoreImportInspectionReport = {
    policy: FITCORE_IMPORT_INSPECTION_POLICY,
    integrityPolicy: FITCORE_DATA_INTEGRITY_POLICY,
    repairPlanPolicy: FITCORE_DATA_REPAIR_PLAN_POLICY,
    status: options.status,
    safeToImport: options.status === "eligible",
    inputKind: options.inputKind,
    rootKind: options.rootKind,
    limitationKeys: [...REPORT_LIMITATIONS].sort(compareText),
    stages: STAGE_ORDER.map((stage) => ({ stage, status: stageStatus(checks, stage) })),
    checks,
    structure: { ...options.structure },
    integrityReport,
    repairPlan,
    summary: summarize(checks, integrityReport, repairPlan, options.unsafeKeyCount ?? 0),
  };
  return deepFreeze(report);
}

/** Inspect current-format FitCore JSON without importing or returning submitted data. */
export function inspectFitCoreImport(value: unknown): FitCoreImportInspectionReport {
  const checks = makeChecks();
  if (typeof value !== "string") {
    updateCheck(
      checks,
      "unsupported_input_type",
      "failed",
      "import.inspection.reason.unsupported_input",
      ["import.inspection.limitation.json_text_required"],
    );
    return finish({
      status: "invalid_input",
      inputKind: "unsupported",
      rootKind: "unavailable",
      checks,
      structure: zeroStructure(0),
    });
  }

  passCheck(checks, "unsupported_input_type");
  const characterCount = value.length;
  if (value.trim().length === 0) {
    updateCheck(checks, "empty_input", "failed", "import.inspection.reason.empty_input");
    return finish({
      status: "invalid_input",
      inputKind: "json_text",
      rootKind: "unavailable",
      checks,
      structure: zeroStructure(characterCount),
    });
  }
  passCheck(checks, "empty_input");

  if (characterCount > FITCORE_IMPORT_INSPECTION_LIMITS.maxCharacters) {
    updateCheck(
      checks,
      "payload_character_limit_exceeded",
      "failed",
      "import.inspection.reason.payload_character_limit_exceeded",
      ["import.inspection.limitation.payload_not_truncated"],
    );
    return finish({
      status: "blocked",
      inputKind: "json_text",
      rootKind: "unavailable",
      checks,
      structure: zeroStructure(characterCount),
    });
  }
  passCheck(checks, "payload_character_limit_exceeded");

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    updateCheck(checks, "invalid_json", "failed", "import.inspection.reason.invalid_json", [
      "import.inspection.limitation.parser_message_not_returned",
      "import.inspection.limitation.payload_not_repaired",
    ]);
    return finish({
      status: "blocked",
      inputKind: "json_text",
      rootKind: "unavailable",
      checks,
      structure: zeroStructure(characterCount),
    });
  }
  passCheck(checks, "invalid_json");

  const rootKind = classifyRoot(parsedValue);
  if (rootKind !== "object") {
    updateCheck(checks, "unsupported_root", "failed", "import.inspection.reason.unsupported_root");
    return finish({
      status: "blocked",
      inputKind: "json_text",
      rootKind,
      checks,
      structure: zeroStructure(characterCount),
    });
  }
  passCheck(checks, "unsupported_root");

  const scan = scanStructure(parsedValue as object, characterCount);
  if (scan.blocker !== null) {
    updateCheck(
      checks,
      scan.blocker,
      "failed",
      scan.blocker === "unsafe_object_key"
        ? "import.inspection.reason.unsafe_structure"
        : `import.inspection.reason.${scan.blocker}`,
      [
        scan.blocker === "unsafe_object_key"
          ? "import.inspection.limitation.unsafe_key_not_returned"
          : "import.inspection.limitation.structure_not_truncated",
      ],
    );
    return finish({
      status: "blocked",
      inputKind: "json_text",
      rootKind,
      checks,
      structure: scan.summary,
      unsafeKeyCount: scan.unsafeKeyCount,
    });
  }
  for (const code of [
    "unsafe_object_key",
    "maximum_depth_exceeded",
    "maximum_node_count_exceeded",
    "maximum_array_length_exceeded",
    "maximum_object_key_count_exceeded",
    "maximum_string_length_exceeded",
  ] as const) {
    passCheck(checks, code);
  }

  const upstreamIntegrityReport = validateFitCoreDataIntegrity(parsedValue);
  const integrityReport = cloneIntegrityReport(upstreamIntegrityReport);
  updateCheck(
    checks,
    "integrity_invalid",
    upstreamIntegrityReport.status === "invalid" ? "failed" : "passed",
    upstreamIntegrityReport.status === "invalid"
      ? "import.inspection.reason.integrity_invalid"
      : "import.inspection.reason.integrity_accepted",
  );
  updateCheck(
    checks,
    "integrity_warnings",
    upstreamIntegrityReport.warningCount > 0 ? "warning" : "passed",
    upstreamIntegrityReport.warningCount > 0
      ? "import.inspection.reason.integrity_warnings"
      : "import.inspection.reason.no_integrity_warnings",
  );

  const upstreamRepairPlan = createFitCoreDataRepairPlan(parsedValue);
  const repairPlan = cloneRepairPlan(upstreamRepairPlan);
  updateCheck(
    checks,
    "repair_review_required",
    upstreamRepairPlan.status === "review_required" ? "warning" : "passed",
    upstreamRepairPlan.status === "review_required"
      ? "import.inspection.reason.repair_review_required"
      : "import.inspection.reason.repair_review_not_required",
  );
  updateCheck(
    checks,
    "repair_actions_proposed",
    upstreamRepairPlan.status === "actions_proposed" ? "warning" : "passed",
    upstreamRepairPlan.status === "actions_proposed"
      ? "import.inspection.reason.repair_actions_proposed"
      : "import.inspection.reason.no_repair_actions_proposed",
    upstreamRepairPlan.status === "actions_proposed"
      ? ["import.inspection.limitation.repair_not_executed"]
      : [],
  );
  const repairBlocked =
    upstreamRepairPlan.status === "invalid_input" ||
    upstreamRepairPlan.entries.some(({ disposition }) => disposition === "blocked");
  updateCheck(
    checks,
    "repair_blocked",
    repairBlocked ? "failed" : "passed",
    repairBlocked
      ? "import.inspection.reason.repair_blocked"
      : "import.inspection.reason.repair_not_blocked",
  );

  let status: FitCoreImportInspectionStatus;
  if (upstreamIntegrityReport.status === "invalid" || repairBlocked) status = "blocked";
  else if (
    upstreamIntegrityReport.warningCount > 0 ||
    upstreamRepairPlan.status === "review_required" ||
    upstreamRepairPlan.status === "actions_proposed" ||
    upstreamRepairPlan.entries.length > 0
  )
    status = "review_required";
  else status = "eligible";

  updateCheck(
    checks,
    "eligible_current_format",
    status === "eligible" ? "passed" : status === "review_required" ? "warning" : "failed",
    status === "eligible"
      ? "import.inspection.reason.eligible"
      : status === "review_required"
        ? "import.inspection.reason.review_required"
        : "import.inspection.reason.blocked",
    status === "eligible" ? ["import.inspection.limitation.import_not_executed"] : [],
  );

  return finish({
    status,
    inputKind: "json_text",
    rootKind,
    checks,
    structure: scan.summary,
    integrityReport,
    repairPlan,
  });
}
