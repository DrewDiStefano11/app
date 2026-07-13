import {
  FITCORE_INSIGHT_VISUALIZATION_POLICY,
  INSIGHT_VISUALIZATION_INTERACTIONS,
  type InsightVisualizationInteraction,
  type InsightVisualizationPacket,
} from "./insight-visualizations";
import type { RollingTrendWindow } from "./rolling-trends";

export const FITCORE_INSIGHT_INTERACTION_POLICY = "fitcore_insight_interaction_v1" as const;
export const INSIGHT_INTERACTION_CONTRACT_STATUSES = Object.freeze([
  "unavailable",
  "limited",
  "ready",
] as const);
export const INSIGHT_INTERACTION_REQUEST_KINDS = Object.freeze([
  "inspect_value",
  "switch_window",
  "compare_periods",
  "toggle_series",
  "select_region",
  "open_detail",
] as const);
export const INSIGHT_INTERACTION_RESOLUTION_STATUSES = Object.freeze([
  "accepted",
  "rejected",
  "unavailable",
] as const);

export type InsightInteractionContractStatus =
  (typeof INSIGHT_INTERACTION_CONTRACT_STATUSES)[number];
export type InsightInteractionRequestKind = (typeof INSIGHT_INTERACTION_REQUEST_KINDS)[number];
export type InsightInteractionResolutionStatus =
  (typeof INSIGHT_INTERACTION_RESOLUTION_STATUSES)[number];
export type InsightInspectableTargetType =
  | "scalar"
  | "comparison_value"
  | "series_point"
  | "matrix_cell";

export interface InsightInspectableTarget {
  targetId: string;
  targetType: InsightInspectableTargetType;
  metricId: string;
  unit: string;
  value: number;
  comparisonRole: "current" | "previous" | "baseline" | null;
  seriesId: string | null;
  pointKey: string | null;
  regionId: string | null;
}

export interface InsightComparisonTarget {
  targetId: string;
  metricIds: string[];
  unit: string;
}

export interface InsightSeriesTarget {
  targetId: string;
  seriesId: string;
  metricId: string;
  unit: string;
}

export interface InsightRegionTarget {
  targetId: string;
  regionId: string;
  metricId: string;
  unit: string;
}

export interface InsightDetailTarget {
  targetId: string;
  nodeId: string;
}

export type InsightInteractionReasonKey =
  | "analytics.interaction.reason.ready"
  | "analytics.interaction.reason.limited"
  | "analytics.interaction.reason.contract_unavailable"
  | "analytics.interaction.reason.accepted"
  | "analytics.interaction.reason.capability_unavailable"
  | "analytics.interaction.reason.target_not_found"
  | "analytics.interaction.reason.packet_not_safe"
  | "analytics.interaction.reason.series_gap"
  | "analytics.interaction.reason.window_unavailable"
  | "analytics.interaction.reason.comparison_unavailable"
  | "analytics.interaction.reason.region_unavailable"
  | "analytics.interaction.reason.detail_target_unavailable"
  | "analytics.interaction.reason.minimum_series_required"
  | "analytics.interaction.reason.malformed_request";

export type InsightInteractionLimitationKey =
  | "analytics.interaction.limitation.no_executable_ui_action"
  | "analytics.interaction.limitation.no_navigation_performed"
  | "analytics.interaction.limitation.selection_not_persisted"
  | "analytics.interaction.limitation.packet_not_safe"
  | "analytics.interaction.limitation.targets_limited";

export interface InsightInteractionContract {
  policy: typeof FITCORE_INSIGHT_INTERACTION_POLICY;
  visualizationPolicy: typeof FITCORE_INSIGHT_VISUALIZATION_POLICY;
  contractId: string;
  visualizationPacketId: string;
  candidateId: string;
  explanationId: string;
  nodeId: string;
  status: InsightInteractionContractStatus;
  declaredCapabilities: InsightVisualizationInteraction[];
  capabilities: InsightVisualizationInteraction[];
  inspectableTargets: InsightInspectableTarget[];
  missingInspectTargetIds: string[];
  availableWindows: RollingTrendWindow[];
  comparisonTargets: InsightComparisonTarget[];
  seriesTargets: InsightSeriesTarget[];
  regionTargets: InsightRegionTarget[];
  detailTargets: InsightDetailTarget[];
  safeToInteract: boolean;
  reasonKey: InsightInteractionReasonKey;
  limitationKeys: InsightInteractionLimitationKey[];
}

export type InsightInteractionRequest =
  | {
      kind: "inspect_value";
      contractId: string;
      targetType: InsightInspectableTargetType;
      targetId: string;
    }
  | { kind: "switch_window"; contractId: string; window: RollingTrendWindow }
  | { kind: "compare_periods"; contractId: string; comparisonId: string }
  | { kind: "toggle_series"; contractId: string; seriesId: string; selected: boolean }
  | { kind: "select_region"; contractId: string; regionId: string }
  | { kind: "open_detail"; contractId: string; nodeId: string };

