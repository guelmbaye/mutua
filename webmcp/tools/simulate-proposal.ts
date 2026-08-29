import { useWorkspaceStore } from "@/store/workspace-store";
import { simulate, summariseConstraints } from "@/engines/simulation-engine";
import { SimulateProposalInput } from "../schemas";
import { checkStateVersion, failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const simulateProposal: ToolDefinition = {
  name: "simulate_proposal",
  title: "Simulate proposal",
  description:
    "Evaluate the open proposal against deadline, budget, workload, scope and every locked constraint. MUTUA computes the numbers; do not estimate them yourself. Run this before comparing or recommending anything.",
  inputSchema: SimulateProposalInput,
  jsonSchema: {
    type: "object",
    properties: {
      proposalId: { type: "string", description: "Defaults to the open proposal" },
      expectedStateVersion: { type: "number" },
    },
    additionalProperties: false,
  },
  annotations: { readOnly: false, destructive: false },
  handler: (input) => {
    const args = input as { proposalId?: string; expectedStateVersion?: number };
    const stale = checkStateVersion(args.expectedStateVersion);
    if (stale) return stale;

    const store = useWorkspaceStore.getState();
    const proposalId = args.proposalId ?? store.activeProposalId;
    if (!proposalId) {
      return failResult("NO_ACTIVE_PROPOSAL", "There is no open proposal to simulate.", {
        suggestedNextAction: "create_proposal",
      });
    }

    const scenario = store.getScenario(proposalId);
    if (!scenario) {
      return failResult("PROPOSAL_NOT_FOUND", `No proposal called "${proposalId}".`);
    }

    const outcome = simulate(store.getBaseState(), scenario.operations);
    store.simulateProposal(proposalId, "agent");

    const latest = useWorkspaceStore.getState();
    const updated = latest.getScenario(proposalId)!;

    return okResult({
      proposalId,
      status: updated.status,
      metrics: outcome.metrics,
      constraints: summariseConstraints(outcome.constraintResults),
      failedConstraints: outcome.constraintResults.filter((r) => r.status === "failed"),
      conflicts: outcome.conflicts,
      humanApprovalRequired: true,
      nextStep: updated.status === "conflicted" ? "create_proposal" : "compare_scenarios",
    });
  },
};
