import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_INSIGHT_INTERACTION_POLICY,
  INSIGHT_INTERACTION_CONTRACT_STATUSES,
  INSIGHT_INTERACTION_REQUEST_KINDS,
  INSIGHT_INTERACTION_RESOLUTION_STATUSES,
  buildInsightInteractionContract,
  resolveFitCoreInsightInteraction,
  type InsightVisualizationPacket,
} from "../../src/lib/analytics.ts";

const PACKET = "metric.node:meaningful_increase:visualization";

function basePacket(
  overrides: Partial<InsightVisualizationPacket> = {},
): InsightVisualizationPacket {
  return {
    policy: "fitcore_insight_visualization_v1",
    evidencePolicy: "fitcore_insight_evidence_v1",
    candidatePolicy: "fitcore_insight_candidate_v1",
    explanationPolicy: "fitcore_insight_explanation_v1",
    packetId: `${PACKET}:summary_metric`,
    candidateId: "metric.node:meaningful_increase",
    explanationId: "metric.node:meaningful_increase:explanation",
    nodeId: "metric.node",
    dependencyNodeIds: ["source.metric"],
    status: "ready",
    visualizationKind: "summary_metric",
    dataMode: "scalar",
    data: {
      mode: "scalar",
      metricId: "metric.node",
      value: 0,
      unit: "count",
      minimum: null,
      maximum: null,
      window: "days_7",
    },
    metricIds: ["metric.node"],
    units: ["count"],
    defaultWindow: "days_7",
    availableWindows: ["days_7"],
    interactions: ["inspect_value", "open_detail"],
    reasonKey: "analytics.visualization.reason.scalar_only",
    limitationKeys: [],
    accessibilityLabelKey: "analytics.visualization.accessibility.summary",
    emptyStateKey: "analytics.visualization.empty.no_supported_values",
    safeToRender: true,
    ...overrides,
  };
}

function comparisonPacket(): InsightVisualizationPacket {
  return basePacket({
    packetId: `${PACKET}:comparison_bars`,
    visualizationKind: "comparison_bars",
    dataMode: "comparison",
    data: {
      mode: "comparison",
      items: [
        { metricId: "metric.node", role: "current", value: 0, unit: "count" },
        { metricId: "metric.node", role: "previous", value: 10, unit: "count" },
      ],
      window: "days_7",
    },
    interactions: ["inspect_value", "compare_periods", "open_detail"],
  });
}

function seriesPacket(): InsightVisualizationPacket {
  return basePacket({
    packetId: `${PACKET}:trend_line`,
    status: "partial",
    visualizationKind: "trend_line",
    dataMode: "series",
    data: {
      mode: "series",
      windows: ["days_7", "days_28"],
      series: [
        {
          seriesId: "primary",
          metricId: "metric.node",
          unit: "count",
          points: [
            { xKey: "point.a", value: 0 },
            { xKey: "point.gap", value: null },
            { xKey: "point.c", value: 2 },
          ],
        },
        {
          seriesId: "secondary",
          metricId: "metric.other",
          unit: "count",
          points: [
            { xKey: "point.a", value: 1 },
            { xKey: "point.c", value: 3 },
          ],
        },
      ],
    },
    metricIds: ["metric.node", "metric.other"],
    defaultWindow: "days_7",
    availableWindows: ["days_7", "days_28"],
    interactions: ["inspect_value", "switch_window", "toggle_series", "open_detail"],
    safeToRender: false,
  });
}

function matrixPacket(): InsightVisualizationPacket {
  return basePacket({
    packetId: `${PACKET}:heatmap`,
    visualizationKind: "heatmap",
    dataMode: "matrix",
    data: {
      mode: "matrix",
      metricId: "metric.node",
      unit: "count",
      cells: [
        { regionId: "region.a", row: 0, column: 0, value: 0 },
        { regionId: "region.gap", row: 0, column: 1, value: null },
      ],
    },
    availableWindows: [],
    defaultWindow: null,
    interactions: ["inspect_value", "select_region", "open_detail"],
  });
}

function resolve(packet: InsightVisualizationPacket, request: unknown) {
  const contract = buildInsightInteractionContract(packet);
  return resolveFitCoreInsightInteraction(contract, request);
}

test("Task 18 policy and closed vocabularies are exact", () => {
  assert.equal(FITCORE_INSIGHT_INTERACTION_POLICY, "fitcore_insight_interaction_v1");
  assert.deepEqual(INSIGHT_INTERACTION_CONTRACT_STATUSES, ["unavailable", "limited", "ready"]);
  assert.deepEqual(INSIGHT_INTERACTION_REQUEST_KINDS, [
    "inspect_value",
    "switch_window",
    "compare_periods",
    "toggle_series",
    "select_region",
    "open_detail",
  ]);
  assert.deepEqual(INSIGHT_INTERACTION_RESOLUTION_STATUSES, [
    "accepted",
    "rejected",
    "unavailable",
  ]);
});

