import type { WorkspacePhase } from "@/domain/types";
import type { ToolError } from "./errors";

/** One envelope for every tool. Agents never see a stack trace. */
export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ToolError;
  stateVersion: number;
  phase: WorkspacePhase;
}

export function ok<T>(data: T, stateVersion: number, phase: WorkspacePhase): ToolResult<T> {
  return { ok: true, data, stateVersion, phase };
}

export function fail(error: ToolError, stateVersion: number, phase: WorkspacePhase): ToolResult<never> {
  return { ok: false, error, stateVersion, phase };
}
