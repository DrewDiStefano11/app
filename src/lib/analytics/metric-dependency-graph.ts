export const METRIC_DEPENDENCY_GRAPH_ID = "fitcore-analytics-dependencies-v1";

export const METRIC_DEPENDENCY_NODE_CATEGORIES = Object.freeze([
  "source",
  "detail",
  "aggregate",
  "correlation",
  "presentation",
  "insight_readiness",
] as const);

export type MetricDependencyNodeCategory = (typeof METRIC_DEPENDENCY_NODE_CATEGORIES)[number];
export type MetricDependencyDomain =
  | "training"
  | "nutrition"
  | "recovery"
  | "progress"
  | "goals"
  | "cross_domain";

export interface MetricDependencyNode {
  id: string;
  category: MetricDependencyNodeCategory;
  dependencies: string[];
  domain?: MetricDependencyDomain;
}

export interface MetricDependencyGraphValidation {
  valid: boolean;
  errors: string[];
}

type NodeDefinition = Omit<MetricDependencyNode, "dependencies"> & {
  dependencies?: readonly string[];
};

const node = (
  id: string,
  category: MetricDependencyNodeCategory,
  dependencies: readonly string[] = [],
  domain?: MetricDependencyDomain,
): NodeDefinition => ({ id, category, dependencies, ...(domain ? { domain } : {}) });

const sourceNodes: readonly NodeDefinition[] = [
  node("source.state.bodyweightEntries", "source", [], "progress"),
  node("source.state.customExercises", "source", [], "training"),
  node("source.state.goals", "source", [], "goals"),
  node("source.state.mealEntries", "source", [], "nutrition"),
  node("source.state.nutritionTargets", "source", [], "nutrition"),
  node("source.state.profile.bodyweightLb", "source", [], "progress"),
  node("source.state.recoveryCheckIns", "source", [], "recovery"),
  node("source.state.recoverySignals", "source", [], "recovery"),
  node("source.state.workouts", "source", [], "training"),
];

const detailNodes: readonly NodeDefinition[] = [
  node(
    "training.detail.source",
    "detail",
    ["source.state.customExercises", "source.state.workouts"],
    "training",
  ),
  node("training.volume.7d", "detail", ["source.state.workouts"], "training"),
  node("training.consistency.score", "detail", ["source.state.workouts"], "training"),
  node("nutrition.detail.source", "detail", ["source.state.mealEntries"], "nutrition"),
  node("nutrition.meals.count_today", "detail", ["nutrition.detail.source"], "nutrition"),
  node("nutrition.meals.count_range", "detail", ["nutrition.detail.source"], "nutrition"),
  node("nutrition.meals.logged_days", "detail", ["nutrition.detail.source"], "nutrition"),
  node("nutrition.meals.per_logged_day", "detail", ["nutrition.meals.logged_days"], "nutrition"),
  node("nutrition.meals.per_requested_day", "detail", ["nutrition.meals.count_range"], "nutrition"),
  ...["calories", "protein", "carbs", "fat"].map((macro) =>
    node(`nutrition.${macro}.consistency`, "detail", ["nutrition.detail.source"], "nutrition"),
  ),
  node(
    "nutrition.protein.per_bodyweight",
    "detail",
    [
      "nutrition.detail.source",
      "source.state.bodyweightEntries",
      "source.state.profile.bodyweightLb",
    ],
    "nutrition",
  ),
  node(
    "recovery.detail.source",
    "detail",
    ["source.state.recoveryCheckIns", "source.state.recoverySignals"],
    "recovery",
  ),
  ...["soreness", "energy", "motivation", "stress", "readiness"].map((field) =>
    node(`recovery.detail.${field}.trend`, "detail", ["recovery.detail.source"], "recovery"),
  ),
  node("recovery.detail.high_soreness.count", "detail", ["recovery.detail.source"], "recovery"),
  node(
    "recovery.detail.high_soreness.days_since",
    "detail",
    ["recovery.detail.source"],
    "recovery",
  ),
  node("recovery.detail.low_readiness.count", "detail", ["recovery.detail.source"], "recovery"),
  node(
    "recovery.detail.low_readiness.days_since",
    "detail",
    ["recovery.detail.source"],
    "recovery",
  ),
  node("recovery.detail.checkin_consistency", "detail", ["recovery.detail.source"], "recovery"),
  ...["pain", "soreness", "fatigue"].map((kind) =>
    node(`recovery.detail.signal.${kind}.count`, "detail", ["recovery.detail.source"], "recovery"),
  ),
  node(
    "progress.goals.detail.source",
    "detail",
    ["source.state.bodyweightEntries", "source.state.goals"],
    "goals",
  ),
  node("progress.bodyweight.series", "detail", ["source.state.bodyweightEntries"], "progress"),
  node("recovery.score", "detail", ["source.state.recoveryCheckIns"], "recovery"),
];

