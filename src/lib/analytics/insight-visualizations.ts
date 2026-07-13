import {
  FITCORE_INSIGHT_EXPLANATION_POLICY,
  type InsightExplanationPacket,
} from "./insight-explanations";
import { FITCORE_INSIGHT_CANDIDATE_POLICY, type InsightCandidate } from "./insight-candidates";
import { FITCORE_INSIGHT_EVIDENCE_POLICY } from "./insight-evidence";
import type { RollingTrendWindow } from "./rolling-trends";

export const FITCORE_INSIGHT_VISUALIZATION_POLICY = "fitcore_insight_visualization_v1" as const;
export const INSIGHT_VISUALIZATION_STATUSES = Object.freeze([
  "unavailable",
  "partial",
  "ready",
] as const);
export const INSIGHT_VISUALIZATION_KINDS = Object.freeze([
  "none",
  "summary_metric",
  "trend_line",
  "comparison_bars",
  "progress_ring",
  "heatmap",
] as const);
export const INSIGHT_VISUALIZATION_DATA_MODES = Object.freeze([
  "none",
  "scalar",
  "comparison",
  "series",
  "matrix",
] as const);
export const INSIGHT_VISUALIZATION_INTERACTIONS = Object.freeze([
  "inspect_value",
  "switch_window",
  "compare_periods",
  "toggle_series",
  "select_region",
  "open_detail",
] as const);

export type InsightVisualizationStatus = (typeof INSIGHT_VISUALIZATION_STATUSES)[number];
export type InsightVisualizationKind = (typeof INSIGHT_VISUALIZATION_KINDS)[number];
export type InsightVisualizationDataMode = (typeof INSIGHT_VISUALIZATION_DATA_MODES)[number];
export type InsightVisualizationInteraction = (typeof INSIGHT_VISUALIZATION_INTERACTIONS)[number];

export interface InsightVisualizationScalarData {
  mode: "scalar";
  metricId: string;
  value: number;
  unit: string;
  minimum: number | null;
  maximum: number | null;
  window: RollingTrendWindow | null;
}

export interface InsightVisualizationComparisonItem {
  metricId: string;
  role: "current" | "previous" | "baseline";
  value: number;
  unit: string;
}

export interface InsightVisualizationComparisonData {
  mode: "comparison";
  items: InsightVisualizationComparisonItem[];
  window: RollingTrendWindow | null;
}

export interface InsightVisualizationSeriesPoint {
  xKey: string;
  value: number | null;
}

export interface InsightVisualizationSeries {
  seriesId: string;
  metricId: string;
  unit: string;
  points: InsightVisualizationSeriesPoint[];
}

export interface InsightVisualizationSeriesData {
  mode: "series";
  series: InsightVisualizationSeries[];
  windows: RollingTrendWindow[];
}

export interface InsightVisualizationMatrixCell {
  regionId: string;
  row: number;
  column: number;
  value: number | null;
}

export interface InsightVisualizationMatrixData {
  mode: "matrix";
  metricId: string;
  unit: string;
  cells: InsightVisualizationMatrixCell[];
}

export type InsightVisualizationDerivedData =
  | InsightVisualizationScalarData
  | InsightVisualizationComparisonData
  | InsightVisualizationSeriesData
  | InsightVisualizationMatrixData;

export type InsightVisualizationData = InsightVisualizationDerivedData | { mode: "none" };

export type InsightVisualizationReasonKey =
  | "analytics.visualization.reason.series_available"
  | "analytics.visualization.reason.comparison_available"
  | "analytics.visualization.reason.scalar_only"
  | "analytics.visualization.reason.matrix_available"
  | "analytics.visualization.reason.no_visualizable_data";

export type InsightVisualizationLimitationKey =
  | "analytics.visualization.limitation.insufficient_points"
  | "analytics.visualization.limitation.baseline_unavailable"
  | "analytics.visualization.limitation.incompatible_units"
  | "analytics.visualization.limitation.window_switch_unavailable"
  | "analytics.visualization.limitation.explanation_not_safe"
  | "analytics.visualization.limitation.dependency_unresolved"
  | "analytics.visualization.limitation.non_finite_value"
  | "analytics.visualization.limitation.candidate_not_selected"
  | "analytics.visualization.limitation.no_supported_data";

