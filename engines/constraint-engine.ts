import { formatShortDate } from "@/domain/rules";
import type {
  BaseState,
  Conflict,
  Constraint,
  ConstraintResult,
  DerivedPlan,
  ProposalOperation,
} from "@/domain/types";

/**
 * Deterministic constraint evaluation. No model call, ever.
 * Each constraint answers: passed / warning / failed, with the observed value.
 */
export function evaluateConstraints(
  base: BaseState,
  plan: DerivedPlan,
  operations: ProposalOperation[] = [],
): ConstraintResult[] {
  return base.constraints.map((constraint) =>
    evaluateConstraint(constraint, base, plan, operations),
  );
}

export function evaluateConstraint(
  constraint: Constraint,
  base: BaseState,
  plan: DerivedPlan,
  operations: ProposalOperation[] = [],
): ConstraintResult {
  const shell = {
    constraintId: constraint.id,
    label: constraint.label,
    severity: constraint.severity,
  };

  switch (constraint.type) {
    case "deadline": {
      return {
        ...shell,
        status: plan.deadlineMet ? "passed" : "failed",
        actualValue: plan.projectedLaunchDate,
        message: plan.deadlineMet
          ? `Every critical task lands by ${formatShortDate(base.workspace.launchDate)}.`
          : `Critical work runs ${plan.slipDays} working day${plan.slipDays > 1 ? "s" : ""} past launch (${formatShortDate(plan.projectedLaunchDate)}).`,
      };
    }

    case "workload": {
      const limit = Number(constraint.value);
      const actual = plan.overloadPercent;
      const status = actual > limit ? "failed" : actual > limit * 0.8 ? "warning" : "passed";
      const peak = plan.loads.find((l) => l.personId === plan.peakPersonId);
      return {
        ...shell,
        status,
        actualValue: actual,
        message:
          status === "passed"
            ? `Peak load ${plan.peakLoadPercent} %${peak ? ` (${peak.name})` : ""}.`
            : `${peak ? peak.name : "Someone"} is planned at ${plan.peakLoadPercent} % of capacity.`,
      };
    }

    case "scope": {
      const entityId = constraint.entityId ?? String(constraint.value);
      const task = plan.tasks.find((t) => t.id === entityId);
      const kept = !!task && task.inLaunchScope && !task.deferred;
      const touched = operationsTouching(operations, entityId);
      return {
        ...shell,
        status: kept ? "passed" : "failed",
        actualValue: kept ? "in scope" : "out of scope",
        message: kept
          ? `${task?.name ?? entityId} stays in launch scope.`
          : `${task?.name ?? entityId} would leave launch scope (${touched.length} operation${touched.length === 1 ? "" : "s"}).`,
      };
    }

    case "budget": {
      const cap = Number(constraint.value);
      const status =
        plan.extraCost > cap ? "failed" : plan.extraCost > cap * 0.7 ? "warning" : "passed";
      return {
        ...shell,
        status,
        actualValue: plan.extraCost,
        message:
          plan.extraCost === 0
            ? "No recovery spend."
            : `Recovery spend ${plan.extraCost.toLocaleString("en-US")} against a ${cap.toLocaleString("en-US")} guardrail.`,
      };
    }

    case "availability": {
      const unassigned = plan.unassignedCriticalTaskIds.length;
      return {
        ...shell,
        status: unassigned === 0 ? "passed" : "failed",
        actualValue: unassigned,
        message:
          unassigned === 0
            ? "Every critical task has an owner."
            : `${unassigned} critical task${unassigned > 1 ? "s have" : " has"} no owner.`,
      };
    }

    default:
      return { ...shell, status: "passed" };
  }
}

function operationsTouching(operations: ProposalOperation[], entityId: string) {
  return operations.filter((op) => "taskId" in op && op.taskId === entityId);
}

/**
 * Human locks are enforced twice: `modify_proposal` refuses to touch a locked
 * entity, and every scenario is re-checked here — so a proposal created *before*
 * a lock surfaces as a conflict instead of being silently rewritten.
 */
export function detectLockViolations(
  base: BaseState,
  plan: DerivedPlan,
  operations: ProposalOperation[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const lockedTasks = base.tasks.filter((t) => t.locked);

  for (const locked of lockedTasks) {
    const derived = plan.tasks.find((t) => t.id === locked.id);
    if (!derived) continue;

    const changes: string[] = [];
    if (derived.inLaunchScope !== locked.inLaunchScope) changes.push("launch scope");
    if (derived.deferred !== locked.deferred) changes.push("schedule");
    if (derived.ownerId !== locked.ownerId) changes.push("owner");
    if (derived.effort !== locked.effort) changes.push("effort");

    if (changes.length > 0) {
      conflicts.push({
        type: "lock",
        severity: "failed",
        entityIds: [locked.id],
        message: `${locked.name} is locked by you — this plan changes its ${changes.join(" and ")}.`,
      });
    }

    const touching = operations.filter((op) => "taskId" in op && op.taskId === locked.id);
    if (touching.length > 0 && changes.length === 0) {
      conflicts.push({
        type: "lock",
        severity: "warning",
        entityIds: [locked.id],
        message: `${locked.name} is locked and still targeted by ${touching.length} operation${touching.length > 1 ? "s" : ""}.`,
      });
    }
  }

  return conflicts;
}

export function detectConflicts(
  base: BaseState,
  plan: DerivedPlan,
  operations: ProposalOperation[] = [],
): Conflict[] {
  const conflicts: Conflict[] = [...detectLockViolations(base, plan, operations)];

  for (const load of plan.loads) {
    if (load.loadPercent > 100 + base.workspace.maxOverloadPercent) {
      conflicts.push({
        type: "workload",
        severity: "failed",
        entityIds: [load.personId],
        message: `${load.name} reaches ${load.loadPercent} % of planned capacity.`,
      });
    } else if (load.loadPercent > 100) {
      conflicts.push({
        type: "workload",
        severity: "warning",
        entityIds: [load.personId],
        message: `${load.name} reaches ${load.loadPercent} % of planned capacity.`,
      });
    }
  }

  if (!plan.deadlineMet) {
    conflicts.push({
      type: "deadline",
      severity: "failed",
      entityIds: plan.lateTaskIds,
      message: `Launch slips to ${formatShortDate(plan.projectedLaunchDate)} — ${plan.lateTaskIds.length} critical task${plan.lateTaskIds.length > 1 ? "s" : ""} run past Sep 30.`,
    });
  }

  for (const taskId of plan.unassignedCriticalTaskIds) {
    const task = plan.tasks.find((t) => t.id === taskId);
    conflicts.push({
      type: "assignment",
      severity: "failed",
      entityIds: [taskId],
      message: `${task?.name ?? taskId} has no available owner.`,
    });
  }

  return conflicts;
}

export function hasHardViolation(results: ConstraintResult[]): boolean {
  return results.some((r) => r.severity === "hard" && r.status === "failed");
}
