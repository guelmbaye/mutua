import { useWorkspaceStore } from "@/store/workspace-store";
import { planRecovery, type RecoveryStrategy } from "@/engines/planner";
import { buildDiff } from "@/engines/diff-engine";
import { CreateProposalInput } from "../schemas";
import { checkStateVersion, failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const createProposal: ToolDefinition = {
  name: "create_proposal",
  title: "Create proposal",
  description:
    "Open a reversible proposal on top of the current plan. Nothing in the canonical workspace changes. Set autoPlan to let the workspace draft a recovery under its own deterministic rules — it will refuse to touch anything the human has locked.",
  inputSchema: CreateProposalInput,
  jsonSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short name shown on the scenario tab" },
      objective: { type: "string", description: "What this proposal is trying to protect" },
      strategy: {
        type: "string",
        enum: ["auto", "scope-flexible", "scope-preserving"],
        description:
          "auto reads the workspace: once every non-critical commitment is locked, only scope-preserving remains",
      },
      autoPlan: { type: "boolean", description: "Attach a planned set of operations immediately" },
      expectedStateVersion: { type: "number" },
    },
    additionalProperties: false,
  },
  annotations: { readOnly: false, destructive: false },
  handler: (input) => {
    const args = input as {
      title?: string;
      objective?: string;
      strategy?: RecoveryStrategy | "auto";
      autoPlan?: boolean;
      expectedStateVersion?: number;
    };
    const stale = checkStateVersion(args.expectedStateVersion);
    if (stale) return stale;

    const store = useWorkspaceStore.getState();
    if (store.activeProposalId) {
      return failResult(
        "PROPOSAL_ALREADY_ACTIVE",
        "A proposal is already open. Commit, discard, or ask the human to approve it first.",
        { suggestedNextAction: "get_active_scenario" },
      );
    }

    const scenario = store.createProposal(
      { title: args.title ?? "", objective: args.objective },
      "agent",
    );
    if (!scenario) {
      return failResult("INVALID_OPERATION", "The workspace refused to open a new proposal.");
    }

    let operationsAccepted = 0;
    let strategy: RecoveryStrategy | undefined;
    let rationale: string[] = [];

    if (args.autoPlan !== false) {
      const after = useWorkspaceStore.getState();
      const planned = planRecovery(after.getBaseState(), {
        strategy: args.strategy ?? "auto",
        createdBy: "agent",
      });
      strategy = planned.strategy;
      rationale = planned.rationale;
      const result = after.modifyProposal(scenario.id, planned.operations, "agent");
      operationsAccepted = result.accepted;
    }

    const latest = useWorkspaceStore.getState();
    const updated = latest.getScenario(scenario.id)!;

    return okResult({
      proposalId: updated.id,
      name: updated.name,
      status: updated.status,
      baseScenarioId: "current",
      strategy,
      rationale,
      operationsAccepted,
      operations: buildDiff(latest.getBaseState(), updated.operations).map((line) => ({
        id: line.operationId,
        kind: line.kind,
        summary: line.label,
      })),
      nextStep: "simulate_proposal",
    });
  },
};
