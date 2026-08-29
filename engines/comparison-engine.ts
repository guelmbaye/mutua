import type { BaseState, Scenario, ScenarioMetrics } from "@/domain/types";
import { simulate } from "./simulation-engine";
import { hasHardViolation } from "./constraint-engine";

export interface ComparisonRow {
  scenarioId: string;
  name: string;
  status: Scenario["status"];
  metrics: ScenarioMetrics;
  locksRespected: boolean;
  hardViolations: number;
}

export interface Comparison {
  rows: ComparisonRow[];
  /** Chosen by deterministic criteria only — never an opaque model preference. */
  recommendedScenarioId?: string;
  rationale?: string;
}

export function compare(base: BaseState, scenarios: Scenario[]): Comparison {
  const rows: ComparisonRow[] = scenarios.map((scenario) => {
    const outcome = simulate(base, scenario.operations);
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      status: scenario.status,
      metrics: outcome.metrics,
      locksRespected: !outcome.conflicts.some((c) => c.type === "lock"),
      hardViolations: outcome.constraintResults.filter(
        (r) => r.severity === "hard" && r.status === "failed",
      ).length,
    };
  });

  const eligible = rows.filter(
    (row) =>
      row.scenarioId !== "current" &&
      row.metrics.deadlineMet &&
      row.locksRespected &&
      row.hardViolations === 0,
  );

  // Deterministic ranking: no scope loss first, then cheapest, then lowest overload.
  const ranked = [...eligible].sort((a, b) => {
    if (a.metrics.scopeLoss !== b.metrics.scopeLoss) return a.metrics.scopeLoss - b.metrics.scopeLoss;
    if (a.metrics.extraCost !== b.metrics.extraCost) return a.metrics.extraCost - b.metrics.extraCost;
    return a.metrics.overloadPercent - b.metrics.overloadPercent;
  });

  const best = ranked[0];
  if (!best) return { rows };

  const runnerUp = ranked[1];
  const rationale = runnerUp
    ? buildRationale(best, runnerUp)
    : `${best.name} meets the deadline with ${best.metrics.scopeLoss === 0 ? "no scope loss" : `${best.metrics.scopeLoss} feature deferred`} at ${formatDelta(best.metrics.extraCost)}.`;

  return { rows, recommendedScenarioId: best.scenarioId, rationale };
}

function buildRationale(best: ComparisonRow, other: ComparisonRow): string {
  const parts: string[] = [];
  if (best.metrics.scopeLoss < other.metrics.scopeLoss) parts.push("keeps full launch scope");
  if (best.metrics.extraCost < other.metrics.extraCost) {
    parts.push(`costs ${formatDelta(other.metrics.extraCost - best.metrics.extraCost)} less`);
  }
  if (best.metrics.overloadPercent < other.metrics.overloadPercent) {
    parts.push(`peaks ${other.metrics.overloadPercent - best.metrics.overloadPercent} points lower`);
  } else if (best.metrics.overloadPercent > other.metrics.overloadPercent) {
    parts.push(`runs at ${best.metrics.overloadPercent}% peak overload`);
  }
  return `${best.name} ${parts.join(", ")} against ${other.name}.`;
}

function formatDelta(value: number): string {
  return `$${Math.round(value / 1000)}k`;
}

export { hasHardViolation };