export interface InsightVisualizationPacket {
  policy: typeof FITCORE_INSIGHT_VISUALIZATION_POLICY;
  evidencePolicy: typeof FITCORE_INSIGHT_EVIDENCE_POLICY;
  candidatePolicy: typeof FITCORE_INSIGHT_CANDIDATE_POLICY;
  explanationPolicy: typeof FITCORE_INSIGHT_EXPLANATION_POLICY;
  packetId: string;
  candidateId: string;
  explanationId: string;
  nodeId: string;
  dependencyNodeIds: string[];
  status: InsightVisualizationStatus;
  visualizationKind: InsightVisualizationKind;
  dataMode: InsightVisualizationDataMode;
  data: InsightVisualizationData;
  metricIds: string[];
  units: string[];
  defaultWindow: RollingTrendWindow | null;
  availableWindows: RollingTrendWindow[];
  interactions: InsightVisualizationInteraction[];
  reasonKey: InsightVisualizationReasonKey;
  limitationKeys: InsightVisualizationLimitationKey[];
  accessibilityLabelKey: string;
  emptyStateKey: "analytics.visualization.empty.no_supported_values";
  safeToRender: boolean;
}

export interface InsightVisualizationPacketInput {
  candidate: InsightCandidate;
  explanation: InsightExplanationPacket;
  derivedData?: InsightVisualizationDerivedData | null;
}

const windowOrder: readonly RollingTrendWindow[] = ["days_7", "days_28", "days_90"];
const limitationOrder: readonly InsightVisualizationLimitationKey[] = [
  "analytics.visualization.limitation.candidate_not_selected",
  "analytics.visualization.limitation.explanation_not_safe",
  "analytics.visualization.limitation.dependency_unresolved",
  "analytics.visualization.limitation.non_finite_value",
  "analytics.visualization.limitation.incompatible_units",
  "analytics.visualization.limitation.insufficient_points",
  "analytics.visualization.limitation.baseline_unavailable",
  "analytics.visualization.limitation.window_switch_unavailable",
  "analytics.visualization.limitation.no_supported_data",
];

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function canonicalIdentifier(value: string): boolean {
  return /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(value);
}

