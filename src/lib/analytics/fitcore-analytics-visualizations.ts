import type { FitCoreAnalyticsExplanationReport } from "./fitcore-analytics-explanations";
import type { FitCoreAnalyticsInsightReport } from "./fitcore-analytics-insights";
import { FITCORE_INSIGHT_EXPLANATION_POLICY } from "./insight-explanations";
import { FITCORE_INSIGHT_CANDIDATE_POLICY } from "./insight-candidates";
import { FITCORE_INSIGHT_EVIDENCE_POLICY } from "./insight-evidence";
import {
  FITCORE_INSIGHT_VISUALIZATION_POLICY,
  buildInsightVisualizationPacket,
  type InsightVisualizationDerivedData,
  type InsightVisualizationInteraction,
  type InsightVisualizationKind,
  type InsightVisualizationLimitationKey,
  type InsightVisualizationPacket,
  type InsightVisualizationReasonKey,
  type InsightVisualizationStatus,
  type InsightVisualizationDataMode,
} from "./insight-visualizations";
import { METRIC_DEPENDENCY_GRAPH } from "./metric-dependency-graph";

export interface FitCoreInsightVisualizationInput {
  insights: FitCoreAnalyticsInsightReport;
  explanations: FitCoreAnalyticsExplanationReport;
  derivedDataByCandidateId?: Readonly<Record<string, InsightVisualizationDerivedData | null>>;
}

export interface FitCoreInsightVisualizationEvaluation {
  evaluationId: string;
  nodeId: string;
  candidateId: string | null;
  explanationId: string | null;
  packetId: string | null;
  selected: boolean;
  status: InsightVisualizationStatus;
  visualizationKind: InsightVisualizationKind;
  dataMode: InsightVisualizationDataMode;
  safeToRender: boolean;
  reasonKey: InsightVisualizationReasonKey;
  limitationKeys: InsightVisualizationLimitationKey[];
}

export interface FitCoreInsightVisualizationSummary {
  evaluationCount: number;
  selectedCandidateCount: number;
  packetCount: number;
  readyCount: number;
  partialCount: number;
  unavailableCount: number;
  safeToRenderCount: number;
  summaryMetricCount: number;
  trendLineCount: number;
  comparisonBarsCount: number;
  progressRingCount: number;
  heatmapCount: number;
  noneCount: number;
  inspectValueCount: number;
  switchWindowCount: number;
  comparePeriodsCount: number;
  toggleSeriesCount: number;
  selectRegionCount: number;
  openDetailCount: number;
}

export interface FitCoreInsightVisualizationReport {
  policy: typeof FITCORE_INSIGHT_VISUALIZATION_POLICY;
  evidencePolicy: typeof FITCORE_INSIGHT_EVIDENCE_POLICY;
  candidatePolicy: typeof FITCORE_INSIGHT_CANDIDATE_POLICY;
  explanationPolicy: typeof FITCORE_INSIGHT_EXPLANATION_POLICY;
  evaluationAt: string;
  nodeCount: number;
  evaluations: FitCoreInsightVisualizationEvaluation[];
  packets: InsightVisualizationPacket[];
  summary: FitCoreInsightVisualizationSummary;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach((item) => deepFreeze(item));
  return Object.freeze(value);
}

function unavailableEvaluation(
  nodeId: string,
  candidateId: string | null,
  selected: boolean,
): FitCoreInsightVisualizationEvaluation {
  return {
    evaluationId: `${nodeId}:visualization:evaluation`,
    nodeId,
    candidateId,
    explanationId: null,
    packetId: null,
    selected,
    status: "unavailable",
    visualizationKind: "none",
    dataMode: "none",
    safeToRender: false,
    reasonKey: "analytics.visualization.reason.no_visualizable_data",
    limitationKeys: selected
      ? ["analytics.visualization.limitation.no_supported_data"]
      : ["analytics.visualization.limitation.candidate_not_selected"],
  };
}

function interactionCount(
  packets: readonly InsightVisualizationPacket[],
  interaction: InsightVisualizationInteraction,
): number {
  return packets.filter((packet) => packet.interactions.includes(interaction)).length;
}

