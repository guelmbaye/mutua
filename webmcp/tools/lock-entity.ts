import { useWorkspaceStore } from "@/store/workspace-store";
import { LockEntityInput } from "../schemas";
import { failResult, okResult } from "../envelope";
import type { ToolDefinition } from "../types";

/**
 * The lock exists as a tool so an agent can *prepare* a lock the human asked for
 * out loud. The demo path is the human clicking the lock in the interface — human
 * intent stays explicit and visible either way.
 */
export const lockEntity: ToolDefinition = {
  name: "lock_entity",
  title: "Lock an entity",
  description:
    "Protect a decision so no proposal can trade it away. A locked task cannot be rescoped, delayed, reassigned or resized by any later operation.",
  inputSchema: LockEntityInput,
  jsonSchema: {
    type: "object",
    properties: {
      entityType: { type: "string", enum: ["task", "milestone", "constraint"] },
      entityId: { type: "string" },
      reason: { type: "string", description: "Shown to the human next to the lock" },
    },
    required: ["entityType", "entityId"],
    additionalProperties: false,
  },
  annotations: { readOnly: false, destructive: false },
  handler: (input) => {
    const args = input as {
      entityType: "task" | "milestone" | "constraint";
      entityId: string;
      reason?: string;
    };
    const store = useWorkspaceStore.getState();
    const result = store.lockEntity(args, "agent");
    if (!result.ok) {
      return failResult("ENTITY_NOT_FOUND", result.message, { entityId: args.entityId });
    }
    return okResult({
      entityId: args.entityId,
      locked: true,
      reason: args.reason,
      message: result.message,
    });
  },
};