const aggregateDependencies = [
  "nutrition.detail.source",
  "progress.goals.detail.source",
  "recovery.detail.source",
  "training.detail.source",
] as const;

const aggregateNodes: readonly NodeDefinition[] = [
  node("aggregate.fitcore.domains", "aggregate", aggregateDependencies, "cross_domain"),
  node(
    "aggregate.fitcore.availability",
    "aggregate",
    ["aggregate.fitcore.domains"],
    "cross_domain",
  ),
  node(
    "aggregate.fitcore.completeness",
    "aggregate",
    ["aggregate.fitcore.domains"],
    "cross_domain",
  ),
  node("aggregate.fitcore.confidence", "aggregate", ["aggregate.fitcore.domains"], "cross_domain"),
  node("aggregate.fitcore.sources", "aggregate", aggregateDependencies, "cross_domain"),
  node("aggregate.fitcore.exclusions", "aggregate", aggregateDependencies, "cross_domain"),
];

const correlationNodes: readonly NodeDefinition[] = [
  node(
    "correlation.training_volume.recovery_readiness",
    "correlation",
    ["recovery.detail.readiness.trend", "training.detail.source"],
    "cross_domain",
  ),
  node(
    "correlation.calories.bodyweight",
    "correlation",
    ["nutrition.calories.consistency", "progress.bodyweight.series"],
    "cross_domain",
  ),
  node(
    "correlation.protein.recovery_readiness",
    "correlation",
    ["nutrition.protein.consistency", "recovery.detail.readiness.trend"],
    "cross_domain",
  ),
  node(
    "correlation.soreness.training_load",
    "correlation",
    ["recovery.detail.soreness.trend", "training.detail.source"],
    "cross_domain",
  ),
];

const presentationSourceIds = [
  "training.detail.source",
  "nutrition.meals.count_today",
  "nutrition.meals.count_range",
  "nutrition.meals.logged_days",
  "nutrition.meals.per_logged_day",
  "nutrition.meals.per_requested_day",
  "nutrition.calories.consistency",
  "nutrition.protein.consistency",
  "nutrition.carbs.consistency",
  "nutrition.fat.consistency",
  "nutrition.protein.per_bodyweight",
  "recovery.detail.soreness.trend",
  "recovery.detail.energy.trend",
  "recovery.detail.motivation.trend",
  "recovery.detail.stress.trend",
  "recovery.detail.readiness.trend",
  "recovery.detail.high_soreness.count",
  "recovery.detail.high_soreness.days_since",
  "recovery.detail.low_readiness.count",
  "recovery.detail.low_readiness.days_since",
  "recovery.detail.checkin_consistency",
  "recovery.detail.signal.pain.count",
  "recovery.detail.signal.soreness.count",
  "recovery.detail.signal.fatigue.count",
  "progress.goals.detail.source",
] as const;

function domainForMetric(id: string): MetricDependencyDomain {
  if (id.startsWith("training.")) return "training";
  if (id.startsWith("nutrition.")) return "nutrition";
  if (id.startsWith("recovery.")) return "recovery";
  return "goals";
}

const presentationNodes: readonly NodeDefinition[] = presentationSourceIds.map((id) =>
  node(`presentation.${id}`, "presentation", [id], domainForMetric(id)),
);

const insightNodes: readonly NodeDefinition[] = [
  node(
    "insight.training_volume.recovery_readiness",
    "insight_readiness",
    ["correlation.training_volume.recovery_readiness"],
    "cross_domain",
  ),
  node(
    "insight.calories.bodyweight_trend",
    "insight_readiness",
    ["correlation.calories.bodyweight"],
    "cross_domain",
  ),
  node(
    "insight.protein.recovery_readiness",
    "insight_readiness",
    ["correlation.protein.recovery_readiness"],
    "cross_domain",
  ),
  node(
    "insight.soreness.training_load",
    "insight_readiness",
    ["correlation.soreness.training_load"],
    "cross_domain",
  ),
  node(
    "insight.workout_consistency.momentum",
    "insight_readiness",
    ["training.detail.source"],
    "training",
  ),
  node(
    "insight.nutrition_consistency.goal_progress",
    "insight_readiness",
    ["nutrition.calories.consistency", "progress.goals.detail.source"],
    "cross_domain",
  ),
  node(
    "insight.recovery_score.training_consistency",
    "insight_readiness",
    ["recovery.score", "training.detail.source"],
    "cross_domain",
  ),
  node(
    "insight.bodyweight.average_calories",
    "insight_readiness",
    ["correlation.calories.bodyweight"],
    "cross_domain",
  ),
  node(
    "insight.goal.deadline_risk",
    "insight_readiness",
    ["progress.goals.detail.source"],
    "goals",
  ),
  node(
    "insight.muscle_group.load_imbalance",
    "insight_readiness",
    ["training.detail.source"],
    "training",
  ),
];

