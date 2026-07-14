import type { MetricProvenance } from "./data-provenance";
import {
  FITCORE_EVIDENCE_ATTRIBUTION_POLICY,
  buildEvidenceAttribution,
  type EvidenceAttributionRecord,
} from "./evidence-attribution";
import type { FitCoreAnalyticsInsightReport } from "./fitcore-analytics-insights";
import type { FitCoreAnalyticsSignalReport } from "./fitcore-analytics-signals";
import type { FitCoreAnalyticsTrendReport } from "./fitcore-analytics-trends";
import type { FitCoreAnalyticsTrustReport } from "./fitcore-analytics-trust";
import {
  FITCORE_INSIGHT_EXPLANATION_POLICY,
  buildInsightExplanation,
  type InsightExplanationPacket,
  type InsightExplanationReason,
} from "./insight-explanations";
import { METRIC_DEPENDENCY_GRAPH } from "./metric-dependency-graph";

export interface FitCoreExplanationNodeEvaluation {
  nodeId: string;
  candidateId: string | null;
  selected: boolean;
  attribution: EvidenceAttributionRecord;
  explanation: InsightExplanationPacket;
  reasons: InsightExplanationReason[];
}

export interface FitCoreAnalyticsExplanationSummary {
  completeAttribution: number;
  partialAttribution: number;
  unavailableAttribution: number;
  completeExplanations: number;
  partialExplanations: number;
  unavailableExplanations: number;
  safeToPresent: number;
  notSafeToPresent: number;
  selectedCandidates: number;
  packets: number;
  limitations: number;
}

export interface FitCoreAnalyticsExplanationReport {
  attributionPolicy: typeof FITCORE_EVIDENCE_ATTRIBUTION_POLICY;
  explanationPolicy: typeof FITCORE_INSIGHT_EXPLANATION_POLICY;
  evaluationAt: string;
  nodeCount: number;
  selectedCandidateCount: number;
  evaluations: FitCoreExplanationNodeEvaluation[];
  packets: InsightExplanationPacket[];
  summary: FitCoreAnalyticsExplanationSummary;
}

export interface FitCoreAnalyticsExplanationSource {
  provenance: MetricProvenance;
  trust: FitCoreAnalyticsTrustReport;
  trends: FitCoreAnalyticsTrendReport;
  signals: FitCoreAnalyticsSignalReport;
  insights: FitCoreAnalyticsInsightReport;
}

/** Adds explanation packets without rescanning state or changing Task 15 selection. */
export function getFitCoreAnalyticsExplanations(
  analytics: FitCoreAnalyticsExplanationSource,
): FitCoreAnalyticsExplanationReport {
  const trustById = new Map(analytics.trust.nodes.map((record) => [record.metricId, record]));
  const trendById = new Map(analytics.trends.records.map((record) => [record.nodeId, record]));
  const signalById = new Map(analytics.signals.records.map((record) => [record.nodeId, record]));
  const insightById = new Map(
    analytics.insights.evaluations.map((evaluation) => [evaluation.nodeId, evaluation]),
  );
  const resolvedTrustIds = analytics.trust.nodes
    .filter((record) => record.status === "assessed")
    .map((record) => record.metricId);
  const evaluations = METRIC_DEPENDENCY_GRAPH.map((node): FitCoreExplanationNodeEvaluation => {
    const insight = insightById.get(node.id);
    if (!insight) throw new Error(`Missing Task 15 evaluation for graph node: ${node.id}`);
    const candidate = insight.candidate;
    const attribution = buildEvidenceAttribution({
      nodeId: node.id,
      resolved: !candidate.evidence.reasons.some((reason) => reason.code === "metric_unresolved"),
      supported: insight.supported,
      provenance: analytics.provenance,
      provenanceTypes: candidate.evidence.provenanceTypes,
      trust: trustById.get(node.id) ?? null,
      dependencyNodeIds: node.dependencies,
      resolvedDependencyNodeIds: resolvedTrustIds,
    });
    const explanation = buildInsightExplanation({
      candidate,
      attribution,
      trend: trendById.get(node.id) ?? null,
      signal: signalById.get(node.id) ?? null,
    });
    return {
      nodeId: node.id,
      candidateId: candidate.status === "suppressed" ? null : candidate.candidateId,
      selected: insight.selected,
      attribution,
      explanation,
      reasons: explanation.reasons.map((reason) => ({ ...reason })),
    };
  });
  const explanationByCandidateId = new Map(
    evaluations
      .filter((evaluation) => evaluation.selected)
      .map((evaluation) => [evaluation.explanation.candidateId, evaluation.explanation]),
  );
  const packets = analytics.insights.selectedCandidates.map((candidate) => {
    const packet = explanationByCandidateId.get(candidate.candidateId);
    if (!packet)
      throw new Error(`Missing explanation for selected candidate: ${candidate.candidateId}`);
    return {
      ...packet,
      facts: packet.facts.map((fact) => ({ ...fact, sourceNodeIds: [...fact.sourceNodeIds] })),
      attribution: {
        ...packet.attribution,
        sourceTypes: [...packet.attribution.sourceTypes],
        dependencyNodeIds: [...packet.attribution.dependencyNodeIds],
        reasons: packet.attribution.reasons.map((reason) => ({ ...reason })),
      },
      limitations: packet.limitations.map((limitation) => ({
        ...limitation,
        sourceNodeIds: [...limitation.sourceNodeIds],
      })),
      reasons: packet.reasons.map((reason) => ({ ...reason })),
    };
  });
  const summary: FitCoreAnalyticsExplanationSummary = {
    completeAttribution: evaluations.filter((item) => item.attribution.status === "complete")
      .length,
    partialAttribution: evaluations.filter((item) => item.attribution.status === "partial").length,
    unavailableAttribution: evaluations.filter((item) => item.attribution.status === "unavailable")
      .length,
    completeExplanations: evaluations.filter((item) => item.explanation.status === "complete")
      .length,
    partialExplanations: evaluations.filter((item) => item.explanation.status === "partial").length,
    unavailableExplanations: evaluations.filter((item) => item.explanation.status === "unavailable")
      .length,
    safeToPresent: evaluations.filter((item) => item.explanation.safeToPresent).length,
    notSafeToPresent: evaluations.filter((item) => !item.explanation.safeToPresent).length,
    selectedCandidates: analytics.insights.selectedCandidates.length,
    packets: packets.length,
    limitations: packets.reduce((sum, packet) => sum + packet.limitations.length, 0),
  };
  return {
    attributionPolicy: FITCORE_EVIDENCE_ATTRIBUTION_POLICY,
    explanationPolicy: FITCORE_INSIGHT_EXPLANATION_POLICY,
    evaluationAt: analytics.insights.evaluationAt,
    nodeCount: evaluations.length,
    selectedCandidateCount: analytics.insights.selectedCandidates.length,
    evaluations,
    packets,
    summary,
  };
}
