import { useWorkspaceStore } from "@/store/workspace-store";
import { ProposalIdInput } from "../schemas";
import { checkStateVersion, failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const discardProposal: ToolDefinition = {
  name: "discard_proposal",
  title: "Discard proposal",
  description:
    "Drop a proposal that is not going anywhere. The canonical plan is untouched — a discarded proposal never became real.",
  inputSchema: ProposalIdInput,
  jsonSchema: {
    type: "object",
    properties: {
      proposalId: { type: "string" },
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
      return failResult("NO_ACTIVE_PROPOSAL", "There is no proposal to discard.");
    }

    const scenario = store.discardProposal(proposalId, "agent");
    if (!scenario) {
      return failResult("PROPOSAL_NOT_FOUND", `No proposal called "${proposalId}".`);
    }

    return okResult({ proposalId, status: scenario.status });
  },
};
