import type { FitCoreInsightVisualizationReport } from "./fitcore-analytics-visualizations";
import {
  FITCORE_INSIGHT_INTERACTION_POLICY,
  buildInsightInteractionContract,
  resolveInteractionAgainstContract,
  type InsightInteractionContract,
  type InsightInteractionContractStatus,
  type InsightInteractionLimitationKey,
  type InsightInteractionReasonKey,
  type InsightInteractionResolution,
} from "./insight-interactions";
import { FITCORE_INSIGHT_VISUALIZATION_POLICY } from "./insight-visualizations";
import { METRIC_DEPENDENCY_GRAPH } from "./metric-dependency-graph";

export interface FitCoreInsightInteractionEvaluation {
  evaluationId: string;
  nodeId: string;
  contractId: string | null;
  visualizationPacketId: string | null;
  status: InsightInteractionContractStatus;
  safeToInteract: boolean;
  reasonKey: InsightInteractionReasonKey;
  limitationKeys: InsightInteractionLimitationKey[];
}

export interface FitCoreInsightInteractionSummary {
  evaluationCount: number;
  contractCount: number;
  readyContractCount: number;
  limitedContractCount: number;
  unavailableContractCount: number;
  safeToInteractCount: number;
  inspectValueContractCount: number;
  switchWindowContractCount: number;
  comparePeriodsContractCount: number;
  toggleSeriesContractCount: number;
  selectRegionContractCount: number;
  openDetailContractCount: number;
  inspectableTargetCount: number;
  windowTargetCount: number;
  comparisonTargetCount: number;
  seriesTargetCount: number;
  regionTargetCount: number;
  detailTargetCount: number;
}

export interface FitCoreInsightInteractionReport {
  policy: typeof FITCORE_INSIGHT_INTERACTION_POLICY;
  visualizationPolicy: typeof FITCORE_INSIGHT_VISUALIZATION_POLICY;
  evaluationAt: string;
  nodeCount: number;
  evaluations: FitCoreInsightInteractionEvaluation[];
  contracts: InsightInteractionContract[];
  summary: FitCoreInsightInteractionSummary;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach((item) => deepFreeze(item));
  return Object.freeze(value);
}

export function buildFitCoreInsightInteractions(
  visualizations: FitCoreInsightVisualizationReport,
): FitCoreInsightInteractionReport {
  const contracts = visualizations.packets.map(buildInsightInteractionContract);
  const contractByPacket = new Map(
    contracts.map((contract) => [contract.visualizationPacketId, contract]),
  );
  const visualizationByNode = new Map(
    visualizations.evaluations.map((evaluation) => [evaluation.nodeId, evaluation]),
  );
  const evaluations = METRIC_DEPENDENCY_GRAPH.map((node): FitCoreInsightInteractionEvaluation => {
    const visualization = visualizationByNode.get(node.id);
    const contract = visualization?.packetId
      ? (contractByPacket.get(visualization.packetId) ?? null)
      : null;
    return {
      evaluationId: `${node.id}:interaction:evaluation`,
      nodeId: node.id,
      contractId: contract?.contractId ?? null,
      visualizationPacketId: contract?.visualizationPacketId ?? null,
      status: contract?.status ?? "unavailable",
      safeToInteract: contract?.safeToInteract ?? false,
      reasonKey: contract?.reasonKey ?? "analytics.interaction.reason.contract_unavailable",
      limitationKeys: contract
        ? [...contract.limitationKeys]
        : ["analytics.interaction.limitation.no_executable_ui_action"],
    };
  });
  const capabilityCount = (capability: InsightInteractionContract["capabilities"][number]) =>
    contracts.filter((contract) => contract.capabilities.includes(capability)).length;
  const summary: FitCoreInsightInteractionSummary = {
    evaluationCount: evaluations.length,
    contractCount: contracts.length,
    readyContractCount: contracts.filter((contract) => contract.status === "ready").length,
    limitedContractCount: contracts.filter((contract) => contract.status === "limited").length,
    unavailableContractCount: contracts.filter((contract) => contract.status === "unavailable")
      .length,
    safeToInteractCount: contracts.filter((contract) => contract.safeToInteract).length,
    inspectValueContractCount: capabilityCount("inspect_value"),
    switchWindowContractCount: capabilityCount("switch_window"),
    comparePeriodsContractCount: capabilityCount("compare_periods"),
    toggleSeriesContractCount: capabilityCount("toggle_series"),
    selectRegionContractCount: capabilityCount("select_region"),
    openDetailContractCount: capabilityCount("open_detail"),
    inspectableTargetCount: contracts.reduce(
      (sum, contract) => sum + contract.inspectableTargets.length,
      0,
    ),
    windowTargetCount: contracts.reduce(
      (sum, contract) => sum + contract.availableWindows.length,
      0,
    ),
    comparisonTargetCount: contracts.reduce(
      (sum, contract) => sum + contract.comparisonTargets.length,
      0,
    ),
    seriesTargetCount: contracts.reduce((sum, contract) => sum + contract.seriesTargets.length, 0),
    regionTargetCount: contracts.reduce((sum, contract) => sum + contract.regionTargets.length, 0),
    detailTargetCount: contracts.reduce((sum, contract) => sum + contract.detailTargets.length, 0),
  };
  return deepFreeze({
    policy: FITCORE_INSIGHT_INTERACTION_POLICY,
    visualizationPolicy: FITCORE_INSIGHT_VISUALIZATION_POLICY,
    evaluationAt: visualizations.evaluationAt,
    nodeCount: evaluations.length,
    evaluations,
    contracts,
    summary,
  });
}

export function resolveFitCoreInsightInteraction(
  source: FitCoreInsightInteractionReport | InsightInteractionContract,
  request: unknown,
): InsightInteractionResolution {
  const contractId =
    request &&
    typeof request === "object" &&
    typeof (request as { contractId?: unknown }).contractId === "string"
      ? (request as { contractId: string }).contractId
      : null;
  const contract =
    "contracts" in source
      ? (source.contracts.find((item) => item.contractId === contractId) ?? null)
      : source.contractId === contractId
        ? source
        : null;
  return resolveInteractionAgainstContract(contract, request);
}
