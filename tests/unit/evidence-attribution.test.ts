import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  EVIDENCE_ATTRIBUTION_ROLES,
  EVIDENCE_ATTRIBUTION_STATUSES,
  FITCORE_EVIDENCE_ATTRIBUTION_POLICY,
  PROVENANCE_SOURCE_TYPES,
  buildEvidenceAttribution,
  type EvidenceAttributionInput,
  type MetricTrustAssessment,
} from "../../src/lib/analytics.ts";

function trust(
  source: "manual" | "imported" | "wearable" | "derived" | "mixed" | "unknown" = "manual",
  traceability: number | null = 0.9,
  freshness: "fresh" | "aging" | "stale" | "unknown" | "invalid" = "fresh",
): MetricTrustAssessment {
  return {
    metricId: "metric",
    status: "assessed",
    level: "high",
    score: 0.85,
    policyVersion: "fitcore_metric_trust_v1",
    freshness: { state: freshness },
    provenance: { type: source, traceability },
  } as unknown as MetricTrustAssessment;
}

function input(overrides: Partial<EvidenceAttributionInput> = {}): EvidenceAttributionInput {
  return {
    nodeId: "nutrition.metric",
    resolved: true,
    supported: true,
    provenance: {
      sourceType: "manual",
      sourceIds: ["private-source"],
      derivation: "observed",
      traceabilityScore: 0.9,
      reasonCodes: ["audit-private"],
    },
    trust: trust(),
    dependencyNodeIds: [],
    resolvedDependencyNodeIds: [],
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

test("Task 16 attribution exposes stable policy vocabularies", () => {
  assert.equal(buildEvidenceAttribution(input()).policy, FITCORE_EVIDENCE_ATTRIBUTION_POLICY);
  assert.equal(FITCORE_EVIDENCE_ATTRIBUTION_POLICY, "fitcore_evidence_attribution_v1");
  assert.deepEqual(EVIDENCE_ATTRIBUTION_STATUSES, ["unavailable", "partial", "complete"]);
  assert.deepEqual(EVIDENCE_ATTRIBUTION_ROLES, [
    "direct",
    "derived",
    "dependency",
    "aggregate",
    "unknown",
  ]);
  assert.deepEqual(PROVENANCE_SOURCE_TYPES, [
    "manual",
    "imported",
    "wearable",
    "derived",
    "ai_extracted",
    "mixed",
    "unknown",
  ]);
});

test("Task 16 builds complete direct manual attribution without leaking source IDs", () => {
  const result = buildEvidenceAttribution(input());
  assert.equal(result.attributionId, "nutrition.metric:attribution");
  assert.equal(result.status, "complete");
  assert.equal(result.role, "direct");
  assert.deepEqual(result.sourceTypes, ["manual"]);
  assert.ok(result.reasons.some((reason) => reason.code === "direct_source_available"));
  assert.ok(!JSON.stringify(result).includes("private-source"));
  assert.ok(!JSON.stringify(result).includes("audit-private"));
});

test("Task 16 builds derived attribution with canonical direct dependencies", () => {
  const result = buildEvidenceAttribution(
    input({
      nodeId: "derived.metric",
      provenance: {
        sourceType: "derived",
        sourceIds: ["hidden"],
        derivation: "derived",
        traceabilityScore: 0.8,
        reasonCodes: [],
      },
      trust: trust("derived", 0.8),
      dependencyNodeIds: ["source.z", "source.a", "source.z"],
      resolvedDependencyNodeIds: ["source.z", "source.a"],
    }),
  );
  assert.equal(result.role, "derived");
  assert.deepEqual(result.dependencyNodeIds, ["source.a", "source.z"]);
  assert.equal(result.status, "complete");
});

test("Task 16 supports deterministic aggregate, mixed, and dependency roles", () => {
  const aggregate = buildEvidenceAttribution(
    input({ provenanceTypes: ["wearable", "manual", "manual"] }),
  );
  assert.equal(aggregate.role, "aggregate");
  assert.deepEqual(aggregate.sourceTypes, ["manual", "wearable"]);
  assert.equal(buildEvidenceAttribution(input({ roleHint: "dependency" })).role, "dependency");
  assert.ok(aggregate.reasons.some((reason) => reason.code === "mixed_sources_available"));
});

test("Task 16 keeps incomplete attribution partial with exact disclosures", () => {
  for (const [overrides, reason] of [
    [{ trust: trust("manual", null) }, "traceability_unavailable"],
    [
      {
        provenance: {
          sourceType: "unknown",
          sourceIds: [],
          derivation: "unknown",
          traceabilityScore: null,
          reasonCodes: [],
        },
        trust: trust("unknown", null),
      },
      "provenance_unknown",
    ],
    [{ trust: trust("manual", 0.9, "unknown") }, "freshness_unknown"],
    [{ dependencyNodeIds: ["missing"], resolvedDependencyNodeIds: [] }, "dependency_unresolved"],
  ] as const) {
    const result = buildEvidenceAttribution(input(overrides as Partial<EvidenceAttributionInput>));
    assert.equal(result.status, "partial");
    assert.ok(result.reasons.some((item) => item.code === reason));
  }
});

test("Task 16 makes unsupported and unresolved attribution unavailable", () => {
  const unsupported = buildEvidenceAttribution(input({ supported: false }));
  const unresolved = buildEvidenceAttribution(input({ resolved: false }));
  assert.equal(unsupported.status, "unavailable");
  assert.equal(unresolved.status, "unavailable");
  assert.ok(unsupported.reasons.some((reason) => reason.code === "unsupported_metric"));
  assert.ok(unresolved.reasons.some((reason) => reason.code === "metric_unresolved"));
});

test("Task 16 attribution is deterministic under equivalent reordered input", () => {
  const first = buildEvidenceAttribution(
    input({
      provenanceTypes: ["wearable", "manual"],
      dependencyNodeIds: ["b", "a"],
      resolvedDependencyNodeIds: ["a", "b"],
    }),
  );
  const second = buildEvidenceAttribution(
    input({
      provenanceTypes: ["manual", "wearable"],
      dependencyNodeIds: ["a", "b"],
      resolvedDependencyNodeIds: ["b", "a"],
    }),
  );
  assert.deepEqual(first, second);
});

test("Task 16 attribution is non-mutating and plain-JSON serializable", () => {
  const frozen = deepFreeze(input({ provenanceTypes: ["manual"] }));
  const before = JSON.stringify(frozen);
  const result = buildEvidenceAttribution(frozen);
  assert.equal(JSON.stringify(frozen), before);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});
