/**
 * MUTUA — canonical domain model.
 *
 * One rule governs this file: every type here is shared by the human UI *and*
 * by the WebMCP tool layer. There is no "agent-side" model.
 */

/* ------------------------------------------------------------------ phases */

export type WorkspacePhase =
  | "current"
  | "draft"
  | "simulated"
  | "approved"
  | "committed";

export type Actor = "human" | "agent" | "system";

/* ------------------------------------------------------------------ people */

export type PersonStatus = "available" | "unavailable" | "partial";

export interface Person {
  id: string;
  name: string;
  role: string;
  /** Effort points available between today and the launch date. 100 = one full-time engineer. */
  capacity: number;
  status: PersonStatus;
  skills: string[];
  /** Set for capacity added by an `add_contractor` operation. */
  contractor?: boolean;
  contractorDays?: number;
  dailyRate?: number;
}

/* ------------------------------------------------------------------- work */

export type Criticality = "critical" | "important" | "optional";

export interface Task {
  id: string;
  name: string;
  ownerId?: string;
  /** Who absorbs the task when the owner becomes unavailable. Deterministic, no scheduler. */
  fallbackOwnerId?: string;
  /** Effort points. 100 points = one engineer for the whole launch window. */
  effort: number;
  criticality: Criticality;
  /** True when the task is part of what the team publicly committed to ship at launch. */
  launchCommitment: boolean;
  dueDate: string;
  dependencies: string[];
  inLaunchScope: boolean;
  /** Moved after the launch date: still planned, just not in the window. */
  deferred: boolean;
  locked: boolean;
  discipline: "backend" | "frontend" | "mobile" | "security" | "qa" | "docs";
  /** Set on slices created by a `rebalance_task` operation. */
  parentTaskId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
  locked: boolean;
}

/* ------------------------------------------------------------- constraints */

export type ConstraintType =
  | "deadline"
  | "budget"
  | "workload"
  | "scope"
  | "availability"
  | "dependency"
  | "custom";

export type ConstraintSeverity = "hard" | "soft";
export type ConstraintSource = "system" | "human" | "agent";
export type ConstraintStatus = "passed" | "warning" | "failed";

export interface Constraint {
  id: string;
  type: ConstraintType;
  label: string;
  description?: string;
  value: string | number | boolean;
  severity: ConstraintSeverity;
  locked: boolean;
  source: ConstraintSource;
  /** Present when the constraint materialises a human lock on an entity. */
  entityId?: string;
}

export interface ConstraintResult {
  constraintId: string;
  label: string;
  severity: ConstraintSeverity;
  status: ConstraintStatus;
  actualValue?: string | number;
  message?: string;
}

/* -------------------------------------------------------------- operations */

export interface OperationBase {
  id: string;
  createdBy: Actor;
}

export type ProposalOperation = OperationBase &
  (
    | { type: "reassign_task"; taskId: string; toPersonId: string }
    | { type: "rebalance_task"; taskId: string; toPersonId: string; effort: number }
    | { type: "delay_task"; taskId: string; newDate: string }
    | { type: "reduce_scope"; taskId: string }
    | { type: "restore_scope"; taskId: string }
    | {
        type: "add_contractor";
        contractorId: string;
        name: string;
        role: string;
        discipline: Task["discipline"];
        days: number;
        dailyRate: number;
      }
    | { type: "change_capacity"; personId: string; capacity: number }
  );

export type ProposalOperationType = ProposalOperation["type"];

export interface OperationDiffLine {
  operationId: string;
  kind: "add" | "change" | "remove";
  label: string;
  detail?: string;
  entityId?: string;
  /** True when the operation touches an entity that is now human-locked. */
  conflicting?: boolean;
}

/* ---------------------------------------------------------------- scenario */

export type ScenarioStatus =
  | "current"
  | "draft"
  | "simulated"
  | "approved"
  | "committed"
  | "conflicted"
  | "discarded";

export interface ScenarioMetrics {
  deadline: string;
  deadlineMet: boolean;
  projectedLaunchDate: string;
  slipDays: number;
  extraCost: number;
  totalBudget: number;
  peakLoadPercent: number;
  peakPersonId?: string;
  overloadPercent: number;
  scopeLoss: number;
  scopeLossTaskIds: string[];
}

export interface Conflict {
  type: "workload" | "deadline" | "scope" | "lock" | "assignment" | "budget";
  severity: "warning" | "failed";
  entityIds: string[];
  message: string;
}

export interface Scenario {
  id: string;
  name: string;
  kind: "current" | "proposal";
  status: ScenarioStatus;
  objective?: string;
  operations: ProposalOperation[];
  metrics?: ScenarioMetrics;
  constraintResults: ConstraintResult[];
  conflicts: Conflict[];
  /**
   * Simulation is valid only while this equals the workspace `planVersion`.
   * `planVersion` moves when the plan itself changes (people, work, constraints,
   * locks, operations) — not when you approve or switch tabs.
   */
  lastSimulatedAtPlanVersion?: number;
  createdBy: Actor;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: Actor;
  committedAt?: string;
}

/* --------------------------------------------------------------- workspace */

export interface Workspace {
  id: string;
  name: string;
  launchDate: string;
  baseBudget: number;
  maxOverloadPercent: number;
  contractorDailyRate: number;
  windowWorkingDays: number;
}

export interface ActivityEvent {
  id: string;
  at: string;
  actor: Actor;
  message: string;
  detail?: string;
  stateVersion: number;
}

/* -------------------------------------------------------- derived planning */

export interface PersonLoad {
  personId: string;
  name: string;
  role: string;
  status: PersonStatus;
  capacity: number;
  assignedEffort: number;
  loadPercent: number;
  contractor: boolean;
  taskIds: string[];
}

export interface DerivedPlan {
  people: Person[];
  tasks: Task[];
  /** taskId -> personId actually doing the work (after fallback resolution). */
  effectiveOwner: Record<string, string | undefined>;
  loads: PersonLoad[];
  peakLoadPercent: number;
  peakPersonId?: string;
  overloadPercent: number;
  extraCost: number;
  totalBudget: number;
  scopeLossTaskIds: string[];
  scopeLoss: number;
  slipDays: number;
  projectedLaunchDate: string;
  deadlineMet: boolean;
  lateTaskIds: string[];
  unassignedCriticalTaskIds: string[];
}

/** Everything the engines need, and nothing else. */
export interface BaseState {
  workspace: Workspace;
  people: Person[];
  tasks: Task[];
  milestones: Milestone[];
  constraints: Constraint[];
}

/* ------------------------------------------------------------ capabilities */

export interface CapabilityState {
  phase: WorkspacePhase;
  availableTools: string[];
  unavailableTools: { tool: string; reason: string }[];
}
