import { OPERATION_KIND } from "@/domain/constants";
import { formatShortDate } from "@/domain/rules";
import type { BaseState, OperationDiffLine, ProposalOperation } from "@/domain/types";

/**
 * Operations are the unit of change. This turns them into the sentences a human
 * reads in the Proposal Diff — no JSON ever reaches the screen.
 */
export function buildDiff(base: BaseState, operations: ProposalOperation[]): OperationDiffLine[] {
  const taskName = (id: string) => base.tasks.find((t) => t.id === id)?.name ?? id;
  const personName = (id: string) =>
    base.people.find((p) => p.id === id)?.name ??
    operations
      .filter((op) => op.type === "add_contractor")
      .find((op) => op.type === "add_contractor" && op.contractorId === id)?.name ??
    id;
  const isLocked = (id: string) => !!base.tasks.find((t) => t.id === id)?.locked;

  return operations.map((op) => {
    const base_: Omit<OperationDiffLine, "label"> = {
      operationId: op.id,
      kind: OPERATION_KIND[op.type],
      entityId: "taskId" in op ? op.taskId : undefined,
      conflicting: "taskId" in op ? isLocked(op.taskId) : false,
    };

    switch (op.type) {
      case "add_contractor":
        return {
          ...base_,
          label: `Add ${op.role} contractor for ${op.days} days`,
          detail: `${(op.days * op.dailyRate).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} at ${op.dailyRate}/day`,
        };
      case "reassign_task":
        return {
          ...base_,
          label: `Reassign ${taskName(op.taskId)} to ${personName(op.toPersonId)}`,
        };
      case "rebalance_task":
        return {
          ...base_,
          label: `Rebalance ${taskName(op.taskId)} — ${op.effort} pts to ${personName(op.toPersonId)}`,
        };
      case "delay_task":
        return {
          ...base_,
          label: `Move ${taskName(op.taskId)} to ${formatShortDate(op.newDate)}`,
          detail: "After launch — stays planned, out of the launch window",
        };
      case "reduce_scope":
        return { ...base_, label: `Remove ${taskName(op.taskId)} from launch scope` };
      case "restore_scope":
        return { ...base_, label: `Restore ${taskName(op.taskId)} to launch scope` };
      case "change_capacity":
        return {
          ...base_,
          label: `Set ${personName(op.personId)} capacity to ${op.capacity} pts`,
        };
    }
  });
}
