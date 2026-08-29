import type { BaseState, DerivedPlan, OperationDiffLine, Scenario } from "./types";
import { derivePlan } from "@/engines/derive";
import { buildDiff } from "@/engines/diff-engine";
import { compare, type Comparison } from "@/engines/comparison-engine";
import { isSimulationFresh } from "@/engines/proposal-engine";

/**
 * Derived reads live here so no component recomputes the plan its own way.
 */

export function selectCurrentPlan(base: BaseState): DerivedPlan {
  return derivePlan(base, []);
}

export function selectScenarioPlan(base: BaseState, scenario: Scenario): DerivedPlan {
  return derivePlan(base, scenario.operations);
}

export function selectDiff(base: BaseState, scenario: Scenario): OperationDiffLine[] {
  return buildDiff(base, scenario.operations);
}

export function selectLockedEntities(base: BaseState) {
  return base.tasks
    .filter((t) => t.locked)
    .map((t) => ({
      entityId: t.id,
      name: t.name,
      reason: base.constraints.find((c) => c.id === `lock-${t.id}`)?.description,
    }));
}

export function selectComparison(base: BaseState, scenarios: Scenario[]): Comparison {
  return compare(base, scenarios);
}

export function selectSimulationFreshness(scenario: Scenario, planVersion: number) {
  return {
    fresh: isSimulationFresh(scenario, planVersion),
    hasRun: scenario.metrics !== undefined,
  };
}

export function selectLiveScenarios(scenarios: Scenario[]): Scenario[] {
  return scenarios.filter((s) => s.status !== "discarded");
}
