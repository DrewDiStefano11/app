import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_INSIGHT_VISUALIZATION_POLICY,
  INSIGHT_VISUALIZATION_DATA_MODES,
  INSIGHT_VISUALIZATION_INTERACTIONS,
  INSIGHT_VISUALIZATION_KINDS,
  INSIGHT_VISUALIZATION_STATUSES,
  buildInsightVisualizationPacket,
  isVisualizationKindModeCompatible,
  type InsightCandidate,
  type InsightExplanationPacket,
  type InsightVisualizationDerivedData,
} from "../../src/lib/analytics.ts";

const NODE = "nutrition.protein.consistency";

function candidate(status: "selected" | "eligible" = "selected"): InsightCandidate {
  return {
    policy: "fitcore_insight_candidate_v1",
    candidateId: `${NODE}:meaningful_increase`,
    nodeId: NODE,
    status,
    observationType: "meaningful_increase",
    titleKey: "insight.meaningful_increase.title",
    summaryKey: "insight.meaningful_increase.summary",
    direction: "increasing",
    primaryWindow: "days_7",
    evidenceStrength: "well_supported",
    reviewPriority: "high",
    sourceNodeIds: [NODE, "nutrition.detail.source"],
    supportingLayerCount: 2,
    evidence: {
      policy: "fitcore_insight_evidence_v1",
      nodeId: NODE,
      status: "complete",
      metricValue: 110,
      unit: "grams",
      baselineStatus: "ready",
      baselineCenter: 95,
      trendStatus: "ready",
      trendDirection: "increasing",
      trendWindow: "days_7",
      trendSupportingWindowCount: 1,
      anomalyStatus: "unavailable",
      anomalyClassification: "unavailable",
      changeStatus: "ready",
      changeClassification: "meaningful_increase",
      trustScore: 0.85,
      trustLevel: "high",
      freshnessState: "fresh",
      traceability: 0.9,
      provenanceTypes: ["manual"],
      insightReadiness: "ready",
      dependencyNodeIds: ["nutrition.detail.source"],
      sourceTypes: [
        "metric_value",
        "rolling_trend",
        "meaningful_change",
        "trust",
        "provenance",
        "insight_readiness",
        "dependency_context",
      ],
      reasons: [{ code: "evidence_complete", message: "complete" }],
    },
    reasons: [
      {
        code: status === "selected" ? "candidate_selected" : "candidate_eligible",
        message: status,
      },
    ],
  };
}

function explanation(safeToPresent = true, unresolved = false): InsightExplanationPacket {
  return {
    policy: "fitcore_insight_explanation_v1",
    explanationId: `${candidate().candidateId}:explanation`,
    candidateId: candidate().candidateId,
    nodeId: NODE,
    status: safeToPresent ? "complete" : "partial",
    observationType: "meaningful_increase",
    claimKey: "explanation.meaningful_increase.claim",
    summaryKey: "explanation.meaningful_increase.summary",
    whyShownKey: "explanation.meaningful_increase.why_shown",
    direction: "increasing",
    primaryWindow: "days_7",
    facts: [
      {
        factId: "current",
        kind: "rolling_change",
        labelKey: "fact.trend.current_value",
        value: 110,
        comparisonValue: null,
        unit: "grams",
        direction: "increasing",
        window: "days_7",
        sourceNodeIds: [NODE],
      },
      {
        factId: "previous",
        kind: "rolling_change",
        labelKey: "fact.trend.previous_value",
        value: 100,
        comparisonValue: null,
        unit: "grams",
        direction: "increasing",
        window: "days_7",
        sourceNodeIds: [NODE],
      },
    ],
    attribution: {
      policy: "fitcore_evidence_attribution_v1",
      attributionId: `${NODE}:attribution`,
      nodeId: NODE,
      role: "aggregate",
      sourceTypes: ["manual"],
      dependencyNodeIds: ["nutrition.detail.source"],
      trustScore: 0.85,
      trustLevel: "high",
      freshnessState: "fresh",
      traceability: 0.9,
      status: unresolved ? "partial" : "complete",
      reasons: unresolved
        ? [
            {
              code: "dependency_unresolved",
              messageKey: "attribution.reason.dependency_unresolved",
            },
          ]
        : [{ code: "attribution_complete", messageKey: "attribution.reason.attribution_complete" }],
    },
    limitations: [],
    safeToPresent,
    reasons: [],
  };
}

function packet(
  data?: InsightVisualizationDerivedData | null,
  safe = true,
  status: "selected" | "eligible" = "selected",
  unresolved = false,
) {
  return buildInsightVisualizationPacket({
    candidate: candidate(status),
    explanation: explanation(safe, unresolved),
    derivedData: data,
  });
}

