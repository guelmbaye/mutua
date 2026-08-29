import { useWorkspaceStore } from "@/store/workspace-store";
import { nextId } from "@/domain/rules";
import type { ProposalOperation } from "@/domain/types";
import { buildDiff } from "@/engines/diff-engine";
import { ModifyProposalInput, type OperationInputType } from "../schemas";
import { checkStateVersion, failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

function toOperation(input: OperationInputType, dailyRate: number): ProposalOperation {
  const id = nextId("op");
  switch (input.type) {
    case "add_contractor":
      return {
        id,
        createdBy: "agent",
        type: "add_contractor",
        contractorId: `contractor-${input.discipline}`,
        name: `${input.discipline.toUpperCase()} contractor`,
        role: input.role,
        discipline: input.discipline,
        days: input.days,
        dailyRate: input.dailyRate ?? dailyRate,
      };
    default:
      return { id, createdBy: "agent", ...input } as ProposalOperation;
  }
}

export const modifyProposal: ToolDefinition = {
  name: "modify_proposal",
  title: "Modify proposal",
  description:
    "Add explicit, reversible operations to the open proposal: reassign or rebalance work, delay a task, drop or restore launch scope, book a contractor, change capacity. Operations that touch a human-locked entity are refused, never silently applied.",
  inputSchema: ModifyProposalInput,
  jsonSchema: {
    type: "object",
    properties: {
      proposalId: { type: "string", description: "Defaults to the open proposal" },
      operations: {
        type: "array",
        minItems: 1,
        maxItems: 20,
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "reassign_task",
                "rebalance_task",
                "delay_task",
                "reduce_scope",
                "restore_scope",
                "add_contractor",
                "change_capacity",
              ],
            },
            taskId: { type: "string" },
            toPersonId: { type: "string" },
            effort: { type: "number", description: "Points moved by rebalance_task" },
            newDate: { type: "string", description: "YYYY-MM-DD" },
            personId: { type: "string" },
            capacity: { type: "number" },
            role: { type: "string" },
            discipline: {
              type: "string",
              enum: ["backend", "frontend", "mobile", "security", "qa", "docs"],
            },
            days: { type: "number" },
            dailyRate: { type: "number" },
          },
          required: ["type"],
        },
      },
      expectedStateVersion: { type: "number" },
    },
    required: ["operations"],
    additionalProperties: false,
  },
  annotations: { readOnly: false, destructive: false },
  handler: (input) => {
    const args = input as {
      proposalId?: string;
      operations: OperationInputType[];
      expectedStateVersion?: number;
    };
    const stale = checkStateVersion(args.expectedStateVersion);
    if (stale) return stale;

    const store = useWorkspaceStore.getState();
    const proposalId = args.proposalId ?? store.activeProposalId;
    if (!proposalId) {
      return failResult("NO_ACTIVE_PROPOSAL", "There is no open proposal to modify.", {
        suggestedNextAction: "create_proposal",
      });
    }

    const operations = args.operations.map((op) => toOperation(op, store.workspace.contractorDailyRate));
    const { accepted, rejected } = store.modifyProposal(proposalId, operations, "agent");

    if (accepted === 0 && rejected.length > 0) {
      const locked = rejected.find((r) => r.rejection.code === "ENTITY_LOCKED");
      if (locked) {
        return failResult("ENTITY_LOCKED", locked.rejection.message, {
          entityId: locked.rejection.entityId,
          suggestedNextAction: "get_workspace_state",
        });
      }
      return failResult("INVALID_OPERATION", rejected[0].rejection.message, {
        entityId: rejected[0].rejection.entityId,
      });
    }

    const latest = useWorkspaceStore.getState();
    const scenario = latest.getScenario(proposalId)!;

    return okResult({
      proposalId,
      operationsAccepted: accepted,
      warnings: rejected.map((r) => ({
        code: r.rejection.code,
        message: r.rejection.message,
        entityId: r.rejection.entityId,
      })),
      operations: buildDiff(latest.getBaseState(), scenario.operations).map((line) => ({
        id: line.operationId,
        kind: line.kind,
        summary: line.label,
      })),
      nextStep: "simulate_proposal",
    });
  },
};
