import { useWorkspaceStore } from "@/store/workspace-store";
import { fail, ok, type ToolResult } from "./result";
import { toolError, type ToolErrorCode } from "./errors";

export function okResult<T>(data: T): ToolResult<T> {
  const state = useWorkspaceStore.getState();
  return ok(data, state.stateVersion, state.phase);
}

export function failResult(
  code: ToolErrorCode,
  message: string,
  options: { recoverable?: boolean; suggestedNextAction?: string; entityId?: string } = {},
): ToolResult<never> {
  const state = useWorkspaceStore.getState();
  return fail(toolError(code, message, options), state.stateVersion, state.phase);
}

/** Optional optimistic-concurrency guard shared by every mutating tool. */
export function checkStateVersion(expected?: number): ToolResult<never> | undefined {
  if (expected === undefined) return undefined;
  const state = useWorkspaceStore.getState();
  if (expected === state.stateVersion) return undefined;
  return failResult(
    "STALE_STATE",
    `The workspace moved on: you expected version ${expected}, it is now ${state.stateVersion}.`,
    { suggestedNextAction: "get_workspace_state" },
  );
}
