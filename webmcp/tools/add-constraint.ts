import { useWorkspaceStore } from "@/store/workspace-store";
import { AddConstraintInput } from "../schemas";
import { okResult } from "../envelope";
import type { ToolDefinition } from "../types";
import type { ConstraintSeverity, ConstraintType } from "@/domain/types";

export const addConstraint: ToolDefinition = {
  name: "add_constraint",
  title: "Add constraint",
  description:
    "Record a new rule the plan must satisfy, for example a ceiling on recovery spend. Adding a constraint invalidates any open simulation, because the plan now answers to a new question.",
  inputSchema: AddConstraintInput,
  jsonSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["deadline", "budget", "workload", "scope", "availability", "dependency", "custom"],
      },
      label: { type: "string" },
      value: { type: ["string", "number"] },
      severity: { type: "string", enum: ["hard", "soft"] },
    },
    required: ["type", "label", "value"],
    additionalProperties: false,
  },
  annotations: { readOnly: false, destructive: false },
  handler: (input) => {
    const args = input as {
      type: ConstraintType;
      label: string;
      value: string | number;
      severity?: ConstraintSeverity;
    };
    const store = useWorkspaceStore.getState();
    const constraint = store.addConstraint(
      { type: args.type, label: args.label, value: args.value, severity: args.severity ?? "soft" },
      "agent",
    );
    return okResult({
      constraintId: constraint.id,
      created: true,
      simulationInvalidated: true,
      nextStep: "simulate_proposal",
    });
  },
};
