import { nextId } from "@/domain/rules";
import type {
  Actor,
  BaseState,
  ProposalOperation,
  Scenario,
} from "@/domain/types";
import { simulate } from "./simulation-engine";

export interface OperationRejection {
  code: "ENTITY_NOT_FOUND" | "ENTITY_LOCKED" | "INVALID_OPERATION";
  message: string;
  entityId?: string;
}

export interface OperationValidation {
  accepted: ProposalOperation[];
  rejected: { operation: ProposalOperation; rejection: OperationRejection }[];
}

export function createProposalScenario(
  base: BaseState,
  input: { id?: string; title: string; objective?: string; createdBy: Actor },
): Scenario {
  const outcome = simulate(base, []);
  return {
    id: input.id ?? nextId("proposal"),
    name: input.title,
    kind: "proposal",
    status: "draft",
    objective: input.objective,
    operations: [],
    constraintResults: outcome.constraintResults,
    conflicts: [],
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Every mutation goes through here: schema is validated upstream by Zod, this
 * layer validates *domain* legality — entity exists, entity is not human-locked,
 * operation is meaningful.
 */
export function validateOperations(
  base: BaseState,
  operations: ProposalOperation[],
): OperationValidation {
  const accepted: ProposalOperation[] = [];
  const rejected: OperationValidation["rejected"] = [];

  for (const operation of operations) {
    const rejection = validateOperation(base, operation);
    if (rejection) rejected.push({ operation, rejection });
    else accepted.push(operation);
  }

  return { accepted, rejected };
}

export function validateOperation(
  base: BaseState,
  operation: ProposalOperation,
): OperationRejection | undefined {
  if ("taskId" in operation) {
    const task = base.tasks.find((t) => t.id === operation.taskId);
    if (!task) {
      return {
        code: "ENTITY_NOT_FOUND",
        message: `No task called "${operation.taskId}" in this workspace.`,
        entityId: operation.taskId,
      };
    }
    if (task.locked) {
      return {
        code: "ENTITY_LOCKED",
        message: `${task.name} is locked by the user and cannot be modified.`,
        entityId: task.id,
      };
    }
    if (operation.type === "rebalance_task") {
      if (operation.effort <= 0 || operation.effort >= task.effort) {
        return {
          code: "INVALID_OPERATION",
          message: `Rebalancing ${task.name} requires between 1 and ${task.effort - 1} points.`,
          entityId: task.id,
        };
      }
    }
  }

  if ("personId" in operation) {
    const person = base.people.find((p) => p.id === operation.personId);
    if (!person) {
      return {
        code: "ENTITY_NOT_FOUND",
        message: `No team member called "${operation.personId}".`,
        entityId: operation.personId,
      };
    }
  }

  if (operation.type === "add_contractor" && operation.days <= 0) {
    return { code: "INVALID_OPERATION", message: "A contractor needs at least one day." };
  }

  return undefined;
}

/**
 * Applying operations returns a *new* scenario. The canonical state is untouched
 * until `commit_proposal` promotes it.
 */
export function applyOperations(
  scenario: Scenario,
  operations: ProposalOperation[],
): Scenario {
  return {
    ...scenario,
    operations: [...scenario.operations, ...operations],
    // Any mutation invalidates a previous simulation.
    status: "draft",
    metrics: undefined,
    lastSimulatedAtPlanVersion: undefined,
  };
}

export function removeOperations(scenario: Scenario, operationIds: string[]): Scenario {
  return {
    ...scenario,
    operations: scenario.operations.filter((op) => !operationIds.includes(op.id)),
    status: "draft",
    metrics: undefined,
    lastSimulatedAtPlanVersion: undefined,
  };
}

export function isSimulationFresh(scenario: Scenario, planVersion: number): boolean {
  return (
    scenario.lastSimulatedAtPlanVersion !== undefined &&
    scenario.lastSimulatedAtPlanVersion === planVersion
  );
}
