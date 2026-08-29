import type {
  BaseState,
  Conflict,
  ConstraintResult,
  DerivedPlan,
  ProposalOperation,
  ScenarioMetrics,
} from "@/domain/types";
import { derivePlan } from "./derive";
import { detectConflicts, evaluateConstraints } from "./constraint-engine";

export interface SimulationOutcome {
  plan: DerivedPlan;
  metrics: ScenarioMetrics;
  constraintResults: ConstraintResult[];
  conflicts: Conflict[];
}

/**
 * The agent proposes operations. MUTUA calculates the consequences.
 * This function is pure: same inputs, same numbers, every time.
 */
export function simulate(base: BaseState, operations: ProposalOperation[]): SimulationOutcome {
  const plan = derivePlan(base, operations);
  const constraintResults = evaluateConstraints(base, plan, operations);
  const conflicts = detectConflicts(base, plan, operations);

  const metrics: ScenarioMetrics = {
    deadline: base.workspace.launchDate,
    deadlineMet: plan.deadlineMet,
    projectedLaunchDate: plan.projectedLaunchDate,
    slipDays: plan.slipDays,
    extraCost: plan.extraCost,
    totalBudget: plan.totalBudget,
    peakLoadPercent: plan.peakLoadPercent,
    peakPersonId: plan.peakPersonId,
    overloadPercent: plan.overloadPercent,
    scopeLoss: plan.scopeLoss,
    scopeLossTaskIds: plan.scopeLossTaskIds,
  };

  return { plan, metrics, constraintResults, conflicts };
}

export function summariseConstraints(results: ConstraintResult[]) {
  return {
    passed: results.filter((r) => r.status === "passed").length,
    warnings: results.filter((r) => r.status === "warning").length,
    failed: results.filter((r) => r.status === "failed").length,
    hardFailures: results.filter((r) => r.status === "failed" && r.severity === "hard").length,
  };
}
