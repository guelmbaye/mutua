import {
  CONTRACTOR_BLOCK_DAYS,
  CONTRACTOR_TARGET_UTILISATION,
  PLANNING_OVERLOAD_BUDGET_RATIO,
  POINTS_PER_DAY,
} from "@/domain/constants";
import { addWorkingDays, nextId } from "@/domain/rules";
import type {
  Actor,
  BaseState,
  DerivedPlan,
  Person,
  ProposalOperation,
  Task,
} from "@/domain/types";
import { derivePlan } from "./derive";

/**
 * The deterministic recovery planner.
 *
 * The agent decides *which policy* to pursue and calls these routines through
 * WebMCP; MUTUA decides the numbers. Nothing here calls a model, and nothing
 * here is a lookup table of the demo: change the dataset or a lock and the
 * operations change with it.
 *
 * Two policies, two honest trade-offs:
 *
 *   scope-flexible    Protects the team. Drops the largest non-critical launch
 *                     commitment, keeps every task whole (fragmenting QA work has
 *                     a real coordination cost) and books external help at a
 *                     comfortable 70 % utilisation. Costs more, loses scope,
 *                     leaves the most headroom.
 *
 *   scope-preserving  Protects scope and cost. Defers work the team never
 *                     committed to shipping, then rebalances slices of the
 *                     orphaned work across whoever has the skill and the room,
 *                     booking the smallest contractor block that closes the gap.
 *                     Cheaper, keeps scope, fragments ownership.
 *
 * The policy is chosen by the state of the workspace: once every non-critical
 * launch commitment is locked by the human, scope-flexible has nothing to give.
 */

export type RecoveryStrategy = "scope-flexible" | "scope-preserving";

export interface RecoveryPlan {
  strategy: RecoveryStrategy;
  operations: ProposalOperation[];
  targetPeakPercent: number;
  reachedTarget: boolean;
  rationale: string[];
}

export function planningTarget(base: BaseState): number {
  return 100 + Math.floor(base.workspace.maxOverloadPercent * PLANNING_OVERLOAD_BUDGET_RATIO);
}

export function scopeReliefCandidates(base: BaseState): Task[] {
  const protectedIds = new Set(
    base.constraints
      .filter((c) => c.type === "scope" && c.severity === "hard" && c.entityId)
      .map((c) => c.entityId as string),
  );
  return base.tasks
    .filter(
      (t) =>
        t.inLaunchScope &&
        !t.deferred &&
        !t.locked &&
        t.launchCommitment &&
        t.criticality !== "critical" &&
        !protectedIds.has(t.id),
    )
    .sort((a, b) => b.effort - a.effort);
}

export function deferralCandidates(base: BaseState): Task[] {
  return base.tasks
    .filter(
      (t) =>
        t.inLaunchScope &&
        !t.deferred &&
        !t.locked &&
        !t.launchCommitment &&
        t.criticality === "optional",
    )
    .sort((a, b) => b.effort - a.effort);
}

export function orphanedTasks(base: BaseState): Task[] {
  const unavailable = new Set(
    base.people.filter((p) => p.status === "unavailable").map((p) => p.id),
  );
  return base.tasks
    .filter((t) => t.inLaunchScope && !t.deferred && t.ownerId && unavailable.has(t.ownerId))
    .sort((a, b) => b.effort - a.effort);
}

export function chooseStrategy(base: BaseState): RecoveryStrategy {
  return scopeReliefCandidates(base).length > 0 ? "scope-flexible" : "scope-preserving";
}

/* --------------------------------------------------------------- helpers */

const CAPACITY_LIMIT_CONTRACTOR = 100;

function canDo(person: Person, discipline: Task["discipline"]): boolean {
  return person.skills.includes(discipline);
}

function slackFor(
  plan: DerivedPlan,
  personId: string,
  target: number,
  ignoreTaskIds: string[] = [],
): number {
  const load = plan.loads.find((l) => l.personId === personId);
  if (!load) return 0;
  const person = plan.people.find((p) => p.id === personId);
  const limit = person?.contractor ? CAPACITY_LIMIT_CONTRACTOR : target;
  let assigned = load.assignedEffort;
  for (const ignored of ignoreTaskIds) {
    if (!load.taskIds.includes(ignored)) continue;
    const task = plan.tasks.find((t) => t.id === ignored);
    assigned -= task?.effort ?? 0;
  }
  return Math.floor((load.capacity * limit) / 100) - assigned;
}

function roundUpToBlock(days: number): number {
  return Math.max(CONTRACTOR_BLOCK_DAYS, Math.ceil(days / CONTRACTOR_BLOCK_DAYS) * CONTRACTOR_BLOCK_DAYS);
}

