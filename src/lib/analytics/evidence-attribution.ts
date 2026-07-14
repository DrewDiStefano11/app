import {
  PROVENANCE_SOURCE_TYPES,
  type MetricProvenance,
  type ProvenanceSourceType,
} from "./data-provenance";
import type { MetricFreshnessState } from "./metric-freshness";
import type { MetricTrustAssessment, MetricTrustLevel } from "./metric-trust";

export const FITCORE_EVIDENCE_ATTRIBUTION_POLICY = "fitcore_evidence_attribution_v1";
export const EVIDENCE_ATTRIBUTION_STATUSES = Object.freeze([
  "unavailable",
  "partial",
  "complete",
] as const);
export const EVIDENCE_ATTRIBUTION_ROLES = Object.freeze([
  "direct",
  "derived",
  "dependency",
  "aggregate",
  "unknown",
] as const);

export type EvidenceAttributionStatus = (typeof EVIDENCE_ATTRIBUTION_STATUSES)[number];
export type EvidenceAttributionRole = (typeof EVIDENCE_ATTRIBUTION_ROLES)[number];
export type EvidenceAttributionReasonCode =
  | "attribution_complete"
  | "unsupported_metric"
  | "metric_unresolved"
  | "provenance_unavailable"
  | "provenance_unknown"
  | "trust_unavailable"
  | "freshness_unavailable"
  | "freshness_unknown"
  | "freshness_stale"
  | "freshness_invalid"
  | "traceability_unavailable"
  | "dependency_context_unavailable"
  | "dependency_unresolved"
  | "direct_source_available"
  | "derived_source_available"
  | "mixed_sources_available";

export interface EvidenceAttributionReason {
  code: EvidenceAttributionReasonCode;
  messageKey: `attribution.reason.${EvidenceAttributionReasonCode}`;
}

export interface EvidenceAttributionRecord {
  policy: typeof FITCORE_EVIDENCE_ATTRIBUTION_POLICY;
  attributionId: string;
  nodeId: string;
  role: EvidenceAttributionRole;
  sourceTypes: ProvenanceSourceType[];
  dependencyNodeIds: string[];
  trustScore: number | null;
  trustLevel: MetricTrustLevel;
  freshnessState: MetricFreshnessState;
  traceability: number | null;
  status: EvidenceAttributionStatus;
  reasons: EvidenceAttributionReason[];
}

export interface EvidenceAttributionInput {
  nodeId: string;
  resolved: boolean;
  supported: boolean;
  provenance?: MetricProvenance | null;
  provenanceTypes?: readonly unknown[];
  trust?: MetricTrustAssessment | null;
  dependencyNodeIds?: readonly string[];
  resolvedDependencyNodeIds?: readonly string[];
  roleHint?: EvidenceAttributionRole;
}

const reasonOrder: readonly EvidenceAttributionReasonCode[] = [
  "unsupported_metric",
  "metric_unresolved",
  "provenance_unavailable",
  "provenance_unknown",
  "trust_unavailable",
  "freshness_unavailable",
  "freshness_unknown",
  "freshness_stale",
  "freshness_invalid",
  "traceability_unavailable",
  "dependency_context_unavailable",
  "dependency_unresolved",
  "direct_source_available",
  "derived_source_available",
  "mixed_sources_available",
  "attribution_complete",
];

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function canonicalIds(values: readonly unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string"))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function canonicalSources(values: readonly unknown[]): ProvenanceSourceType[] {
  const set = new Set(values);
  return PROVENANCE_SOURCE_TYPES.filter((source) => set.has(source));
}

function reasons(codes: readonly EvidenceAttributionReasonCode[]): EvidenceAttributionReason[] {
  const set = new Set(codes);
  return reasonOrder
    .filter((code) => set.has(code))
    .map((code) => ({ code, messageKey: `attribution.reason.${code}` }));
}

