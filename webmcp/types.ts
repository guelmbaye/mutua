import type { z } from "zod";
import type { ToolResult } from "./result";

export interface ToolAnnotations {
  /** Reads state only. */
  readOnly: boolean;
  /** Changes canonical state that a human would have to undo by hand. */
  destructive: boolean;
  /** Cannot run without an explicit human approval recorded in state. */
  requiresHumanApproval?: boolean;
}

export interface ToolDefinition<Input = unknown, Output = unknown> {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  /** JSON Schema handed to the agent runtime. Kept next to the Zod schema on purpose. */
  jsonSchema: Record<string, unknown>;
  annotations: ToolAnnotations;
  handler: (input: Input) => ToolResult<Output>;
}