function contractorFor(discipline: Task["discipline"], days: number, dailyRate: number, createdBy: Actor): ProposalOperation {
  return {
    id: nextId("op"),
    createdBy,
    type: "add_contractor",
    contractorId: `contractor-${discipline}`,
    name: `${discipline.toUpperCase()} contractor`,
    role: discipline.toUpperCase(),
    discipline,
    days,
    dailyRate,
  };
}

/** Work a person absorbed because its declared owner is unavailable. */
function inheritedTasks(base: BaseState, plan: DerivedPlan, personId: string): Task[] {
  return plan.tasks
    .filter(
      (t) =>
        !t.parentTaskId &&
        !t.locked &&
        t.inLaunchScope &&
        !t.deferred &&
        plan.effectiveOwner[t.id] === personId &&
        t.ownerId !== personId,
    )
    .sort((a, b) => b.effort - a.effort);
}

function ownTasks(base: BaseState, plan: DerivedPlan, personId: string): Task[] {
  return plan.tasks
    .filter(
      (t) =>
        !t.parentTaskId &&
        !t.locked &&
        t.inLaunchScope &&
        !t.deferred &&
        plan.effectiveOwner[t.id] === personId,
    )
    .sort((a, b) => b.effort - a.effort);
}

/* --------------------------------------------------- rebalancing routine */

interface RebalanceResult {
  operations: ProposalOperation[];
  reachedTarget: boolean;
  rationale: string[];
}

/**
 * Greedy, bounded, deterministic. Move the smallest slice that fixes the worst
 * overload, to the receiver with the tightest fit that can still take it.
 * Contractors are used first — that is what they were booked for.
 */
function rebalanceToTarget(
  base: BaseState,
  seedOperations: ProposalOperation[],
  target: number,
  createdBy: Actor,
  maxSteps = 12,
): RebalanceResult {
  const operations = [...seedOperations];
  const rationale: string[] = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const plan = derivePlan(base, operations);
    const offenders = plan.loads
      .filter((l) => l.loadPercent > target)
      .sort((a, b) => b.loadPercent - a.loadPercent);

    if (offenders.length === 0) return { operations, reachedTarget: true, rationale };

    const offender = offenders[0];
    const excess = offender.assignedEffort - Math.floor((offender.capacity * target) / 100);

    const candidates = inheritedTasks(base, plan, offender.personId);
    const movable = candidates[0] ?? ownTasks(base, plan, offender.personId)[0];
    if (!movable || movable.effort <= 1) return { operations, reachedTarget: false, rationale };

    const receivers = plan.people
      .filter(
        (p) =>
          p.id !== offender.personId &&
          p.status !== "unavailable" &&
          canDo(p, movable.discipline),
      )
      .map((p) => ({
        person: p,
        slack: slackFor(plan, p.id, target),
      }))
      .filter((r) => r.slack > 0)
      .sort((a, b) => {
        // Contractors first, then tightest fit that still holds the slice.
        if (!!a.person.contractor !== !!b.person.contractor) return a.person.contractor ? -1 : 1;
        const aFits = a.slack >= excess ? 0 : 1;
        const bFits = b.slack >= excess ? 0 : 1;
        if (aFits !== bFits) return aFits - bFits;
        return aFits === 0 ? a.slack - b.slack : b.slack - a.slack;
      });

    const receiver = receivers[0];
    if (!receiver) return { operations, reachedTarget: false, rationale };

    const amount = Math.min(excess, receiver.slack, movable.effort - 1);
    if (amount <= 0) return { operations, reachedTarget: false, rationale };

    operations.push({
      id: nextId("op"),
      createdBy,
      type: "rebalance_task",
      taskId: movable.id,
      toPersonId: receiver.person.id,
      effort: amount,
    });
    rationale.push(
      `Moved ${amount} pts of ${movable.name} from ${offender.name} to ${receiver.person.name}.`,
    );
  }

  const finalPlan = derivePlan(base, operations);
  return {
    operations,
    reachedTarget: finalPlan.peakLoadPercent <= target,
    rationale,
  };
}

/* ------------------------------------------------------------ strategies */