test("Task 18 ready, limited, unsafe, and unavailable contracts remain conservative", () => {
  assert.equal(buildInsightInteractionContract(basePacket()).status, "ready");
  const limited = buildInsightInteractionContract(seriesPacket());
  assert.equal(limited.status, "limited");
  assert.equal(limited.safeToInteract, false);
  const unsafe = buildInsightInteractionContract(basePacket({ safeToRender: false }));
  assert.equal(unsafe.status, "limited");
  assert.equal(unsafe.safeToInteract, false);
  const unavailable = buildInsightInteractionContract(
    basePacket({
      status: "unavailable",
      visualizationKind: "none",
      dataMode: "none",
      data: { mode: "none" },
      interactions: [],
      safeToRender: false,
    }),
  );
  assert.equal(unavailable.status, "unavailable");
  const inconsistentUnavailable = buildInsightInteractionContract(
    basePacket({ status: "unavailable", safeToRender: false }),
  );
  assert.equal(inconsistentUnavailable.status, "unavailable");
  assert.deepEqual(inconsistentUnavailable.capabilities, []);
  assert.equal(
    resolveFitCoreInsightInteraction(inconsistentUnavailable, {
      kind: "inspect_value",
      contractId: inconsistentUnavailable.contractId,
      targetType: "scalar",
      targetId: inconsistentUnavailable.inspectableTargets[0].targetId,
    }).status,
    "unavailable",
  );
});

test("Task 18 scalar zero is inspectable and fabricated metrics are rejected", () => {
  const contract = buildInsightInteractionContract(basePacket());
  const target = contract.inspectableTargets[0];
  const accepted = resolveFitCoreInsightInteraction(contract, {
    kind: "inspect_value",
    contractId: contract.contractId,
    targetType: "scalar",
    targetId: target.targetId,
  });
  assert.equal(accepted.status, "accepted");
  assert.equal((accepted.resolvedTarget as { value: number }).value, 0);
  const rejected = resolveFitCoreInsightInteraction(contract, {
    kind: "inspect_value",
    contractId: contract.contractId,
    targetType: "scalar",
    targetId: "SENSITIVE_FAKE_METRIC",
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.resolvedTarget, null);
  assert.doesNotMatch(JSON.stringify(rejected), /SENSITIVE_FAKE_METRIC/);
});

test("Task 18 comparison sides and canonical comparisons resolve without a new delta", () => {
  const contract = buildInsightInteractionContract(comparisonPacket());
  const side = contract.inspectableTargets.find((target) => target.comparisonRole === "current")!;
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "inspect_value",
      contractId: contract.contractId,
      targetType: "comparison_value",
      targetId: side.targetId,
    }).status,
    "accepted",
  );
  const comparison = contract.comparisonTargets[0];
  const accepted = resolveFitCoreInsightInteraction(contract, {
    kind: "compare_periods",
    contractId: contract.contractId,
    comparisonId: comparison.targetId,
  });
  assert.equal(accepted.status, "accepted");
  assert.ok(!("value" in (accepted.resolvedTarget as object)));
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "compare_periods",
      contractId: contract.contractId,
      comparisonId: "fake",
    }).status,
    "rejected",
  );
});

test("Task 18 finite series points resolve while explicit gaps remain unavailable", () => {
  const contract = buildInsightInteractionContract(seriesPacket());
  const point = contract.inspectableTargets.find((target) => target.pointKey === "point.a")!;
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "inspect_value",
      contractId: contract.contractId,
      targetType: "series_point",
      targetId: point.targetId,
    }).status,
    "accepted",
  );
  const gap = contract.missingInspectTargetIds[0];
  const rejected = resolveFitCoreInsightInteraction(contract, {
    kind: "inspect_value",
    contractId: contract.contractId,
    targetType: "series_point",
    targetId: gap,
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.reasonKey, "analytics.interaction.reason.series_gap");
  assert.equal(rejected.resolvedTarget, null);
});

test("Task 18 window switching accepts only existing canonical windows without mutation", () => {
  const contract = buildInsightInteractionContract(seriesPacket());
  const before = JSON.stringify(contract);
  for (const window of ["days_7", "days_28"])
    assert.equal(
      resolveFitCoreInsightInteraction(contract, {
        kind: "switch_window",
        contractId: contract.contractId,
        window,
      }).status,
      "accepted",
    );
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "switch_window",
      contractId: contract.contractId,
      window: "SENSITIVE_WINDOW",
    }).status,
    "rejected",
  );
  assert.equal(JSON.stringify(contract), before);
  const scalar = buildInsightInteractionContract(basePacket());
  assert.equal(
    resolveFitCoreInsightInteraction(scalar, {
      kind: "switch_window",
      contractId: scalar.contractId,
      window: "days_7",
    }).status,
    "unavailable",
  );
});

