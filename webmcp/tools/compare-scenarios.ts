import { useWorkspaceStore } from "@/store/workspace-store";
import { compare } from "@/engines/comparison-engine";
import { CompareScenariosInput } from "../schemas";
import { failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const compareScenarios: ToolDefinition = {
  name: "compare_scenarios",
  title: "Compare scenarios",
  description:
    "Put the current plan and the proposals side by side on the same computed metrics, and open the comparison view for the human. The ranking is deterministic: scope first, then cost, then peak load.",
  inputSchema: CompareScenariosInput,
  jsonSchema: {
    type: "object",
    properties: {
      scenarioIds: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 3,
        description: "Defaults to the current plan plus every live proposal",
      },
    },
    additionalProperties: false,
  },
  annotations: { readOnly: true, destructive: false },
  handler: (input) => {
    const args = input as { scenarioIds?: string[] };
    const store = useWorkspaceStore.getState();

    const ids =
      args.scenarioIds ??
      store.scenarios.filter((s) => s.status !== "discarded").map((s) => s.id).slice(0, 3);

    const scenarios = ids.map((id) => store.getScenario(id)).filter(Boolean);
    if (scenarios.length !== ids.length) {
      return failResult("ENTITY_NOT_FOUND", "One of those scenarios does not exist.", {
        suggestedNextAction: "get_workspace_state",
      });
    }

    const comparison = compare(store.getBaseState(), scenarios as NonNullable<(typeof scenarios)[number]>[]);
    store.openComparison(ids);

    return okResult({
      scenarios: comparison.rows.map((row) => ({
        id: row.scenarioId,
        name: row.name,
        status: row.status,
        deadlineMet: row.metrics.deadlineMet,
        extraCost: row.metrics.extraCost,
        overloadPercent: row.metrics.overloadPercent,
        scopeLoss: row.metrics.scopeLoss,
        locksRespected: row.locksRespected,
        hardViolations: row.hardViolations,
      })),
      recommendedScenarioId: comparison.recommendedScenarioId ?? null,
      rationale: comparison.rationale ?? null,
      note: "Approval is a human action in the interface. There is no tool for it.",
    });
  },
};
