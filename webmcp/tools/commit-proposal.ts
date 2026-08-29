import { useWorkspaceStore } from "@/store/workspace-store";
import { isSimulationFresh } from "@/engines/proposal-engine";
import { simulate } from "@/engines/simulation-engine";
import { hasHardViolation } from "@/engines/constraint-engine";
import { ProposalIdInput } from "../schemas";
import { checkStateVersion, failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

/**
 * The only tool that changes canonical state.
 *
 * Hiding it before approval is guidance, not enforcement. The handler below
 * re-checks approval, simulation freshness and hard constraints on its own — so
 * an agent that calls it anyway is refused, not obeyed.
 */
export const commitProposal: ToolDefinition = {
  name: "commit_proposal",
  title: "Commit proposal",
  description:
    "Promote an approved proposal into the canonical plan. Requires a human approval already recorded in state, a fresh simulation, and zero hard constraint violations.",
  inputSchema: ProposalIdInput,
  jsonSchema: {
    type: "object",
    properties: {
      proposalId: { type: "string" },
      expectedStateVersion: { type: "number" },
    },
    additionalProperties: false,
  },
  annotations: { readOnly: false, destructive: true, requiresHumanApproval: true },
  handler: (input) => {
    const args = input as { proposalId?: string; expectedStateVersion?: number };
    const stale = checkStateVersion(args.expectedStateVersion);
    if (stale) return stale;

    const store = useWorkspaceStore.getState();
    const proposalId = args.proposalId ?? store.activeProposalId;
    if (!proposalId) {
      return failResult("NO_ACTIVE_PROPOSAL", "There is no proposal to commit.");
    }

    const scenario = store.getScenario(proposalId);
    if (!scenario) {
      return failResult("PROPOSAL_NOT_FOUND", `No proposal called "${proposalId}".`);
    }
    if (scenario.status === "committed") {
      return failResult("PROPOSAL_ALREADY_COMMITTED", `${scenario.name} is already the plan.`, {
        recoverable: false,
      });
    }
    if (scenario.status !== "approved") {
      return failResult(
        "APPROVAL_REQUIRED",
        "MUTUA requires explicit human approval before a proposal becomes real.",
        { suggestedNextAction: "Ask the human to approve it in the interface" },
      );
    }
    if (!isSimulationFresh(scenario, store.planVersion)) {
      return failResult("SIMULATION_STALE", "The plan changed after its last simulation.", {
        suggestedNextAction: "simulate_proposal",
      });
    }

    const outcome = simulate(store.getBaseState(), scenario.operations);
    if (hasHardViolation(outcome.constraintResults)) {
      return failResult(
        "HARD_CONSTRAINT_VIOLATION",
        `${scenario.name} still breaks a hard constraint and cannot become the plan.`,
        { suggestedNextAction: "list_conflicts" },
      );
    }

    const committed = store.commitProposal(proposalId, "agent");

    return okResult({
      proposalId,
      status: committed?.status ?? "committed",
      workspaceUpdated: true,
      operationsCommitted: scenario.operations.length,
      metrics: outcome.metrics,
    });
  },
};
