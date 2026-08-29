import { useWorkspaceStore } from "@/store/workspace-store";
import { simulate } from "@/engines/simulation-engine";
import { InspectConstraintInput } from "../schemas";
import { failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const inspectConstraint: ToolDefinition = {
  name: "inspect_constraint",
  title: "Inspect a constraint",
  description:
    "Read one constraint, its target value and whether the plan currently satisfies it. Use it to explain *why* a plan fails rather than guessing.",
  inputSchema: InspectConstraintInput,
  jsonSchema: {
    type: "object",
    properties: { constraintId: { type: "string", description: "Constraint id, e.g. max-overload" } },
    required: ["constraintId"],
    additionalProperties: false,
  },
  annotations: { readOnly: true, destructive: false },
  handler: (input) => {
    const { constraintId } = input as { constraintId: string };
    const state = useWorkspaceStore.getState();
    const constraint = state.constraints.find((c) => c.id === constraintId);
    if (!constraint) {
      return failResult("CONSTRAINT_NOT_FOUND", `No constraint called "${constraintId}".`, {
        suggestedNextAction: "get_workspace_state",
        entityId: constraintId,
      });
    }

    const scenario = state.getActiveProposal();
    const { constraintResults } = simulate(state.getBaseState(), scenario?.operations ?? []);
    const result = constraintResults.find((r) => r.constraintId === constraintId);

    return okResult({
      constraint: {
        id: constraint.id,
        label: constraint.label,
        description: constraint.description,
        type: constraint.type,
        value: constraint.value,
        severity: constraint.severity,
        source: constraint.source,
        locked: constraint.locked,
      },
      status: result?.status ?? "passed",
      actualValue: result?.actualValue,
      message: result?.message,
      evaluatedAgainst: scenario?.id ?? "current",
    });
  },
};