function planScopeFlexible(base: BaseState, createdBy: Actor): RecoveryPlan {
  const target = planningTarget(base);
  const operations: ProposalOperation[] = [];
  const rationale: string[] = [];

  const dropped = scopeReliefCandidates(base)[0];
  if (dropped) {
    operations.push({ id: nextId("op"), createdBy, type: "reduce_scope", taskId: dropped.id });
    rationale.push(`${dropped.name} leaves launch scope — the largest unlocked non-critical commitment.`);
  }

  const orphans = orphanedTasks(base);
  const unplaced: Task[] = [];
  // Every orphan is on the move, so none of them counts against a candidate's room.
  const pending = orphans.map((t) => t.id);

  for (const orphan of orphans) {
    pending.shift();
    const plan = derivePlan(base, operations);
    const receivers = plan.people
      .filter(
        (p) =>
          p.status !== "unavailable" &&
          p.id !== orphan.ownerId &&
          canDo(p, orphan.discipline),
      )
      .map((p) => ({ person: p, slack: slackFor(plan, p.id, target, [orphan.id, ...pending]) }))
      .filter((r) => r.slack >= orphan.effort)
      .sort((a, b) => a.slack - b.slack); // best fit

    const receiver = receivers[0];
    if (receiver) {
      operations.push({
        id: nextId("op"),
        createdBy,
        type: "reassign_task",
        taskId: orphan.id,
        toPersonId: receiver.person.id,
      });
      rationale.push(`${orphan.name} moves to ${receiver.person.name}, who has the room and the skill.`);
    } else {
      unplaced.push(orphan);
    }
  }

  if (unplaced.length > 0) {
    const discipline = unplaced[0].discipline;
    const effort = unplaced.reduce((sum, t) => sum + t.effort, 0);
    const days = roundUpToBlock(
      Math.ceil(effort / (POINTS_PER_DAY * CONTRACTOR_TARGET_UTILISATION)),
    );
    const contractor = contractorFor(discipline, days, base.workspace.contractorDailyRate, createdBy);
    operations.push(contractor);
    rationale.push(
      `No one internal can take ${unplaced.map((t) => t.name).join(", ")} whole — booking ${days} contractor days.`,
    );
    for (const task of unplaced) {
      operations.push({
        id: nextId("op"),
        createdBy,
        type: "reassign_task",
        taskId: task.id,
        toPersonId: (contractor as Extract<ProposalOperation, { type: "add_contractor" }>).contractorId,
      });
    }
  }

  const balanced = rebalanceToTarget(base, operations, target, createdBy);

  return {
    strategy: "scope-flexible",
    operations: orderOperations(balanced.operations),
    targetPeakPercent: target,
    reachedTarget: balanced.reachedTarget,
    rationale: [...rationale, ...balanced.rationale],
  };
}

function planScopePreserving(base: BaseState, createdBy: Actor): RecoveryPlan {
  const target = planningTarget(base);
  const seed: ProposalOperation[] = [];
  const rationale: string[] = [];

  for (const task of deferralCandidates(base)) {
    seed.push({
      id: nextId("op"),
      createdBy,
      type: "delay_task",
      taskId: task.id,
      newDate: addWorkingDays(base.workspace.launchDate, 2),
    });
    rationale.push(`${task.name} moves after launch — it was never part of the launch commitment.`);
  }

  const orphanDiscipline = orphanedTasks(base)[0]?.discipline ?? "qa";

  for (let days = 0; days <= 40; days += CONTRACTOR_BLOCK_DAYS) {
    const attempt: ProposalOperation[] = [...seed];
    if (days > 0) {
      attempt.push(contractorFor(orphanDiscipline, days, base.workspace.contractorDailyRate, createdBy));
    }
    const balanced = rebalanceToTarget(base, attempt, target, createdBy);
    if (balanced.reachedTarget) {
      return {
        strategy: "scope-preserving",
        operations: orderOperations(balanced.operations),
        targetPeakPercent: target,
        reachedTarget: true,
        rationale: [
          ...rationale,
          days > 0
            ? `${days} contractor days is the smallest block that brings every load under ${target} %.`
            : `Internal capacity absorbs the gap — no external spend needed.`,
          ...balanced.rationale,
        ],
      };
    }
  }

  const fallback = rebalanceToTarget(base, seed, target, createdBy);
  return {
    strategy: "scope-preserving",
    operations: orderOperations(fallback.operations),
    targetPeakPercent: target,
    reachedTarget: false,
    rationale: [
      ...rationale,
      "No plan reaches the workload target while every launch commitment stays locked.",
      ...fallback.rationale,
    ],
  };
}

/** Keeps the diff readable and guarantees a contractor exists before it is used. */
function orderOperations(operations: ProposalOperation[]): ProposalOperation[] {
  const rank: Record<ProposalOperation["type"], number> = {
    add_contractor: 0,
    change_capacity: 1,
    reduce_scope: 2,
    restore_scope: 2,
    delay_task: 3,
    reassign_task: 4,
    rebalance_task: 5,
  };
  return [...operations].sort((a, b) => rank[a.type] - rank[b.type]);
}

export function planRecovery(
  base: BaseState,
  options: { strategy?: RecoveryStrategy | "auto"; createdBy?: Actor } = {},
): RecoveryPlan {
  const createdBy = options.createdBy ?? "agent";
  const strategy =
    !options.strategy || options.strategy === "auto" ? chooseStrategy(base) : options.strategy;
  return strategy === "scope-flexible"
    ? planScopeFlexible(base, createdBy)
    : planScopePreserving(base, createdBy);
}
