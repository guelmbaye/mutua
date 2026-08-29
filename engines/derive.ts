import {
  ABSORPTION_CEILING_PERCENT,
  POINTS_PER_DAY,
} from "@/domain/constants";
import { addWorkingDays, isAfter, loadPercent } from "@/domain/rules";
import type {
  BaseState,
  DerivedPlan,
  Person,
  PersonLoad,
  ProposalOperation,
  Task,
} from "@/domain/types";

/**
 * The single source of truth for "what would this plan look like".
 *
 * `derivePlan` never mutates the canonical state: it clones, applies the
 * operations of a scenario in order, then measures. The current plan is simply
 * `derivePlan(base, [])`.
 */
export function derivePlan(base: BaseState, operations: ProposalOperation[]): DerivedPlan {
  const people: Person[] = base.people.map((p) => ({ ...p, skills: [...p.skills] }));
  const tasks: Task[] = base.tasks.map((t) => ({ ...t, dependencies: [...t.dependencies] }));

  let extraCost = 0;

  const personById = (id: string) => people.find((p) => p.id === id);
  const taskById = (id: string) => tasks.find((t) => t.id === id);

  for (const op of operations) {
    switch (op.type) {
      case "add_contractor": {
        if (personById(op.contractorId)) break;
        people.push({
          id: op.contractorId,
          name: op.name,
          role: op.role,
          capacity: op.days * POINTS_PER_DAY,
          status: "available",
          skills: [op.discipline],
          contractor: true,
          contractorDays: op.days,
          dailyRate: op.dailyRate,
        });
        extraCost += op.days * op.dailyRate;
        break;
      }
      case "reassign_task": {
        const task = taskById(op.taskId);
        if (task) {
          task.ownerId = op.toPersonId;
          task.fallbackOwnerId = undefined;
        }
        break;
      }
      case "rebalance_task": {
        const task = taskById(op.taskId);
        if (!task) break;
        const moved = Math.min(op.effort, task.effort);
        task.effort -= moved;
        tasks.push({
          ...task,
          id: `${task.id}::${op.toPersonId}`,
          name: `${task.name} (share)`,
          ownerId: op.toPersonId,
          fallbackOwnerId: undefined,
          effort: moved,
          parentTaskId: task.id,
          locked: false,
        });
        break;
      }
      case "delay_task": {
        const task = taskById(op.taskId);
        if (!task) break;
        task.dueDate = op.newDate;
        task.deferred = isAfter(op.newDate, base.workspace.launchDate);
        break;
      }
      case "reduce_scope": {
        const task = taskById(op.taskId);
        if (task) task.inLaunchScope = false;
        break;
      }
      case "restore_scope": {
        const task = taskById(op.taskId);
        if (task) {
          task.inLaunchScope = true;
          task.deferred = false;
        }
        break;
      }
      case "change_capacity": {
        const person = personById(op.personId);
        if (person) person.capacity = op.capacity;
        break;
      }
    }
  }

  /* ------------------------------------------------------ owner resolution */

  const isAvailable = (id?: string) => {
    if (!id) return false;
    const person = personById(id);
    return !!person && person.status !== "unavailable";
  };

  const effectiveOwner: Record<string, string | undefined> = {};
  for (const task of tasks) {
    if (isAvailable(task.ownerId)) effectiveOwner[task.id] = task.ownerId;
    else if (isAvailable(task.fallbackOwnerId)) effectiveOwner[task.id] = task.fallbackOwnerId;
    else effectiveOwner[task.id] = undefined;
  }

  /* ---------------------------------------------------------------- loads */

  const countsInWindow = (task: Task) => task.inLaunchScope && !task.deferred;

  const loads: PersonLoad[] = people
    .filter((p) => p.status !== "unavailable")
    .map((person) => {
      const owned = tasks.filter(
        (t) => countsInWindow(t) && effectiveOwner[t.id] === person.id,
      );
      const assignedEffort = owned.reduce((sum, t) => sum + t.effort, 0);
      return {
        personId: person.id,
        name: person.name,
        role: person.role,
        status: person.status,
        capacity: person.capacity,
        assignedEffort,
        loadPercent: loadPercent(assignedEffort, person.capacity),
        contractor: !!person.contractor,
        taskIds: owned.map((t) => t.id),
      };
    });

  const peak = loads.reduce<PersonLoad | undefined>(
    (max, load) => (!max || load.loadPercent > max.loadPercent ? load : max),
    undefined,
  );
  const peakLoadPercent = peak?.loadPercent ?? 0;
  const overloadPercent = Math.max(0, peakLoadPercent - 100);

  /* ---------------------------------------------------------------- scope */

  const scopeLossTaskIds = tasks
    .filter((t) => t.launchCommitment && !t.parentTaskId && (!t.inLaunchScope || t.deferred))
    .map((t) => t.id);

  /* ------------------------------------------------------------- deadline */

  const lateTaskIds: string[] = [];
  let slipDays = 0;

  for (const load of loads) {
    const ceiling = (load.capacity * ABSORPTION_CEILING_PERCENT) / 100;
    if (load.assignedEffort <= ceiling) continue;
    const overflowPoints = load.assignedEffort - ceiling;
    const personSlip = Math.ceil(overflowPoints / POINTS_PER_DAY);
    slipDays = Math.max(slipDays, personSlip);
    for (const taskId of load.taskIds) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.criticality === "critical") lateTaskIds.push(taskId);
    }
  }

  const unassignedCriticalTaskIds = tasks
    .filter((t) => countsInWindow(t) && t.criticality === "critical" && !effectiveOwner[t.id])
    .map((t) => t.id);

  if (unassignedCriticalTaskIds.length > 0) {
    slipDays = Math.max(slipDays, 5);
    lateTaskIds.push(...unassignedCriticalTaskIds);
  }

  const projectedLaunchDate =
    slipDays > 0 ? addWorkingDays(base.workspace.launchDate, slipDays) : base.workspace.launchDate;

  return {
    people,
    tasks,
    effectiveOwner,
    loads,
    peakLoadPercent,
    peakPersonId: peak?.personId,
    overloadPercent,
    extraCost,
    totalBudget: base.workspace.baseBudget + extraCost,
    scopeLossTaskIds,
    scopeLoss: scopeLossTaskIds.length,
    slipDays,
    projectedLaunchDate,
    deadlineMet: slipDays === 0,
    lateTaskIds: Array.from(new Set(lateTaskIds)),
    unassignedCriticalTaskIds,
  };
}