export type InsightInteractionResolvedTarget =
  | ({ targetType: InsightInspectableTargetType } & InsightInspectableTarget)
  | { targetType: "window"; targetId: string; window: RollingTrendWindow }
  | { targetType: "comparison"; targetId: string; metricIds: string[]; unit: string }
  | { targetType: "series"; targetId: string; seriesId: string; selected: boolean }
  | { targetType: "region"; targetId: string; regionId: string }
  | { targetType: "detail"; targetId: string; nodeId: string };

export interface InsightInteractionResolution {
  policy: typeof FITCORE_INSIGHT_INTERACTION_POLICY;
  visualizationPolicy: typeof FITCORE_INSIGHT_VISUALIZATION_POLICY;
  resolutionId: string;
  status: InsightInteractionResolutionStatus;
  requestKind: InsightInteractionRequestKind | null;
  contractId: string | null;
  visualizationPacketId: string | null;
  candidateId: string | null;
  nodeId: string | null;
  reasonKey: InsightInteractionReasonKey;
  limitationKeys: InsightInteractionLimitationKey[];
  resolvedTarget: InsightInteractionResolvedTarget | null;
}

const limitationOrder: readonly InsightInteractionLimitationKey[] = [
  "analytics.interaction.limitation.no_executable_ui_action",
  "analytics.interaction.limitation.no_navigation_performed",
  "analytics.interaction.limitation.selection_not_persisted",
  "analytics.interaction.limitation.packet_not_safe",
  "analytics.interaction.limitation.targets_limited",
];

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach((item) => deepFreeze(item));
  return Object.freeze(value);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function limitations(values: readonly InsightInteractionLimitationKey[]) {
  const set = new Set(values);
  return limitationOrder.filter((item) => set.has(item));
}

function inspectTargetId(packetId: string, type: InsightInspectableTargetType, key: string) {
  return `${packetId}:inspect:${type}:${key}`;
}

