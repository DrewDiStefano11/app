export const PROVENANCE_SOURCE_TYPES = Object.freeze([
  "manual",
  "imported",
  "wearable",
  "derived",
  "ai_extracted",
  "mixed",
  "unknown",
] as const);

export type ProvenanceSourceType = (typeof PROVENANCE_SOURCE_TYPES)[number];
export type ProvenanceDerivation = "observed" | "derived" | "mixed" | "unknown";

export interface MetricProvenance {
  sourceType: ProvenanceSourceType;
  sourceIds: string[];
  derivation: ProvenanceDerivation;
  /** Traceability uses 0 (not traceable) through 1 (fully traceable); null means unavailable. */
  traceabilityScore: number | null;
  reasonCodes: string[];
}

export interface MetricProvenanceInput {
  sourceType?: unknown;
  sourceIds?: readonly unknown[];
  derivation?: unknown;
  traceabilityScore?: unknown;
  reasonCodes?: readonly unknown[];
}

function uniqueSortedStrings(values: readonly unknown[] | undefined): string[] {
  return [
    ...new Set(
      (values ?? [])
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function isSourceType(value: unknown): value is ProvenanceSourceType {
  return PROVENANCE_SOURCE_TYPES.some((sourceType) => sourceType === value);
}

function isDerivation(value: unknown): value is ProvenanceDerivation {
  return value === "observed" || value === "derived" || value === "mixed" || value === "unknown";
}

function defaultDerivation(sourceType: ProvenanceSourceType): ProvenanceDerivation {
  if (sourceType === "derived") return "derived";
  if (sourceType === "mixed") return "mixed";
  if (sourceType === "unknown") return "unknown";
  return "observed";
}

function clampTraceability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Calculates lineage traceability, not metric confidence. An identified source is fully traceable by
 * default; callers may supply a finite 0..1 score when only part of the lineage can be identified.
 */
export function calculateTraceability(input: MetricProvenanceInput): number | null {
  const sourceType = isSourceType(input.sourceType) ? input.sourceType : "unknown";
  const sourceIds = uniqueSortedStrings(input.sourceIds);
  if (sourceType === "unknown" || sourceIds.length === 0) return null;
  return typeof input.traceabilityScore === "number" && Number.isFinite(input.traceabilityScore)
    ? clampTraceability(input.traceabilityScore)
    : 1;
}

export function getUnknownMetricProvenance(
  reasonCodes: readonly string[] = ["missing_source"],
): MetricProvenance {
  return {
    sourceType: "unknown",
    sourceIds: [],
    derivation: "unknown",
    traceabilityScore: null,
    reasonCodes: uniqueSortedStrings(reasonCodes),
  };
}

export function normalizeMetricProvenance(input: MetricProvenanceInput): MetricProvenance {
  const sourceType = isSourceType(input.sourceType) ? input.sourceType : "unknown";
  const sourceIds = uniqueSortedStrings(input.sourceIds);
  const derivation = isDerivation(input.derivation)
    ? input.derivation
    : defaultDerivation(sourceType);
  const reasonCodes = uniqueSortedStrings(input.reasonCodes);
  if (sourceIds.length === 0 && !reasonCodes.includes("missing_source")) {
    reasonCodes.push("missing_source");
  }
  if (
    derivation === "derived" &&
    sourceIds.length === 0 &&
    !reasonCodes.includes("missing_dependency")
  ) {
    reasonCodes.push("missing_dependency");
  }
  reasonCodes.sort((a, b) => a.localeCompare(b));
  return {
    sourceType,
    sourceIds,
    derivation,
    traceabilityScore: calculateTraceability({ ...input, sourceType, sourceIds }),
    reasonCodes,
  };
}

function provenanceKey(value: MetricProvenance): string {
  return JSON.stringify(value);
}

export function combineMetricProvenance(
  records: readonly MetricProvenanceInput[],
): MetricProvenance {
  const normalized = records.map(normalizeMetricProvenance);
  const unique = [
    ...new Map(normalized.map((record) => [provenanceKey(record), record])).values(),
  ].sort((a, b) => provenanceKey(a).localeCompare(provenanceKey(b)));
  if (unique.length === 0) return getUnknownMetricProvenance();
  if (unique.length === 1)
    return {
      ...unique[0],
      sourceIds: [...unique[0].sourceIds],
      reasonCodes: [...unique[0].reasonCodes],
    };

  const sourceTypes = new Set(unique.map((record) => record.sourceType));
  const derivations = new Set(unique.map((record) => record.derivation));
  const scores = unique.map((record) => record.traceabilityScore);
  const reasonCodes = uniqueSortedStrings([
    ...unique.flatMap((record) => record.reasonCodes),
    "combined_sources",
  ]);
  return {
    sourceType: sourceTypes.size === 1 ? unique[0].sourceType : "mixed",
    sourceIds: uniqueSortedStrings(unique.flatMap((record) => record.sourceIds)),
    derivation: derivations.size === 1 ? unique[0].derivation : "mixed",
    traceabilityScore: scores.some((score) => score === null)
      ? null
      : Math.min(...scores.filter((score): score is number => score !== null)),
    reasonCodes,
  };
}