function uniqueText(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function canonicalWindows(values: readonly RollingTrendWindow[]): RollingTrendWindow[] {
  const set = new Set(values);
  return windowOrder.filter((window) => set.has(window));
}

function canonicalLimitations(
  values: readonly InsightVisualizationLimitationKey[],
): InsightVisualizationLimitationKey[] {
  const set = new Set(values);
  return limitationOrder.filter((limitation) => set.has(limitation));
}

function inferredData(
  explanation: InsightExplanationPacket,
): InsightVisualizationDerivedData | null {
  const current = explanation.facts.find(
    (fact) => fact.labelKey === "fact.trend.current_value" && finite(fact.value),
  );
  const previous = explanation.facts.find(
    (fact) => fact.labelKey === "fact.trend.previous_value" && finite(fact.value),
  );
  const baseline = explanation.facts.find(
    (fact) => fact.labelKey === "fact.baseline.center" && finite(fact.value),
  );
  if (current && previous && current.unit && current.unit === previous.unit) {
    return {
      mode: "comparison",
      items: [
        {
          metricId: explanation.nodeId,
          role: "current",
          value: current.value as number,
          unit: current.unit,
        },
        {
          metricId: explanation.nodeId,
          role: "previous",
          value: previous.value as number,
          unit: previous.unit,
        },
      ],
      window: explanation.primaryWindow,
    };
  }
  if (current && baseline && current.unit && current.unit === baseline.unit) {
    return {
      mode: "comparison",
      items: [
        {
          metricId: explanation.nodeId,
          role: "current",
          value: current.value as number,
          unit: current.unit,
        },
        {
          metricId: explanation.nodeId,
          role: "baseline",
          value: baseline.value as number,
          unit: baseline.unit,
        },
      ],
      window: explanation.primaryWindow,
    };
  }
  if (current && current.unit) {
    return {
      mode: "scalar",
      metricId: explanation.nodeId,
      value: current.value as number,
      unit: current.unit,
      minimum: null,
      maximum: null,
      window: explanation.primaryWindow,
    };
  }
  return null;
}

interface NormalizedVisualization {
  kind: InsightVisualizationKind;
  mode: InsightVisualizationDataMode;
  data: InsightVisualizationData;
  metricIds: string[];
  units: string[];
  windows: RollingTrendWindow[];
  status: InsightVisualizationStatus;
  reasonKey: InsightVisualizationReasonKey;
  limitations: InsightVisualizationLimitationKey[];
  inspectable: boolean;
  comparison: boolean;
  seriesCount: number;
  selectableRegions: boolean;
}

function unavailable(
  limitations: readonly InsightVisualizationLimitationKey[],
): NormalizedVisualization {
  return {
    kind: "none",
    mode: "none",
    data: { mode: "none" },
    metricIds: [],
    units: [],
    windows: [],
    status: "unavailable",
    reasonKey: "analytics.visualization.reason.no_visualizable_data",
    limitations: canonicalLimitations(limitations),
    inspectable: false,
    comparison: false,
    seriesCount: 0,
    selectableRegions: false,
  };
}

function normalizeData(data: InsightVisualizationDerivedData | null): NormalizedVisualization {
  if (!data) return unavailable(["analytics.visualization.limitation.no_supported_data"]);
  if (data.mode === "scalar") {
    if (
      !finite(data.value) ||
      (data.minimum !== null && !finite(data.minimum)) ||
      (data.maximum !== null && !finite(data.maximum))
    )
      return unavailable(["analytics.visualization.limitation.non_finite_value"]);
    if (!canonicalIdentifier(data.metricId) || !canonicalIdentifier(data.unit))
      return unavailable(["analytics.visualization.limitation.incompatible_units"]);
    const boundedPercent =
      data.unit === "percent" &&
      data.minimum === 0 &&
      data.maximum === 100 &&
      data.value >= data.minimum &&
      data.value <= data.maximum;
    const normalized: InsightVisualizationScalarData = {
      mode: "scalar",
      metricId: data.metricId,
      value: data.value,
      unit: data.unit,
      minimum: data.minimum,
      maximum: data.maximum,
      window: data.window,
    };
    return {
      kind: boundedPercent ? "progress_ring" : "summary_metric",
      mode: "scalar",
      data: normalized,
      metricIds: [data.metricId],
      units: [data.unit],
      windows: data.window ? [data.window] : [],
      status: "ready",
      reasonKey: "analytics.visualization.reason.scalar_only",
      limitations: [],
      inspectable: true,
      comparison: false,
      seriesCount: 0,
      selectableRegions: false,
    };
  }
  if (data.mode === "comparison") {
    const roleRank = { current: 0, previous: 1, baseline: 2 } as const;
    const items = [
      ...new Map(
        data.items.map((item) => [
          `${item.metricId}|${item.role}|${item.value}|${item.unit}`,
          { ...item },
        ]),
      ).values(),
    ].sort(
      (left, right) =>
        compareText(left.metricId, right.metricId) || roleRank[left.role] - roleRank[right.role],
    );
    if (items.length < 2)
      return unavailable(["analytics.visualization.limitation.insufficient_points"]);
    if (items.some((item) => !finite(item.value)))
      return unavailable(["analytics.visualization.limitation.non_finite_value"]);
    if (
      items.some(
        (item) => !canonicalIdentifier(item.metricId) || !canonicalIdentifier(item.unit),
      ) ||
      new Set(items.map((item) => item.unit)).size !== 1 ||
      new Set(items.map((item) => item.role)).size !== items.length
    )
      return unavailable(["analytics.visualization.limitation.incompatible_units"]);
    return {
      kind: "comparison_bars",
      mode: "comparison",
      data: { mode: "comparison", items, window: data.window },
      metricIds: uniqueText(items.map((item) => item.metricId)),
      units: uniqueText(items.map((item) => item.unit)),
      windows: data.window ? [data.window] : [],
      status: "ready",
      reasonKey: "analytics.visualization.reason.comparison_available",
      limitations: [],
      inspectable: true,
      comparison: true,
      seriesCount: 0,
      selectableRegions: false,
    };
  }
  if (data.mode === "series") {
    const conflictingPoint = data.series.some((item) => {
      const byKey = new Map<string, number | null>();
      return item.points.some((point) => {
        if (!byKey.has(point.xKey)) {
          byKey.set(point.xKey, point.value);
          return false;
        }
        return byKey.get(point.xKey) !== point.value;
      });
    });
    if (conflictingPoint)
      return unavailable(["analytics.visualization.limitation.no_supported_data"]);
    const series = [...data.series]
      .map((item) => ({
        seriesId: item.seriesId,
        metricId: item.metricId,
        unit: item.unit,
        points: [...new Map(item.points.map((point) => [point.xKey, { ...point }])).values()].sort(
          (a, b) => compareText(a.xKey, b.xKey),
        ),
      }))
      .sort((a, b) => compareText(a.seriesId, b.seriesId));
    const units = uniqueText(series.map((item) => item.unit));
    if (
      !series.length ||
      series.some(
        (item) =>
          !canonicalIdentifier(item.seriesId) ||
          !canonicalIdentifier(item.metricId) ||
          !canonicalIdentifier(item.unit) ||
          item.points.some((point) => !canonicalIdentifier(point.xKey)),
      ) ||
      units.length !== 1
    )
      return unavailable(["analytics.visualization.limitation.incompatible_units"]);
    if (
      series.some((item) =>
        item.points.some((point) => point.value !== null && !finite(point.value)),
      )
    )
      return unavailable(["analytics.visualization.limitation.non_finite_value"]);
    const finitePointCount = series.reduce(
      (sum, item) => sum + item.points.filter((point) => finite(point.value)).length,
      0,
    );
    if (!series.some((item) => item.points.filter((point) => finite(point.value)).length >= 2))
      return unavailable(["analytics.visualization.limitation.insufficient_points"]);
    const hasGaps = series.some((item) => item.points.some((point) => point.value === null));
    return {
      kind: "trend_line",
      mode: "series",
      data: { mode: "series", series, windows: canonicalWindows(data.windows) },
      metricIds: uniqueText(series.map((item) => item.metricId)),
      units,
      windows: canonicalWindows(data.windows),
      status: hasGaps ? "partial" : "ready",
      reasonKey: "analytics.visualization.reason.series_available",
      limitations: hasGaps ? ["analytics.visualization.limitation.insufficient_points"] : [],
      inspectable: finitePointCount > 0,
      comparison: false,
      seriesCount: series.length,
      selectableRegions: false,
    };
  }
  const regionValues = new Map<string, number | null>();
  const conflictingRegion = data.cells.some((cell) => {
    if (!regionValues.has(cell.regionId)) {
      regionValues.set(cell.regionId, cell.value);
      return false;
    }
    return regionValues.get(cell.regionId) !== cell.value;
  });
  if (conflictingRegion)
    return unavailable(["analytics.visualization.limitation.no_supported_data"]);
  const cells = [...new Map(data.cells.map((cell) => [cell.regionId, { ...cell }])).values()].sort(
    (a, b) => compareText(a.regionId, b.regionId),
  );
  if (!canonicalIdentifier(data.metricId) || !canonicalIdentifier(data.unit) || !cells.length)
    return unavailable(["analytics.visualization.limitation.no_supported_data"]);
  if (
    cells.some(
      (cell) =>
        !canonicalIdentifier(cell.regionId) ||
        !Number.isInteger(cell.row) ||
        cell.row < 0 ||
        !Number.isInteger(cell.column) ||
        cell.column < 0 ||
        (cell.value !== null && !finite(cell.value)),
    )
  )
    return unavailable(["analytics.visualization.limitation.non_finite_value"]);
  if (!cells.some((cell) => finite(cell.value)))
    return unavailable(["analytics.visualization.limitation.no_supported_data"]);
  const hasGaps = cells.some((cell) => cell.value === null);
  return {
    kind: "heatmap",
    mode: "matrix",
    data: { mode: "matrix", metricId: data.metricId, unit: data.unit, cells },
    metricIds: [data.metricId],
    units: [data.unit],
    windows: [],
    status: hasGaps ? "partial" : "ready",
    reasonKey: "analytics.visualization.reason.matrix_available",
    limitations: hasGaps ? ["analytics.visualization.limitation.insufficient_points"] : [],
    inspectable: true,
    comparison: false,
    seriesCount: 0,
    selectableRegions: true,
  };
}

function modeMatches(kind: InsightVisualizationKind, mode: InsightVisualizationDataMode): boolean {
  return (
    (kind === "none" && mode === "none") ||
    ((kind === "summary_metric" || kind === "progress_ring") && mode === "scalar") ||
    (kind === "trend_line" && mode === "series") ||
    (kind === "comparison_bars" && mode === "comparison") ||
    (kind === "heatmap" && mode === "matrix")
  );
}

function accessibilityKey(kind: InsightVisualizationKind): string {
  if (kind === "trend_line") return "analytics.visualization.accessibility.trend";
  if (kind === "comparison_bars") return "analytics.visualization.accessibility.comparison";
  if (kind === "progress_ring") return "analytics.visualization.accessibility.progress";
  if (kind === "heatmap") return "analytics.visualization.accessibility.matrix";
  if (kind === "summary_metric") return "analytics.visualization.accessibility.summary";
  return "analytics.visualization.accessibility.unavailable";
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach((item) => deepFreeze(item));
  return Object.freeze(value);
}

export function buildInsightVisualizationPacket(
  input: InsightVisualizationPacketInput,
): InsightVisualizationPacket {
  const normalized = normalizeData(
    input.derivedData === undefined ? inferredData(input.explanation) : input.derivedData,
  );
  const limitations = [...normalized.limitations];
  if (input.candidate.status !== "selected")
    limitations.push("analytics.visualization.limitation.candidate_not_selected");
  if (!input.explanation.safeToPresent)
    limitations.push("analytics.visualization.limitation.explanation_not_safe");
  if (
    input.explanation.attribution.reasons.some((reason) => reason.code === "dependency_unresolved")
  )
    limitations.push("analytics.visualization.limitation.dependency_unresolved");
  if (normalized.windows.length < 2 && normalized.kind === "trend_line")
    limitations.push("analytics.visualization.limitation.window_switch_unavailable");
  const interactions = new Set<InsightVisualizationInteraction>();
  const dependenciesResolved = !input.explanation.attribution.reasons.some(
    (reason) => reason.code === "dependency_unresolved",
  );
  if (normalized.inspectable) interactions.add("inspect_value");
  if (normalized.windows.length >= 2) interactions.add("switch_window");
  if (normalized.comparison) interactions.add("compare_periods");
  if (normalized.seriesCount >= 2) interactions.add("toggle_series");
  if (normalized.selectableRegions) interactions.add("select_region");
  if (input.explanation.attribution.dependencyNodeIds.length && dependenciesResolved)
    interactions.add("open_detail");
  const orderedInteractions = INSIGHT_VISUALIZATION_INTERACTIONS.filter((interaction) =>
    interactions.has(interaction),
  );
  const safeToRender =
    input.candidate.status === "selected" &&
    input.explanation.safeToPresent &&
    normalized.status === "ready" &&
    normalized.kind !== "none" &&
    modeMatches(normalized.kind, normalized.mode) &&
    dependenciesResolved;
  const availableWindows = canonicalWindows(normalized.windows);
  return deepFreeze({
    policy: FITCORE_INSIGHT_VISUALIZATION_POLICY,
    evidencePolicy: FITCORE_INSIGHT_EVIDENCE_POLICY,
    candidatePolicy: FITCORE_INSIGHT_CANDIDATE_POLICY,
    explanationPolicy: FITCORE_INSIGHT_EXPLANATION_POLICY,
    packetId: `${input.candidate.candidateId}:visualization:${normalized.kind}`,
    candidateId: input.candidate.candidateId,
    explanationId: input.explanation.explanationId,
    nodeId: input.candidate.nodeId,
    dependencyNodeIds: uniqueText(input.explanation.attribution.dependencyNodeIds),
    status: normalized.status,
    visualizationKind: normalized.kind,
    dataMode: normalized.mode,
    data: normalized.data,
    metricIds: [...normalized.metricIds],
    units: [...normalized.units],
    defaultWindow:
      input.candidate.primaryWindow !== null &&
      availableWindows.includes(input.candidate.primaryWindow)
        ? input.candidate.primaryWindow
        : (availableWindows[0] ?? null),
    availableWindows,
    interactions: [...orderedInteractions],
    reasonKey: normalized.reasonKey,
    limitationKeys: canonicalLimitations(limitations),
    accessibilityLabelKey: accessibilityKey(normalized.kind),
    emptyStateKey: "analytics.visualization.empty.no_supported_values",
    safeToRender,
  });
}

export function isVisualizationKindModeCompatible(
  kind: InsightVisualizationKind,
  mode: InsightVisualizationDataMode,
): boolean {
  return modeMatches(kind, mode);
}
