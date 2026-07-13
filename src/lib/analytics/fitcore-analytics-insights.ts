import type { MetricProvenance } from "./data-provenance";
import type { FitCoreAnalyticsSignalReport } from "./fitcore-analytics-signals";
import type { FitCoreAnalyticsTrendReport } from "./fitcore-analytics-trends";
import type {
  FitCoreInsightReadinessItem,
  FitCoreInsightReadinessResult,
  FitCoreInsightReadinessStatus,
} from "./fitcore-insight-readiness";
import {
  FITCORE_INSIGHT_CANDIDATE_POLICY,
  evaluateInsightCandidate,
  getInsightCandidateReasons,
  type InsightCandidate,
  type InsightCandidateReason,
  type InsightCandidateReasonCode,
  type InsightEvidenceStrength,
  type InsightObservationType,
  type InsightReviewPriority,
} from "./insight-candidates";
import {
  FITCORE_INSIGHT_EVIDENCE_POLICY,
  buildInsightEvidence,
  type InsightEvidenceBundle,
} from "./insight-evidence";
import { METRIC_DEPENDENCY_GRAPH } from "./metric-dependency-graph";

export const FITCORE_SELECTED_CANDIDATE_LIMIT = 10;

export interface FitCoreInsightNodeEvaluation {
  nodeId: string;
  supported: boolean;
  evidence: InsightEvidenceBundle;
  candidate: InsightCandidate;
  selected: boolean;
  reasons: InsightCandidateReason[];
}

export interface FitCoreAnalyticsInsightSummary {
  supportedNodes: number;
  unsupportedNodes: number;
  completeEvidence: number;
  partialEvidence: number;
  unavailableEvidence: number;
  eligibleCandidates: number;
  selectedCandidates: number;
  suppressedCandidates: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  meaningfulIncrease: number;
  meaningfulDecrease: number;
  mixedDirection: number;
  outsideExpectedRange: number;
  farOutsideExpectedRange: number;
  stablePattern: number;
  baselineEstablished: number;
}

export interface FitCoreAnalyticsInsightReport {
  evidencePolicy: typeof FITCORE_INSIGHT_EVIDENCE_POLICY;
  candidatePolicy: typeof FITCORE_INSIGHT_CANDIDATE_POLICY;
  evaluationAt: string;
  nodeCount: number;
  selectedCandidateLimit: typeof FITCORE_SELECTED_CANDIDATE_LIMIT;
  evaluations: FitCoreInsightNodeEvaluation[];
  selectedCandidates: InsightCandidate[];
  summary: FitCoreAnalyticsInsightSummary;
}

export interface FitCoreAnalyticsInsightSource {
  provenance: MetricProvenance;
  trends: FitCoreAnalyticsTrendReport;
  signals: FitCoreAnalyticsSignalReport;
  insightReadiness: FitCoreInsightReadinessResult;
}

const UNIT_BY_NODE: Readonly<Record<string, string>> = Object.freeze({
  "training.volume.7d": "load",
  "nutrition.calories.consistency": "kcal",
  "nutrition.protein.consistency": "grams",
  "nutrition.carbs.consistency": "grams",
  "nutrition.fat.consistency": "grams",
  "recovery.detail.soreness.trend": "score_1_10",
  "recovery.detail.energy.trend": "score_1_10",
  "recovery.detail.motivation.trend": "score_1_10",
  "recovery.detail.stress.trend": "score_1_10",
  "recovery.detail.readiness.trend": "score_0_100",
  "progress.bodyweight.series": "lb",
});

const CONCEPT_BY_NODE: Readonly<Record<string, string>> = Object.freeze({
  "nutrition.calories.consistency": "calories_bodyweight",
  "progress.bodyweight.series": "calories_bodyweight",
  "nutrition.protein.consistency": "protein_readiness",
  "recovery.detail.readiness.trend": "protein_readiness",
  "training.volume.7d": "training_soreness",
  "recovery.detail.soreness.trend": "training_soreness",
});

const priorityRank: Record<InsightReviewPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};
const strengthRank: Record<InsightEvidenceStrength, number> = {
  well_supported: 0,
  supported: 1,
  limited: 2,
  unavailable: 3,
};
const observationRank: Record<InsightObservationType, number> = {
  far_outside_expected_range: 0,
  outside_expected_range: 1,
  mixed_direction: 2,
  meaningful_increase: 3,
  meaningful_decrease: 4,
  stable_pattern: 5,
  baseline_established: 6,
};

