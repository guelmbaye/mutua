import type { WorkspacePhase } from "@/domain/types";

/**
 * The capability matrix from the WebMCP blueprint, in code.
 * This single map drives BOTH the real tool registration and the Capability
 * Inspector, so the UI and the agent can never disagree about what is possible.
 */
export const capabilityMap: Record<WorkspacePhase, string[]> = {
  current: [
    "get_workspace_state",
    "get_active_scenario",
    "inspect_constraint",
    "list_conflicts",
    "create_proposal",
    "add_constraint",
    "lock_entity",
  ],
  draft: [
    "get_workspace_state",
    "get_active_scenario",
    "inspect_constraint",
    "list_conflicts",
    "modify_proposal",
    "add_constraint",
    "lock_entity",
    "simulate_proposal",
    "discard_proposal",
  ],
  simulated: [
    "get_workspace_state",
    "get_active_scenario",
    "inspect_constraint",
    "list_conflicts",
    "modify_proposal",
    "compare_scenarios",
    "discard_proposal",
  ],
  approved: [
    "get_workspace_state",
    "compare_scenarios",
    "commit_proposal",
    "discard_proposal",
  ],
  committed: [
    "get_workspace_state",
    "get_active_scenario",
    "inspect_constraint",
    "list_conflicts",
    "create_proposal",
    "add_constraint",
    "lock_entity",
  ],
};

/**
 * Why a capability is not on the table right now. These strings are written for
 * the person reading the inspector, not for a log file.
 */
export function unavailableReason(tool: string, phase: WorkspacePhase): string {
  switch (tool) {
    case "create_proposal":
      return "A proposal is already open — commit or discard it first";

    case "modify_proposal":
      if (phase === "approved") return "Approved plans are frozen — discard to keep editing";
      if (phase === "committed") return "The plan is committed — start a new proposal";
      return "No proposal is open";

    case "simulate_proposal":
      if (phase === "approved") return "Already simulated and approved";
      if (phase === "simulated") return "Simulation is up to date";
      if (phase === "committed") return "The plan is committed — nothing to simulate";
      return "No proposal is open";

    case "compare_scenarios":
      if (phase === "committed") return "The plan is committed — start a new proposal to compare";
      return "Run a simulation first";

    case "commit_proposal":
      if (phase === "committed") return "Already committed";
      if (phase === "simulated") return "Requires your explicit approval";
      if (phase === "draft") return "Needs a simulation, then your approval";
      return "Requires an approved proposal";

    case "discard_proposal":
      if (phase === "committed") return "The plan is committed — there is nothing to discard";
      return "No proposal is open";

    case "add_constraint":
    case "lock_entity":
      if (phase === "approved") return "Approved plans are frozen — withdraw approval to change constraints";
      if (phase === "simulated")
        return "Changing constraints now would invalidate the simulation — you can still lock from the interface";
      return "Not available in this state";

    case "get_active_scenario":
    case "inspect_constraint":
    case "list_conflicts":
      if (phase === "approved") return "Approved — the agent's remaining job is to commit or discard";
      return "Not available in this state";

    default:
      return "Not available in this state";
  }
}