function normalizeNodes(definitions: readonly NodeDefinition[]): MetricDependencyNode[] {
  return definitions
    .map((definition) => ({
      ...definition,
      dependencies: [...new Set(definition.dependencies ?? [])].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const METRIC_DEPENDENCY_GRAPH: readonly MetricDependencyNode[] = Object.freeze(
  normalizeNodes([
    ...sourceNodes,
    ...detailNodes,
    ...aggregateNodes,
    ...correlationNodes,
    ...presentationNodes,
    ...insightNodes,
  ]).map((definition) => Object.freeze(definition)),
);

function copyNode(value: MetricDependencyNode): MetricDependencyNode {
  return { ...value, dependencies: [...value.dependencies] };
}

export function getMetricDependencyGraph(): MetricDependencyNode[] {
  return METRIC_DEPENDENCY_GRAPH.map(copyNode);
}

export function getMetricDependencyNode(id: string): MetricDependencyNode | null {
  const found = METRIC_DEPENDENCY_GRAPH.find((item) => item.id === id);
  return found ? copyNode(found) : null;
}

export function getDirectMetricDependencies(id: string): string[] {
  return getMetricDependencyNode(id)?.dependencies ?? [];
}

export function getTransitiveMetricDependencies(id: string): string[] {
  if (!getMetricDependencyNode(id)) return [];
  const found = new Set<string>();
  const visit = (nodeId: string): void => {
    for (const dependency of getDirectMetricDependencies(nodeId)) {
      if (found.has(dependency)) continue;
      found.add(dependency);
      visit(dependency);
    }
  };
  visit(id);
  return [...found].sort((a, b) => a.localeCompare(b));
}

export function getDirectMetricDependents(id: string): string[] {
  if (!getMetricDependencyNode(id)) return [];
  return METRIC_DEPENDENCY_GRAPH.filter((item) => item.dependencies.includes(id))
    .map((item) => item.id)
    .sort((a, b) => a.localeCompare(b));
}

export function validateMetricDependencyGraph(
  graph: readonly MetricDependencyNode[] = METRIC_DEPENDENCY_GRAPH,
): MetricDependencyGraphValidation {
  const errors: string[] = [];
  const ids = graph.map((item) => item.id);
  const idSet = new Set(ids);
  for (const id of new Set(ids)) {
    if (ids.filter((candidate) => candidate === id).length > 1) errors.push(`duplicate_node:${id}`);
  }
  for (const item of graph) {
    if (new Set(item.dependencies).size !== item.dependencies.length) {
      errors.push(`duplicate_dependency:${item.id}`);
    }
    for (const dependency of item.dependencies) {
      if (dependency === item.id) errors.push(`self_dependency:${item.id}`);
      if (!idSet.has(dependency)) errors.push(`unresolved_dependency:${item.id}:${dependency}`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(graph.map((item) => [item.id, item]));
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(`cycle:${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) {
      if (byId.has(dependency)) visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  };
  [...idSet].sort((a, b) => a.localeCompare(b)).forEach(visit);
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)].sort((a, b) => a.localeCompare(b)),
  };
}

export function assertValidMetricDependencyGraph(
  graph: readonly MetricDependencyNode[] = METRIC_DEPENDENCY_GRAPH,
): void {
  const validation = validateMetricDependencyGraph(graph);
  if (!validation.valid)
    throw new Error(`Invalid metric dependency graph: ${validation.errors.join(", ")}`);
}

export function getMetricDependencyTopologicalOrder(
  graph: readonly MetricDependencyNode[] = METRIC_DEPENDENCY_GRAPH,
): string[] {
  if (!validateMetricDependencyGraph(graph).valid) return [];
  const remaining = new Map(graph.map((item) => [item.id, new Set(item.dependencies)]));
  const ordered: string[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.entries()]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([id]) => id)
      .sort((a, b) => a.localeCompare(b));
    if (ready.length === 0) return [];
    for (const id of ready) {
      ordered.push(id);
      remaining.delete(id);
      remaining.forEach((dependencies) => dependencies.delete(id));
    }
  }
  return ordered;
}