test("Task 18 series toggles describe selection without persisting it", () => {
  const contract = buildInsightInteractionContract(seriesPacket());
  const before = JSON.stringify(contract);
  const accepted = resolveFitCoreInsightInteraction(contract, {
    kind: "toggle_series",
    contractId: contract.contractId,
    seriesId: "primary",
    selected: false,
  });
  assert.equal(accepted.status, "accepted");
  assert.equal((accepted.resolvedTarget as { selected: boolean }).selected, false);
  assert.equal(JSON.stringify(contract), before);
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "toggle_series",
      contractId: contract.contractId,
      seriesId: "fabricated",
      selected: true,
    }).status,
    "rejected",
  );
});

test("Task 18 matrix regions and valid zero cells resolve canonically", () => {
  const contract = buildInsightInteractionContract(matrixPacket());
  const zero = contract.inspectableTargets.find((target) => target.regionId === "region.a")!;
  assert.equal(
    (
      resolveFitCoreInsightInteraction(contract, {
        kind: "inspect_value",
        contractId: contract.contractId,
        targetType: "matrix_cell",
        targetId: zero.targetId,
      }).resolvedTarget as { value: number }
    ).value,
    0,
  );
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "select_region",
      contractId: contract.contractId,
      regionId: "region.a",
    }).status,
    "accepted",
  );
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "select_region",
      contractId: contract.contractId,
      regionId: "SENSITIVE_REGION_LABEL",
    }).status,
    "rejected",
  );
  assert.equal(
    resolve(basePacket(), {
      kind: "select_region",
      contractId: buildInsightInteractionContract(basePacket()).contractId,
      regionId: "region.a",
    }).status,
    "unavailable",
  );
});

test("Task 18 open detail returns only a canonical analytics node", () => {
  const contract = buildInsightInteractionContract(basePacket());
  const accepted = resolveFitCoreInsightInteraction(contract, {
    kind: "open_detail",
    contractId: contract.contractId,
    nodeId: "source.metric",
  });
  assert.equal(accepted.status, "accepted");
  assert.deepEqual(accepted.resolvedTarget, {
    targetType: "detail",
    targetId: `${contract.visualizationPacketId}:detail:source.metric`,
    nodeId: "source.metric",
  });
  assert.doesNotMatch(JSON.stringify(accepted), /route|url|component|sheet|callback/i);
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "open_detail",
      contractId: contract.contractId,
      nodeId: "fabricated",
    }).status,
    "rejected",
  );
});

test("Task 18 malformed requests never throw or echo untrusted strings", () => {
  const contract = buildInsightInteractionContract(basePacket());
  for (const request of [
    null,
    {},
    { kind: "SENSITIVE_UNKNOWN_KIND", contractId: contract.contractId },
    { kind: "inspect_value", contractId: "SENSITIVE_FAKE_CONTRACT", targetId: "SENSITIVE_TARGET" },
  ]) {
    const resolution = resolveFitCoreInsightInteraction(contract, request);
    assert.ok(resolution.status === "rejected" || resolution.status === "unavailable");
    assert.equal(resolution.resolvedTarget, null);
    assert.doesNotMatch(JSON.stringify(resolution), /SENSITIVE_/);
  }
});

test("Task 18 cannot escalate capabilities beyond Task 17 declarations", () => {
  const packet = seriesPacket();
  packet.interactions = ["inspect_value"];
  const contract = buildInsightInteractionContract(packet);
  assert.deepEqual(contract.capabilities, ["inspect_value"]);
  assert.equal(
    resolveFitCoreInsightInteraction(contract, {
      kind: "toggle_series",
      contractId: contract.contractId,
      seriesId: "primary",
      selected: true,
    }).status,
    "unavailable",
  );
});

test("Task 18 contracts and resolutions are deterministic, serializable, and deeply frozen", () => {
  const first = buildInsightInteractionContract(seriesPacket());
  const second = buildInsightInteractionContract(seriesPacket());
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  const request = {
    kind: "switch_window",
    contractId: first.contractId,
    window: "days_28",
  } as const;
  const resolutionA = resolveFitCoreInsightInteraction(first, request);
  const resolutionB = resolveFitCoreInsightInteraction(second, {
    window: "days_28",
    contractId: first.contractId,
    kind: "switch_window",
  });
  assert.deepEqual(resolutionA, resolutionB);
  assert.deepEqual(JSON.parse(JSON.stringify(resolutionA)), resolutionA);
  assert.ok(
    Object.isFrozen(first) &&
      Object.isFrozen(first.inspectableTargets) &&
      Object.isFrozen(resolutionA),
  );
  assert.throws(() => (first.capabilities as string[]).push("inspect_value"));
});
