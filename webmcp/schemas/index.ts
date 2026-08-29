import { z } from "zod";

export const EmptyInput = z.object({
  expectedStateVersion: z.number().int().optional(),
});

export const OperationInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reassign_task"),
    taskId: z.string().min(1),
    toPersonId: z.string().min(1),
  }),
  z.object({
    type: z.literal("rebalance_task"),
    taskId: z.string().min(1),
    toPersonId: z.string().min(1),
    effort: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("delay_task"),
    taskId: z.string().min(1),
    newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({ type: z.literal("reduce_scope"), taskId: z.string().min(1) }),
  z.object({ type: z.literal("restore_scope"), taskId: z.string().min(1) }),
  z.object({
    type: z.literal("add_contractor"),
    role: z.string().min(1),
    discipline: z.enum(["backend", "frontend", "mobile", "security", "qa", "docs"]),
    days: z.number().int().positive(),
    dailyRate: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("change_capacity"),
    personId: z.string().min(1),
    capacity: z.number().int().positive(),
  }),
]);

export type OperationInputType = z.infer<typeof OperationInput>;

export const CreateProposalInput = z.object({
  title: z.string().min(1).max(80).optional(),
  objective: z.string().min(1).max(240).optional(),
  /** Which recovery policy to pursue. `auto` lets the workspace decide from its own state. */
  strategy: z.enum(["auto", "scope-flexible", "scope-preserving"]).optional(),
  /** When true, the workspace plans the operations for you and attaches them. */
  autoPlan: z.boolean().optional(),
  expectedStateVersion: z.number().int().optional(),
});

export const ModifyProposalInput = z.object({
  proposalId: z.string().optional(),
  operations: z.array(OperationInput).min(1).max(20),
  expectedStateVersion: z.number().int().optional(),
});

export const SimulateProposalInput = z.object({
  proposalId: z.string().optional(),
  expectedStateVersion: z.number().int().optional(),
});

export const CompareScenariosInput = z.object({
  scenarioIds: z.array(z.string()).min(2).max(3).optional(),
});

export const InspectConstraintInput = z.object({
  constraintId: z.string().min(1),
});

export const ListConflictsInput = z.object({
  scenarioId: z.string().optional(),
});

export const LockEntityInput = z.object({
  entityType: z.enum(["task", "milestone", "constraint"]),
  entityId: z.string().min(1),
  reason: z.string().max(240).optional(),
});

export const AddConstraintInput = z.object({
  type: z.enum(["deadline", "budget", "workload", "scope", "availability", "dependency", "custom"]),
  label: z.string().min(1).max(80),
  value: z.union([z.string(), z.number()]),
  severity: z.enum(["hard", "soft"]).default("soft"),
});

export const ProposalIdInput = z.object({
  proposalId: z.string().optional(),
  expectedStateVersion: z.number().int().optional(),
});