function readinessFor(
  nodeId: string,
  items: readonly FitCoreInsightReadinessItem[],
): FitCoreInsightReadinessStatus | null {
  const matches = items.filter(
    (item) => item.id === nodeId || item.source.sourceMetricIds.includes(nodeId),
  );
  if (!matches.length) return null;
  if (matches.some((item) => item.status === "ready")) return "ready";
  if (matches.some((item) => item.status === "needs_more_data")) return "needs_more_data";
  return "unavailable";
}

function compareNullableDescending(left: number | null, right: number | null): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return right - left;
}

function compareDuplicate(
  left: InsightCandidate,
  right: InsightCandidate,
  graphOrder: ReadonlyMap<string, number>,
): number {
  return (
    strengthRank[left.evidenceStrength] - strengthRank[right.evidenceStrength] ||
    priorityRank[left.reviewPriority] - priorityRank[right.reviewPriority] ||
    compareNullableDescending(left.evidence.trustScore, right.evidence.trustScore) ||
    compareNullableDescending(left.evidence.traceability, right.evidence.traceability) ||
    right.supportingLayerCount - left.supportingLayerCount ||
    graphOrder.get(left.nodeId)! - graphOrder.get(right.nodeId)!
  );
}

function compareSelected(
  left: InsightCandidate,
  right: InsightCandidate,
  graphOrder: ReadonlyMap<string, number>,
): number {
  return (
    priorityRank[left.reviewPriority] - priorityRank[right.reviewPriority] ||
    strengthRank[left.evidenceStrength] - strengthRank[right.evidenceStrength] ||
    observationRank[left.observationType!] - observationRank[right.observationType!] ||
    compareNullableDescending(left.evidence.trustScore, right.evidence.trustScore) ||
    compareNullableDescending(left.evidence.traceability, right.evidence.traceability) ||
    graphOrder.get(left.nodeId)! - graphOrder.get(right.nodeId)! ||
    left.candidateId.localeCompare(right.candidateId)
  );
}

function deduplicationKey(candidate: InsightCandidate): string {
  const concept = CONCEPT_BY_NODE[candidate.nodeId] ?? candidate.nodeId;
  return `${concept}|${candidate.observationType}|${candidate.primaryWindow ?? "none"}`;
}

function withCandidateReason(
  candidate: InsightCandidate,
  status: "eligible" | "selected",
  code: InsightCandidateReasonCode,
): InsightCandidate {
  return {
    ...candidate,
    status,
    evidence: {
      ...candidate.evidence,
      provenanceTypes: [...candidate.evidence.provenanceTypes],
      dependencyNodeIds: [...candidate.evidence.dependencyNodeIds],
      sourceTypes: [...candidate.evidence.sourceTypes],
      reasons: candidate.evidence.reasons.map((reason) => ({ ...reason })),
    },
    sourceNodeIds: [...candidate.sourceNodeIds],
    reasons: getInsightCandidateReasons([...candidate.reasons.map((reason) => reason.code), code]),
  };
}

function selectedCount(
  candidates: readonly InsightCandidate[],
  observation: InsightObservationType,
): number {
  return candidates.filter((candidate) => candidate.observationType === observation).length;
}

