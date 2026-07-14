import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  PROVENANCE_SOURCE_TYPES,
  calculateTraceability,
  combineMetricProvenance,
  getUnknownMetricProvenance,
  normalizeMetricProvenance,
} from "../../src/lib/analytics.ts";

test("Task 11 provenance exposes every approved source type", () => {
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

test("Task 11 provenance normalization sorts, deduplicates, and clamps traceability", () => {
  const normalized = normalizeMetricProvenance({
    sourceType: "manual",
    sourceIds: ["z", "a", "z", "  a  ", ""],
    derivation: "observed",
    traceabilityScore: 4,
    reasonCodes: ["z_reason", "a_reason", "z_reason"],
  });
  assert.deepEqual(normalized, {
    sourceType: "manual",
    sourceIds: ["a", "z"],
    derivation: "observed",
    traceabilityScore: 1,
    reasonCodes: ["a_reason", "z_reason"],
  });
  assert.equal(
    calculateTraceability({ sourceType: "imported", sourceIds: ["x"], traceabilityScore: -2 }),
    0,
  );
  assert.equal(
    calculateTraceability({ sourceType: "wearable", sourceIds: ["x"], traceabilityScore: 0.4 }),
    0.4,
  );
});

test("Task 11 provenance handles non-finite and missing values honestly", () => {
  const unknown = getUnknownMetricProvenance();
  assert.deepEqual(unknown, {
    sourceType: "unknown",
    sourceIds: [],
    derivation: "unknown",
    traceabilityScore: null,
    reasonCodes: ["missing_source"],
  });
  assert.equal(calculateTraceability({ sourceType: "unknown", sourceIds: ["claimed"] }), null);
  assert.equal(calculateTraceability({ sourceType: "manual", sourceIds: [] }), null);
  assert.equal(
    calculateTraceability({
      sourceType: "manual",
      sourceIds: ["field"],
      traceabilityScore: Number.NaN,
    }),
    1,
  );
  const derivedMissing = normalizeMetricProvenance({
    sourceType: "derived",
    derivation: "derived",
  });
  assert.equal(derivedMissing.traceabilityScore, null);
  assert.deepEqual(derivedMissing.reasonCodes, ["missing_dependency", "missing_source"]);
});

test("Task 11 provenance combination is deterministic, order independent, and duplicate safe", () => {
  const manual = {
    sourceType: "manual",
    sourceIds: ["meal-1"],
    derivation: "observed",
    traceabilityScore: 0.9,
    reasonCodes: ["user_entered"],
  } as const;
  const wearable = {
    sourceType: "wearable",
    sourceIds: ["sleep-1"],
    derivation: "observed",
    traceabilityScore: 0.8,
    reasonCodes: ["synced"],
  } as const;
  const first = combineMetricProvenance([manual, wearable, manual]);
  const reversed = combineMetricProvenance([wearable, manual]);
  assert.deepEqual(first, reversed);
  assert.deepEqual(first, {
    sourceType: "mixed",
    sourceIds: ["meal-1", "sleep-1"],
    derivation: "observed",
    traceabilityScore: 0.8,
    reasonCodes: ["combined_sources", "synced", "user_entered"],
  });
  assert.deepEqual(combineMetricProvenance([manual, manual]), normalizeMetricProvenance(manual));
});

test("Task 11 derived, mixed, and unknown provenance remain distinct and serializable", () => {
  const derived = normalizeMetricProvenance({
    sourceType: "derived",
    sourceIds: ["training.volume.7d", "recovery.readiness.7d_average"],
    derivation: "derived",
  });
  const mixed = combineMetricProvenance([
    derived,
    { sourceType: "ai_extracted", sourceIds: ["document-1"], derivation: "observed" },
  ]);
  const withUnknown = combineMetricProvenance([derived, getUnknownMetricProvenance()]);
  assert.equal(derived.sourceType, "derived");
  assert.equal(derived.traceabilityScore, 1);
  assert.equal(mixed.sourceType, "mixed");
  assert.equal(mixed.derivation, "mixed");
  assert.equal(withUnknown.sourceType, "mixed");
  assert.equal(withUnknown.traceabilityScore, null);
  assert.doesNotThrow(() => JSON.stringify([derived, mixed, withUnknown]));
});