test("Task 17 policy and closed vocabularies are exact", () => {
  assert.equal(FITCORE_INSIGHT_VISUALIZATION_POLICY, "fitcore_insight_visualization_v1");
  assert.deepEqual(INSIGHT_VISUALIZATION_STATUSES, ["unavailable", "partial", "ready"]);
  assert.deepEqual(INSIGHT_VISUALIZATION_KINDS, [
    "none",
    "summary_metric",
    "trend_line",
    "comparison_bars",
    "progress_ring",
    "heatmap",
  ]);
  assert.deepEqual(INSIGHT_VISUALIZATION_DATA_MODES, [
    "none",
    "scalar",
    "comparison",
    "series",
    "matrix",
  ]);
  assert.deepEqual(INSIGHT_VISUALIZATION_INTERACTIONS, [
    "inspect_value",
    "switch_window",
    "compare_periods",
    "toggle_series",
    "select_region",
    "open_detail",
  ]);
});

test("Task 17 scalar evidence produces a summary metric and never a fake line", () => {
  const result = packet({
    mode: "scalar",
    metricId: NODE,
    value: 0,
    unit: "grams",
    minimum: null,
    maximum: null,
    window: "days_7",
  });
  assert.equal(result.visualizationKind, "summary_metric");
  assert.equal(result.dataMode, "scalar");
  assert.equal((result.data as { value: number }).value, 0);
  assert.ok(!result.interactions.includes("switch_window"));
});

test("Task 17 valid comparisons become bars while incompatible units remain unavailable", () => {
  const valid = packet({
    mode: "comparison",
    items: [
      { metricId: NODE, role: "current", value: 0, unit: "grams" },
      { metricId: NODE, role: "previous", value: 10, unit: "grams" },
    ],
    window: "days_7",
  });
  assert.equal(valid.visualizationKind, "comparison_bars");
  assert.equal(valid.safeToRender, true);
  assert.deepEqual(valid.interactions, ["inspect_value", "compare_periods", "open_detail"]);
  const invalid = packet({
    mode: "comparison",
    items: [
      { metricId: NODE, role: "current", value: 1, unit: "grams" },
      { metricId: NODE, role: "previous", value: 2, unit: "kcal" },
    ],
    window: "days_7",
  });
  assert.equal(invalid.visualizationKind, "none");
  assert.equal(invalid.safeToRender, false);
  assert.ok(
    invalid.limitationKeys.includes("analytics.visualization.limitation.incompatible_units"),
  );
});

test("Task 17 trend lines require two finite ordered points and preserve gaps", () => {
  const data: InsightVisualizationDerivedData = {
    mode: "series",
    windows: ["days_28", "days_7", "days_28"],
    series: [
      {
        seriesId: "primary",
        metricId: NODE,
        unit: "grams",
        points: [
          { xKey: "2026-02", value: 2 },
          { xKey: "2026-01", value: 0 },
          { xKey: "2026-03", value: null },
        ],
      },
    ],
  };
  const result = packet(data);
  assert.equal(result.visualizationKind, "trend_line");
  assert.equal(result.status, "partial");
  assert.equal(result.safeToRender, false);
  assert.deepEqual((result.data as { series: Array<{ points: unknown[] }> }).series[0].points, [
    { xKey: "2026-01", value: 0 },
    { xKey: "2026-02", value: 2 },
    { xKey: "2026-03", value: null },
  ]);
  assert.deepEqual(result.availableWindows, ["days_7", "days_28"]);
  const one = packet({
    mode: "series",
    windows: ["days_7"],
    series: [
      { seriesId: "primary", metricId: NODE, unit: "grams", points: [{ xKey: "only", value: 1 }] },
    ],
  });
  assert.equal(one.visualizationKind, "none");
});

test("Task 17 bounded percentages may use progress rings but unbounded values may not", () => {
  const bounded = packet({
    mode: "scalar",
    metricId: NODE,
    value: 75,
    unit: "percent",
    minimum: 0,
    maximum: 100,
    window: null,
  });
  assert.equal(bounded.visualizationKind, "progress_ring");
  assert.equal(bounded.safeToRender, true);
  const unbounded = packet({
    mode: "scalar",
    metricId: NODE,
    value: 75,
    unit: "load",
    minimum: null,
    maximum: null,
    window: null,
  });
  assert.equal(unbounded.visualizationKind, "summary_metric");
});

test("Task 17 canonical matrices may use heatmaps and non-matrix data may not", () => {
  const matrix = packet({
    mode: "matrix",
    metricId: NODE,
    unit: "count",
    cells: [
      { regionId: "region.b", row: 0, column: 1, value: 0 },
      { regionId: "region.a", row: 0, column: 0, value: 2 },
    ],
  });
  assert.equal(matrix.visualizationKind, "heatmap");
  assert.deepEqual(matrix.interactions, ["inspect_value", "select_region", "open_detail"]);
  assert.deepEqual(
    (matrix.data as { cells: Array<{ regionId: string }> }).cells.map((cell) => cell.regionId),
    ["region.a", "region.b"],
  );
  assert.notEqual(
    packet({
      mode: "scalar",
      metricId: NODE,
      value: 2,
      unit: "count",
      minimum: null,
      maximum: null,
      window: null,
    }).visualizationKind,
    "heatmap",
  );
});