/** Builds graph-complete evaluations, then deduplicates and prioritizes eligible candidates. */
export function getFitCoreAnalyticsInsights(
  analytics: FitCoreAnalyticsInsightSource,
): FitCoreAnalyticsInsightReport {
  const trends = new Map(analytics.trends.records.map((record) => [record.nodeId, record]));
  const signals = new Map(analytics.signals.records.map((record) => [record.nodeId, record]));
  const graphOrder = new Map(METRIC_DEPENDENCY_GRAPH.map((node, index) => [node.id, index]));
  let evaluations = METRIC_DEPENDENCY_GRAPH.map((node): FitCoreInsightNodeEvaluation => {
    const trend = trends.get(node.id) ?? null;
    const signal = signals.get(node.id) ?? null;
    const supported = Boolean(trend?.supported && signal?.supported);
    const provenanceTypes = [trend?.trust.provenanceType, analytics.provenance.sourceType].filter(
      (value): value is MetricProvenance["sourceType"] => typeof value === "string",
    );
    const evidence = buildInsightEvidence({
      nodeId: node.id,
      resolved: trend !== null && signal !== null,
      supported,
      metricValue: signal?.meaningfulChange.currentValue,
      unit: UNIT_BY_NODE[node.id] ?? null,
      trend,
      signal,
      provenanceTypes,
      insightReadiness: readinessFor(node.id, analytics.insightReadiness.items),
      dependencyNodeIds: node.dependencies,
    });
    const candidate = evaluateInsightCandidate(evidence);
    return {
      nodeId: node.id,
      supported,
      evidence,
      candidate,
      selected: false,
      reasons: candidate.reasons.map((reason) => ({ ...reason })),
    };
  });

  const eligible = evaluations
    .map((evaluation) => evaluation.candidate)
    .filter((candidate) => candidate.status === "eligible");
  const groups = new Map<string, InsightCandidate[]>();
  for (const candidate of eligible) {
    const key = deduplicationKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  const duplicateLosers = new Map<string, InsightCandidate>();
  const uniqueWinners: InsightCandidate[] = [];
  for (const key of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
    const ranked = groups.get(key)!.sort((a, b) => compareDuplicate(a, b, graphOrder));
    uniqueWinners.push(ranked[0]);
    ranked
      .slice(1)
      .forEach((candidate) =>
        duplicateLosers.set(
          candidate.candidateId,
          withCandidateReason(candidate, "eligible", "duplicate_candidate_not_selected"),
        ),
      );
  }
  const rankedUnique = uniqueWinners.sort((a, b) => compareSelected(a, b, graphOrder));
  const selectedIds = new Set(
    rankedUnique
      .slice(0, FITCORE_SELECTED_CANDIDATE_LIMIT)
      .map((candidate) => candidate.candidateId),
  );
  const finalized = new Map<string, InsightCandidate>();
  for (const candidate of rankedUnique) {
    finalized.set(
      candidate.candidateId,
      selectedIds.has(candidate.candidateId)
        ? withCandidateReason(candidate, "selected", "candidate_selected")
        : withCandidateReason(candidate, "eligible", "candidate_limit_not_selected"),
    );
  }
  duplicateLosers.forEach((candidate, id) => finalized.set(id, candidate));
  evaluations = evaluations.map((evaluation) => {
    const candidate = finalized.get(evaluation.candidate.candidateId) ?? evaluation.candidate;
    return {
      ...evaluation,
      candidate,
      selected: candidate.status === "selected",
      reasons: candidate.reasons.map((reason) => ({ ...reason })),
    };
  });
  const selectedCandidates = evaluations
    .filter((evaluation) => evaluation.selected)
    .map((evaluation) => evaluation.candidate)
    .sort((a, b) => compareSelected(a, b, graphOrder));
  const summary: FitCoreAnalyticsInsightSummary = {
    supportedNodes: evaluations.filter((evaluation) => evaluation.supported).length,
    unsupportedNodes: evaluations.filter((evaluation) => !evaluation.supported).length,
    completeEvidence: evaluations.filter((evaluation) => evaluation.evidence.status === "complete")
      .length,
    partialEvidence: evaluations.filter((evaluation) => evaluation.evidence.status === "partial")
      .length,
    unavailableEvidence: evaluations.filter(
      (evaluation) => evaluation.evidence.status === "unavailable",
    ).length,
    eligibleCandidates: evaluations.filter(
      (evaluation) => evaluation.candidate.status === "eligible",
    ).length,
    selectedCandidates: selectedCandidates.length,
    suppressedCandidates: evaluations.filter(
      (evaluation) => evaluation.candidate.status === "suppressed",
    ).length,
    highPriority: selectedCandidates.filter((candidate) => candidate.reviewPriority === "high")
      .length,
    mediumPriority: selectedCandidates.filter((candidate) => candidate.reviewPriority === "medium")
      .length,
    lowPriority: selectedCandidates.filter((candidate) => candidate.reviewPriority === "low")
      .length,
    meaningfulIncrease: selectedCount(selectedCandidates, "meaningful_increase"),
    meaningfulDecrease: selectedCount(selectedCandidates, "meaningful_decrease"),
    mixedDirection: selectedCount(selectedCandidates, "mixed_direction"),
    outsideExpectedRange: selectedCount(selectedCandidates, "outside_expected_range"),
    farOutsideExpectedRange: selectedCount(selectedCandidates, "far_outside_expected_range"),
    stablePattern: selectedCount(selectedCandidates, "stable_pattern"),
    baselineEstablished: selectedCount(selectedCandidates, "baseline_established"),
  };
  return {
    evidencePolicy: FITCORE_INSIGHT_EVIDENCE_POLICY,
    candidatePolicy: FITCORE_INSIGHT_CANDIDATE_POLICY,
    evaluationAt: analytics.signals.evaluationAt,
    nodeCount: evaluations.length,
    selectedCandidateLimit: FITCORE_SELECTED_CANDIDATE_LIMIT,
    evaluations,
    selectedCandidates,
    summary,
  };
}
