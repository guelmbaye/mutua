import { useWorkspaceStore } from "@/store/workspace-store";
import { simulate } from "@/engines/simulation-engine";
import { ListConflictsInput } from "../schemas";
import { failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const listConflicts: ToolDefinition = {
  name: "list_conflicts",
  title: "List conflicts",
  description:
    "List everything currently wrong with a scenario: overloaded people, work running past launch, unowned critical tasks, and any human lock a plan would break. Defaults to the active scenario.",
  inputSchema: ListConflictsInput,
  jsonSchema: {
    type: "object",
    properties: { scenarioId: { type: "string", description: "Defaults to the active scenario" } },
    additionalProperties: false,
  },
  annotations: { readOnly: true, destructive: false },
  handler: (input) => {
    const { scenarioId } = input as { scenarioId?: string };
    const state = useWorkspaceStore.getState();
    const scenario = scenarioId
      ? state.getScenario(scenarioId)
      : (state.getActiveProposal() ?? state.getScenario("current"));

    if (!scenario) {
      return failResult("ENTITY_NOT_FOUND", `No scenario called "${scenarioId}".`, {
        suggestedNextAction: "get_workspace_state",
      });
    }

    const { conflicts, constraintResults, plan } = simulate(
      state.getBaseState(),
      scenario.operations,
    );

    return okResult({
      scenarioId: scenario.id,
      conflicts,
      failedConstraints: constraintResults.filter((r) => r.status === "failed"),
      peak: plan.peakPersonId
        ? {
            personId: plan.peakPersonId,
            loadPercent: plan.peakLoadPercent,
          }
        : null,
    });
  },
};
