import { useWorkspaceStore } from "@/store/workspace-store";
import { buildDiff } from "@/engines/diff-engine";
import { isSimulationFresh } from "@/engines/proposal-engine";
import { EmptyInput } from "../schemas";
import { okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const getActiveScenario: ToolDefinition = {
  name: "get_active_scenario",
  title: "Inspect active scenario",
  description:
    "Read the scenario currently in focus — its operations, its simulated metrics, whether that simulation is still fresh, and any conflicts it carries.",
  inputSchema: EmptyInput,
  jsonSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnly: true, destructive: false },
  handler: () => {
    const state = useWorkspaceStore.getState();
    const scenario =
      state.getActiveProposal() ??
      state.getScenario(state.viewedScenarioId) ??
      state.getScenario("current")!;

    return okResult({
      scenarioId: scenario.id,
      name: scenario.name,
      status: scenario.status,
      objective: scenario.objective ?? null,
      createdBy: scenario.createdBy,
      operations: buildDiff(state.getBaseState(), scenario.operations).map((line) => ({
        id: line.operationId,
        kind: line.kind,
        summary: line.label,
        detail: line.detail,
        conflicting: !!line.conflicting,
      })),
      metrics: scenario.metrics ?? null,
      simulationFresh: isSimulationFresh(scenario, state.planVersion),
      conflicts: scenario.conflicts,
      constraints: scenario.constraintResults,
    });
  },
};