/** Builds a minimal target catalog solely from one frozen-safe Task 17 packet. */
export function buildInsightInteractionContract(
  packet: InsightVisualizationPacket,
): InsightInteractionContract {
  const inspectableTargets: InsightInspectableTarget[] = [];
  const missingInspectTargetIds: string[] = [];
  const comparisonTargets: InsightComparisonTarget[] = [];
  const seriesTargets: InsightSeriesTarget[] = [];
  const regionTargets: InsightRegionTarget[] = [];
  if (packet.data.mode === "scalar" && finite(packet.data.value)) {
    inspectableTargets.push({
      targetId: inspectTargetId(packet.packetId, "scalar", packet.data.metricId),
      targetType: "scalar",
      metricId: packet.data.metricId,
      unit: packet.data.unit,
      value: packet.data.value,
      comparisonRole: null,
      seriesId: null,
      pointKey: null,
      regionId: null,
    });
  }
  if (packet.data.mode === "comparison") {
    for (const item of packet.data.items) {
      if (!finite(item.value)) continue;
      inspectableTargets.push({
        targetId: inspectTargetId(
          packet.packetId,
          "comparison_value",
          `${item.role}:${item.metricId}`,
        ),
        targetType: "comparison_value",
        metricId: item.metricId,
        unit: item.unit,
        value: item.value,
        comparisonRole: item.role,
        seriesId: null,
        pointKey: null,
        regionId: null,
      });
    }
    const units = uniqueSorted(packet.data.items.map((item) => item.unit));
    if (
      packet.data.items.length >= 2 &&
      units.length === 1 &&
      packet.data.items.every((item) => finite(item.value))
    )
      comparisonTargets.push({
        targetId: `${packet.packetId}:comparison`,
        metricIds: uniqueSorted(packet.data.items.map((item) => item.metricId)),
        unit: units[0],
      });
  }
  if (packet.data.mode === "series") {
    for (const series of packet.data.series) {
      seriesTargets.push({
        targetId: `${packet.packetId}:series:${series.seriesId}`,
        seriesId: series.seriesId,
        metricId: series.metricId,
        unit: series.unit,
      });
      for (const point of series.points) {
        const targetId = inspectTargetId(
          packet.packetId,
          "series_point",
          `${series.seriesId}:${point.xKey}`,
        );
        if (!finite(point.value)) {
          missingInspectTargetIds.push(targetId);
          continue;
        }
        inspectableTargets.push({
          targetId,
          targetType: "series_point",
          metricId: series.metricId,
          unit: series.unit,
          value: point.value,
          comparisonRole: null,
          seriesId: series.seriesId,
          pointKey: point.xKey,
          regionId: null,
        });
      }
    }
  }
  if (packet.data.mode === "matrix") {
    for (const cell of packet.data.cells) {
      const targetId = inspectTargetId(packet.packetId, "matrix_cell", cell.regionId);
      regionTargets.push({
        targetId: `${packet.packetId}:region:${cell.regionId}`,
        regionId: cell.regionId,
        metricId: packet.data.metricId,
        unit: packet.data.unit,
      });
      if (!finite(cell.value)) {
        missingInspectTargetIds.push(targetId);
        continue;
      }
      inspectableTargets.push({
        targetId,
        targetType: "matrix_cell",
        metricId: packet.data.metricId,
        unit: packet.data.unit,
        value: cell.value,
        comparisonRole: null,
        seriesId: null,
        pointKey: null,
        regionId: cell.regionId,
      });
    }
  }
  const detailTargets = packet.dependencyNodeIds.map((nodeId) => ({
    targetId: `${packet.packetId}:detail:${nodeId}`,
    nodeId,
  }));
  const declaredCapabilities = INSIGHT_VISUALIZATION_INTERACTIONS.filter((capability) =>
    packet.interactions.includes(capability),
  );
  const supported = new Set<InsightVisualizationInteraction>();
  if (inspectableTargets.length) supported.add("inspect_value");
  if (packet.availableWindows.length >= 2) supported.add("switch_window");
  if (comparisonTargets.length) supported.add("compare_periods");
  if (seriesTargets.length >= 2) supported.add("toggle_series");
  if (regionTargets.length && packet.data.mode === "matrix") supported.add("select_region");
  if (detailTargets.length) supported.add("open_detail");
  const capabilities =
    packet.status === "unavailable"
      ? []
      : declaredCapabilities.filter((capability) => supported.has(capability));
  const allDeclaredValid = capabilities.length === declaredCapabilities.length;
  const safeToInteract =
    packet.status === "ready" && packet.safeToRender && capabilities.length > 0 && allDeclaredValid;
  const status: InsightInteractionContractStatus = safeToInteract
    ? "ready"
    : capabilities.length
      ? "limited"
      : "unavailable";
  const limitationKeys: InsightInteractionLimitationKey[] = [
    "analytics.interaction.limitation.no_executable_ui_action",
  ];
  if (capabilities.includes("open_detail"))
    limitationKeys.push("analytics.interaction.limitation.no_navigation_performed");
  if (capabilities.includes("toggle_series"))
    limitationKeys.push("analytics.interaction.limitation.selection_not_persisted");
  if (!packet.safeToRender) limitationKeys.push("analytics.interaction.limitation.packet_not_safe");
  if (!allDeclaredValid) limitationKeys.push("analytics.interaction.limitation.targets_limited");
  return deepFreeze({
    policy: FITCORE_INSIGHT_INTERACTION_POLICY,
    visualizationPolicy: FITCORE_INSIGHT_VISUALIZATION_POLICY,
    contractId: `${packet.packetId}:interaction`,
    visualizationPacketId: packet.packetId,
    candidateId: packet.candidateId,
    explanationId: packet.explanationId,
    nodeId: packet.nodeId,
    status,
    declaredCapabilities: [...declaredCapabilities],
    capabilities: [...capabilities],
    inspectableTargets: inspectableTargets.sort((a, b) => compareText(a.targetId, b.targetId)),
    missingInspectTargetIds: uniqueSorted(missingInspectTargetIds),
    availableWindows: [...packet.availableWindows],
    comparisonTargets,
    seriesTargets: seriesTargets.sort((a, b) => compareText(a.seriesId, b.seriesId)),
    regionTargets: regionTargets.sort((a, b) => compareText(a.regionId, b.regionId)),
    detailTargets: detailTargets.sort((a, b) => compareText(a.nodeId, b.nodeId)),
    safeToInteract,
    reasonKey:
      status === "ready"
        ? "analytics.interaction.reason.ready"
        : status === "limited"
          ? "analytics.interaction.reason.limited"
          : "analytics.interaction.reason.contract_unavailable",
    limitationKeys: limitations(limitationKeys),
  });
}

function requestKind(value: unknown): InsightInteractionRequestKind | null {
  if (!value || typeof value !== "object") return null;
  const kind = (value as { kind?: unknown }).kind;
  return INSIGHT_INTERACTION_REQUEST_KINDS.find((item) => item === kind) ?? null;
}