test("Task 17 kind and data-mode compatibility is closed and exact", () => {
  const valid = [
    ["none", "none"],
    ["summary_metric", "scalar"],
    ["progress_ring", "scalar"],
    ["trend_line", "series"],
    ["comparison_bars", "comparison"],
    ["heatmap", "matrix"],
  ] as const;
  for (const kind of INSIGHT_VISUALIZATION_KINDS)
    for (const mode of INSIGHT_VISUALIZATION_DATA_MODES)
      assert.equal(
        isVisualizationKindModeCompatible(kind, mode),
        valid.some((pair) => pair[0] === kind && pair[1] === mode),
      );
});

test("Task 17 preserves missing versus zero without interpolation or invention", () => {
  const result = packet({
    mode: "series",
    windows: [],
    series: [
      {
        seriesId: "primary",
        metricId: NODE,
        unit: "count",
        points: [
          { xKey: "a", value: 0 },
          { xKey: "b", value: null },
          { xKey: "c", value: 3 },
        ],
      },
    ],
  });
  const values = (
    result.data as { series: Array<{ points: Array<{ value: number | null }> }> }
  ).series[0].points.map((point) => point.value);
  assert.deepEqual(values, [0, null, 3]);
  assert.ok(!JSON.stringify(result).includes("target"));
  const scalarExplanation = explanation();
  scalarExplanation.facts = scalarExplanation.facts.slice(0, 1);
  const inferred = buildInsightVisualizationPacket({
    candidate: candidate(),
    explanation: scalarExplanation,
  });
  assert.equal(inferred.visualizationKind, "summary_metric");
});

test("Task 17 interaction capabilities are derived only from actual packet structure", () => {
  const twoSeries = packet({
    mode: "series",
    windows: ["days_90", "days_7"],
    series: [
      {
        seriesId: "b",
        metricId: NODE,
        unit: "grams",
        points: [
          { xKey: "a", value: 1 },
          { xKey: "b", value: 2 },
        ],
      },
      {
        seriesId: "a",
        metricId: `${NODE}.other`,
        unit: "grams",
        points: [
          { xKey: "a", value: 2 },
          { xKey: "b", value: 3 },
        ],
      },
    ],
  });
  assert.deepEqual(twoSeries.interactions, [
    "inspect_value",
    "switch_window",
    "toggle_series",
    "open_detail",
  ]);
  assert.ok(!twoSeries.interactions.includes("compare_periods"));
  assert.ok(!twoSeries.interactions.includes("select_region"));
});

test("Task 17 safety never weakens Task 16 or selection and rejects malformed data", () => {
  const scalar: InsightVisualizationDerivedData = {
    mode: "scalar",
    metricId: NODE,
    value: 1,
    unit: "count",
    minimum: null,
    maximum: null,
    window: null,
  };
  assert.equal(packet(scalar, false).safeToRender, false);
  assert.equal(packet(scalar, true, "eligible").safeToRender, false);
  const unresolved = packet(scalar, true, "selected", true);
  assert.equal(unresolved.safeToRender, false);
  assert.ok(!unresolved.interactions.includes("open_detail"));
  assert.equal(packet({ ...scalar, value: Number.POSITIVE_INFINITY }).safeToRender, false);
  assert.equal(packet(scalar).safeToRender, true);
});

test("Task 17 packets are deterministic, canonical, serializable, and deeply frozen", () => {
  const data: InsightVisualizationDerivedData = {
    mode: "series",
    windows: ["days_28", "days_7"],
    series: [
      {
        seriesId: "z",
        metricId: NODE,
        unit: "grams",
        points: [
          { xKey: "b", value: 2 },
          { xKey: "a", value: 1 },
        ],
      },
      {
        seriesId: "a",
        metricId: `${NODE}.a`,
        unit: "grams",
        points: [
          { xKey: "b", value: 3 },
          { xKey: "a", value: 2 },
        ],
      },
    ],
  };
  const before = JSON.stringify(data);
  const first = packet(data);
  const second = packet(data);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(JSON.stringify(data), before);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.ok(
    Object.isFrozen(first) && Object.isFrozen(first.interactions) && Object.isFrozen(first.data),
  );
  assert.throws(() => (first.interactions as string[]).push("inspect_value"));
});

test("Task 17 packet metadata contains only machine keys and no advice or UI instructions", () => {
  const serialized = JSON.stringify(packet(undefined));
  assert.doesNotMatch(
    serialized,
    /recommend|coach|prescribe|diagnos|medical|alert|component|route|color|pixel/i,
  );
  assert.match(serialized, /analytics\.visualization\./);
});