/** Builds the graph-complete visualization contract from Task 15 and Task 16 reports only. */
export function buildFitCoreInsightVisualizations(
  input: FitCoreInsightVisualizationInput,
): FitCoreInsightVisualizationReport {
  const insightByNode = new Map(
    input.insights.evaluations.map((evaluation) => [evaluation.nodeId, evaluation]),
  );
  const explanationByCandidate = new Map(
    input.explanations.packets.map((packet) => [packet.candidateId, packet]),
  );
  const packets = input.insights.selectedCandidates.map((candidate) => {
    const explanation = explanationByCandidate.get(candidate.candidateId);
    if (!explanation) return null;
    return buildInsightVisualizationPacket({
      candidate,
      explanation,
      derivedData: input.derivedDataByCandidateId?.[candidate.candidateId],
    });
  });
  const packetByCandidate = new Map(
    packets
      .filter((packet): packet is InsightVisualizationPacket => packet !== null)
      .map((packet) => [packet.candidateId, packet]),
  );
  const finalPackets: InsightVisualizationPacket[] = input.insights.selectedCandidates.map(
    (candidate): InsightVisualizationPacket => {
      const packet = packetByCandidate.get(candidate.candidateId);
      if (packet) return packet;
      return {
        policy: FITCORE_INSIGHT_VISUALIZATION_POLICY,
        evidencePolicy: FITCORE_INSIGHT_EVIDENCE_POLICY,
        candidatePolicy: FITCORE_INSIGHT_CANDIDATE_POLICY,
        explanationPolicy: FITCORE_INSIGHT_EXPLANATION_POLICY,
        packetId: `${candidate.candidateId}:visualization:none`,
        candidateId: candidate.candidateId,
        explanationId: `${candidate.candidateId}:explanation`,
        nodeId: candidate.nodeId,
        dependencyNodeIds: [...candidate.evidence.dependencyNodeIds].sort(),
        status: "unavailable" as const,
        visualizationKind: "none" as const,
        dataMode: "none" as const,
        data: { mode: "none" as const },
        metricIds: [],
        units: [],
        defaultWindow: null,
        availableWindows: [],
        interactions: [],
        reasonKey: "analytics.visualization.reason.no_visualizable_data" as const,
        limitationKeys: [
          "analytics.visualization.limitation.explanation_not_safe" as const,
          "analytics.visualization.limitation.no_supported_data" as const,
        ],
        accessibilityLabelKey: "analytics.visualization.accessibility.unavailable",
        emptyStateKey: "analytics.visualization.empty.no_supported_values" as const,
        safeToRender: false,
      };
    },
  );
  const evaluations = METRIC_DEPENDENCY_GRAPH.map((node) => {
    const insight = insightByNode.get(node.id);
    const candidate = insight?.candidate ?? null;
    const selected = insight?.selected === true;
    const packet =
      selected && candidate
        ? finalPackets.find((item) => item.candidateId === candidate.candidateId)
        : null;
    if (!packet)
      return unavailableEvaluation(
        node.id,
        candidate?.status === "suppressed" ? null : (candidate?.candidateId ?? null),
        selected,
      );
    return {
      evaluationId: `${node.id}:visualization:evaluation`,
      nodeId: node.id,
      candidateId: packet.candidateId,
      explanationId: packet.explanationId,
      packetId: packet.packetId,
      selected: true,
      status: packet.status,
      visualizationKind: packet.visualizationKind,
      dataMode: packet.dataMode,
      safeToRender: packet.safeToRender,
      reasonKey: packet.reasonKey,
      limitationKeys: [...packet.limitationKeys],
    };
  });
  const kindCount = (kind: InsightVisualizationKind) =>
    evaluations.filter((evaluation) => evaluation.visualizationKind === kind).length;
  const summary: FitCoreInsightVisualizationSummary = {
    evaluationCount: evaluations.length,
    selectedCandidateCount: input.insights.selectedCandidates.length,
    packetCount: finalPackets.length,
    readyCount: evaluations.filter((evaluation) => evaluation.status === "ready").length,
    partialCount: evaluations.filter((evaluation) => evaluation.status === "partial").length,
    unavailableCount: evaluations.filter((evaluation) => evaluation.status === "unavailable")
      .length,
    safeToRenderCount: evaluations.filter((evaluation) => evaluation.safeToRender).length,
    summaryMetricCount: kindCount("summary_metric"),
    trendLineCount: kindCount("trend_line"),
    comparisonBarsCount: kindCount("comparison_bars"),
    progressRingCount: kindCount("progress_ring"),
    heatmapCount: kindCount("heatmap"),
    noneCount: kindCount("none"),
    inspectValueCount: interactionCount(finalPackets, "inspect_value"),
    switchWindowCount: interactionCount(finalPackets, "switch_window"),
    comparePeriodsCount: interactionCount(finalPackets, "compare_periods"),
    toggleSeriesCount: interactionCount(finalPackets, "toggle_series"),
    selectRegionCount: interactionCount(finalPackets, "select_region"),
    openDetailCount: interactionCount(finalPackets, "open_detail"),
  };
  return deepFreeze({
    policy: FITCORE_INSIGHT_VISUALIZATION_POLICY,
    evidencePolicy: FITCORE_INSIGHT_EVIDENCE_POLICY,
    candidatePolicy: FITCORE_INSIGHT_CANDIDATE_POLICY,
    explanationPolicy: FITCORE_INSIGHT_EXPLANATION_POLICY,
    evaluationAt: input.explanations.evaluationAt,
    nodeCount: evaluations.length,
    evaluations,
    packets: finalPackets,
    summary,
  });
}
