export const ERROR_CODES = [
  "ENTITY_NOT_FOUND",
  "ENTITY_LOCKED",
  "CONSTRAINT_NOT_FOUND",
  "NO_ACTIVE_PROPOSAL",
  "PROPOSAL_NOT_FOUND",
  "PROPOSAL_ALREADY_ACTIVE",
  "INVALID_OPERATION",
  "INVALID_INPUT",
  "SIMULATION_REQUIRED",
  "SIMULATION_STALE",
  "APPROVAL_REQUIRED",
  "HARD_CONSTRAINT_VIOLATION",
  "PROPOSAL_ALREADY_COMMITTED",
  "STALE_STATE",
  "TOOL_NOT_AVAILABLE",
] as const;

export type ToolErrorCode = (typeof ERROR_CODES)[number];

export interface ToolError {
  code: ToolErrorCode;
  message: string;
  recoverable: boolean;
  suggestedNextAction?: string;
  entityId?: string;
}

export function toolError(
  code: ToolErrorCode,
  message: string,
  options: { recoverable?: boolean; suggestedNextAction?: string; entityId?: string } = {},
): ToolError {
  return {
    code,
    message,
    recoverable: options.recoverable ?? true,
    suggestedNextAction: options.suggestedNextAction,
    entityId: options.entityId,
  };
}