function baseResolution(
  contract: InsightInteractionContract | null,
  kind: InsightInteractionRequestKind | null,
  status: InsightInteractionResolutionStatus,
  reasonKey: InsightInteractionReasonKey,
  target: InsightInteractionResolvedTarget | null = null,
): InsightInteractionResolution {
  return deepFreeze({
    policy: FITCORE_INSIGHT_INTERACTION_POLICY,
    visualizationPolicy: FITCORE_INSIGHT_VISUALIZATION_POLICY,
    resolutionId: contract
      ? `${contract.contractId}:resolution:${kind ?? "invalid"}:${target?.targetId ?? "none"}`
      : `${FITCORE_INSIGHT_INTERACTION_POLICY}:resolution:unavailable`,
    status,
    requestKind: kind,
    contractId: contract?.contractId ?? null,
    visualizationPacketId: contract?.visualizationPacketId ?? null,
    candidateId: contract?.candidateId ?? null,
    nodeId: contract?.nodeId ?? null,
    reasonKey,
    limitationKeys: limitations([
      "analytics.interaction.limitation.no_executable_ui_action",
      ...(kind === "open_detail"
        ? (["analytics.interaction.limitation.no_navigation_performed"] as const)
        : []),
      ...(kind === "toggle_series"
        ? (["analytics.interaction.limitation.selection_not_persisted"] as const)
        : []),
    ]),
    resolvedTarget: target,
  });
}

export function resolveInteractionAgainstContract(
  contract: InsightInteractionContract | null,
  request: unknown,
): InsightInteractionResolution {
  const kind = requestKind(request);
  if (!contract)
    return baseResolution(
      null,
      kind,
      "unavailable",
      "analytics.interaction.reason.contract_unavailable",
    );
  if (!kind)
    return baseResolution(
      contract,
      null,
      "rejected",
      "analytics.interaction.reason.malformed_request",
    );
  if (!contract.capabilities.includes(kind))
    return baseResolution(
      contract,
      kind,
      "unavailable",
      "analytics.interaction.reason.capability_unavailable",
    );
  const value = request as Record<string, unknown>;
  if (kind === "inspect_value") {
    const target = contract.inspectableTargets.find(
      (item) => item.targetId === value.targetId && item.targetType === value.targetType,
    );
    if (target)
      return baseResolution(contract, kind, "accepted", "analytics.interaction.reason.accepted", {
        ...target,
        targetType: target.targetType,
      });
    if (
      typeof value.targetId === "string" &&
      contract.missingInspectTargetIds.includes(value.targetId)
    )
      return baseResolution(contract, kind, "rejected", "analytics.interaction.reason.series_gap");
    return baseResolution(
      contract,
      kind,
      "rejected",
      "analytics.interaction.reason.target_not_found",
    );
  }
  if (kind === "switch_window") {
    const window = contract.availableWindows.find((item) => item === value.window);
    if (window && contract.availableWindows.length >= 2)
      return baseResolution(contract, kind, "accepted", "analytics.interaction.reason.accepted", {
        targetType: "window",
        targetId: `${contract.visualizationPacketId}:window:${window}`,
        window,
      });
    return baseResolution(
      contract,
      kind,
      "rejected",
      "analytics.interaction.reason.window_unavailable",
    );
  }
  if (kind === "compare_periods") {
    const target = contract.comparisonTargets.find((item) => item.targetId === value.comparisonId);
    if (target)
      return baseResolution(contract, kind, "accepted", "analytics.interaction.reason.accepted", {
        targetType: "comparison",
        targetId: target.targetId,
        metricIds: [...target.metricIds],
        unit: target.unit,
      });
    return baseResolution(
      contract,
      kind,
      "rejected",
      "analytics.interaction.reason.comparison_unavailable",
    );
  }
  if (kind === "toggle_series") {
    const target = contract.seriesTargets.find((item) => item.seriesId === value.seriesId);
    if (target && typeof value.selected === "boolean" && contract.seriesTargets.length >= 2)
      return baseResolution(contract, kind, "accepted", "analytics.interaction.reason.accepted", {
        targetType: "series",
        targetId: target.targetId,
        seriesId: target.seriesId,
        selected: value.selected,
      });
    return baseResolution(
      contract,
      kind,
      "rejected",
      "analytics.interaction.reason.minimum_series_required",
    );
  }
  if (kind === "select_region") {
    const target = contract.regionTargets.find((item) => item.regionId === value.regionId);
    if (target)
      return baseResolution(contract, kind, "accepted", "analytics.interaction.reason.accepted", {
        targetType: "region",
        targetId: target.targetId,
        regionId: target.regionId,
      });
    return baseResolution(
      contract,
      kind,
      "rejected",
      "analytics.interaction.reason.region_unavailable",
    );
  }
  const target = contract.detailTargets.find((item) => item.nodeId === value.nodeId);
  if (target)
    return baseResolution(contract, kind, "accepted", "analytics.interaction.reason.accepted", {
      targetType: "detail",
      targetId: target.targetId,
      nodeId: target.nodeId,
    });
  return baseResolution(
    contract,
    kind,
    "rejected",
    "analytics.interaction.reason.detail_target_unavailable",
  );
}