function roleFor(
  sourceTypes: readonly ProvenanceSourceType[],
  dependencies: readonly string[],
  hint?: EvidenceAttributionRole,
): EvidenceAttributionRole {
  if (hint && EVIDENCE_ATTRIBUTION_ROLES.includes(hint)) return hint;
  if (sourceTypes.includes("mixed") || sourceTypes.length > 1) return "aggregate";
  if (sourceTypes.includes("derived")) return "derived";
  if (
    sourceTypes.some((source) =>
      ["manual", "imported", "wearable", "ai_extracted"].includes(source),
    )
  )
    return dependencies.length ? "aggregate" : "direct";
  if (dependencies.length) return "dependency";
  return "unknown";
}

/** Builds bounded, graph-local attribution without exposing source identifiers. */
export function buildEvidenceAttribution(
  input: EvidenceAttributionInput,
): EvidenceAttributionRecord {
  const dependencies = canonicalIds(input.dependencyNodeIds ?? []);
  const resolvedDependencies = new Set(canonicalIds(input.resolvedDependencyNodeIds ?? []));
  const trust = input.trust ?? null;
  const provenance = input.provenance ?? null;
  const sourceTypes = canonicalSources([
    ...(input.provenanceTypes ?? []),
    provenance?.sourceType,
    trust?.provenance?.type,
  ]);
  const trustScore = finiteOrNull(trust?.score);
  const traceability = finiteOrNull(
    trust?.provenance ? trust.provenance.traceability : provenance?.traceabilityScore,
  );
  const trustLevel = trust?.level ?? "unavailable";
  const freshnessState = trust?.freshness?.state ?? "unknown";
  const unresolvedDependencies = dependencies.filter((id) => !resolvedDependencies.has(id));
  const dependencyContextAvailable =
    input.dependencyNodeIds !== undefined && unresolvedDependencies.length === 0;
  const knownSource = sourceTypes.some((source) => source !== "unknown");
  const explicitlyDerived = provenance?.derivation === "derived" || sourceTypes.includes("derived");
  const provenanceAvailable = provenance !== null || trust?.provenance !== null;
  const freshnessUsable = freshnessState === "fresh" || freshnessState === "aging";
  const complete =
    input.resolved &&
    input.supported &&
    provenanceAvailable &&
    trust !== null &&
    trustScore !== null &&
    freshnessUsable &&
    traceability !== null &&
    (knownSource || explicitlyDerived) &&
    dependencyContextAvailable;
  const hasAttributionEvidence = provenanceAvailable || trust !== null || sourceTypes.length > 0;
  const status: EvidenceAttributionStatus = complete
    ? "complete"
    : input.resolved && input.supported && hasAttributionEvidence
      ? "partial"
      : "unavailable";
  const codes: EvidenceAttributionReasonCode[] = [];
  if (!input.supported) codes.push("unsupported_metric");
  if (!input.resolved) codes.push("metric_unresolved");
  if (!provenanceAvailable) codes.push("provenance_unavailable");
  if (!knownSource && !explicitlyDerived) codes.push("provenance_unknown");
  if (!trust || trustScore === null) codes.push("trust_unavailable");
  if (!trust?.freshness) codes.push("freshness_unavailable");
  if (freshnessState === "unknown") codes.push("freshness_unknown");
  if (freshnessState === "stale") codes.push("freshness_stale");
  if (freshnessState === "invalid") codes.push("freshness_invalid");
  if (traceability === null) codes.push("traceability_unavailable");
  if (input.dependencyNodeIds === undefined) codes.push("dependency_context_unavailable");
  if (unresolvedDependencies.length) codes.push("dependency_unresolved");
  const role = roleFor(sourceTypes, dependencies, input.roleHint);
  if (role === "direct") codes.push("direct_source_available");
  if (role === "derived" || role === "dependency") codes.push("derived_source_available");
  if (role === "aggregate") codes.push("mixed_sources_available");
  if (complete) codes.push("attribution_complete");
  return {
    policy: FITCORE_EVIDENCE_ATTRIBUTION_POLICY,
    attributionId: `${input.nodeId}:attribution`,
    nodeId: input.nodeId,
    role,
    sourceTypes,
    dependencyNodeIds: dependencies,
    trustScore,
    trustLevel,
    freshnessState,
    traceability,
    status,
    reasons: reasons(codes),
  };
}
