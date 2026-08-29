import type { ProposalOperationType } from "./types";

/** 100 effort points = one engineer, full time, for the whole launch window. */
export const POINTS_PER_DAY = 5;

/**
 * How far a person can be pushed before work physically spills past the launch
 * date. Distinct from `maxOverloadPercent`, which is the team's *declared*
 * tolerance and is evaluated as a constraint.
 */
export const ABSORPTION_CEILING_PERCENT = 125;

/** Contractors are booked in whole blocks. */
export const CONTRACTOR_BLOCK_DAYS = 4;

/** A contractor is sized so the work it absorbs stays around this utilisation. */
export const CONTRACTOR_TARGET_UTILISATION = 0.7;

/**
 * The planner never spends the whole overload tolerance: it aims for 60 % of it
 * so a later human change does not immediately break the plan.
 */
export const PLANNING_OVERLOAD_BUDGET_RATIO = 0.6;

/** Soft budget guardrail used by the `budget-baseline` constraint. */
export const RECOVERY_BUDGET_SOFT_CAP = 15000;

export const OPERATION_KIND: Record<ProposalOperationType, "add" | "change" | "remove"> = {
  add_contractor: "add",
  reassign_task: "change",
  rebalance_task: "change",
  delay_task: "change",
  change_capacity: "change",
  restore_scope: "add",
  reduce_scope: "remove",
};

export const TOOL_LABELS: Record<string, string> = {
  get_workspace_state: "Inspect workspace",
  get_active_scenario: "Inspect active scenario",
  inspect_constraint: "Inspect a constraint",
  list_conflicts: "List conflicts",
  create_proposal: "Create proposal",
  modify_proposal: "Modify proposal",
  add_constraint: "Add constraint",
  lock_entity: "Lock an entity",
  simulate_proposal: "Simulate proposal",
  compare_scenarios: "Compare scenarios",
  discard_proposal: "Discard proposal",
  commit_proposal: "Commit proposal",
};

export const ALL_TOOLS = Object.keys(TOOL_LABELS);

/** Public repository, linked from the landing page. */
export const REPO_URL = "https://github.com/guelmbaye/mutua";
