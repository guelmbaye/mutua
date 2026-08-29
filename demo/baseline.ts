import type { BaseState, Constraint, Milestone, Person, Task, Workspace } from "@/domain/types";
import { RECOVERY_BUDGET_SOFT_CAP } from "@/domain/constants";

/**
 * The baseline dataset is calibrated so the deterministic engines produce the
 * golden demo numbers. Nothing below is a display value: every metric shown in
 * the UI is recomputed from these efforts and capacities.
 *
 *   Baseline (everyone available)      peak 95 %   overload  0 %   on time
 *   Maya unavailable                   peak 134 %  overload 34 %   2 days late
 *   Proposal A (scope-flexible)        peak 104 %  overload  4 %   +$12,000   scope loss 1
 *   Proposal B (scope-preserving)      peak 109 %  overload  9 %   +$4,000    scope loss 0
 */

export const LAUNCH_DATE = "2026-09-30";

export const baselineWorkspace: Workspace = {
  id: "workspace-launch-recovery",
  name: "September Launch Recovery",
  launchDate: LAUNCH_DATE,
  baseBudget: 420_000,
  maxOverloadPercent: 15,
  contractorDailyRate: 1_000,
  windowWorkingDays: 20,
};

export const baselinePeople: Person[] = [
  { id: "aisha", name: "Aisha", role: "Backend", capacity: 100, status: "available", skills: ["backend", "payments"] },
  { id: "sam", name: "Sam", role: "Full-stack", capacity: 100, status: "available", skills: ["backend", "frontend", "qa"] },
  { id: "leila", name: "Leila", role: "Mobile", capacity: 100, status: "available", skills: ["mobile", "release"] },
  { id: "noah", name: "Noah", role: "Security", capacity: 100, status: "available", skills: ["security", "qa"] },
  { id: "maya", name: "Maya", role: "QA", capacity: 100, status: "available", skills: ["qa", "automation"] },
];

export const baselineTasks: Task[] = [
  {
    id: "payment-integration",
    name: "Payment integration",
    ownerId: "aisha",
    fallbackOwnerId: "sam",
    effort: 79,
    criticality: "critical",
    launchCommitment: true,
    dueDate: "2026-09-22",
    dependencies: [],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "backend",
  },
  {
    id: "payment-qa",
    name: "Payment QA",
    ownerId: "maya",
    fallbackOwnerId: "aisha",
    effort: 55,
    criticality: "critical",
    launchCommitment: true,
    dueDate: "2026-09-25",
    dependencies: ["payment-integration"],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "qa",
  },
  {
    id: "security-review",
    name: "Security review",
    ownerId: "noah",
    effort: 88,
    criticality: "critical",
    launchCommitment: true,
    dueDate: "2026-09-26",
    dependencies: [],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "security",
  },
  {
    id: "mobile-release",
    name: "Mobile release",
    ownerId: "leila",
    fallbackOwnerId: "sam",
    effort: 76,
    criticality: "critical",
    launchCommitment: true,
    dueDate: "2026-09-28",
    dependencies: [],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "mobile",
  },
  {
    id: "analytics-dashboard",
    name: "Analytics dashboard",
    ownerId: "sam",
    effort: 41,
    criticality: "important",
    launchCommitment: true,
    dueDate: "2026-09-29",
    dependencies: [],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "frontend",
  },
  {
    id: "regression-testing",
    name: "Regression testing",
    ownerId: "maya",
    fallbackOwnerId: "sam",
    effort: 40,
    criticality: "critical",
    launchCommitment: true,
    dueDate: "2026-09-29",
    dependencies: ["payment-qa"],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "qa",
  },
  {
    id: "documentation",
    name: "Documentation",
    ownerId: "sam",
    effort: 18,
    criticality: "optional",
    launchCommitment: false,
    dueDate: "2026-09-29",
    dependencies: [],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "docs",
  },
  {
    id: "launch-readiness",
    name: "Launch readiness",
    ownerId: "sam",
    effort: 31,
    criticality: "critical",
    launchCommitment: true,
    dueDate: "2026-09-30",
    dependencies: ["regression-testing"],
    inLaunchScope: true,
    deferred: false,
    locked: false,
    discipline: "qa",
  },
];

export const baselineMilestones: Milestone[] = [
  { id: "september-launch", name: "September launch", date: LAUNCH_DATE, locked: false },
];

export const baselineConstraints: Constraint[] = [
  {
    id: "launch-deadline",
    type: "deadline",
    label: "Launch by Sep 30",
    description: "Every critical task in launch scope must finish on or before the launch date.",
    value: LAUNCH_DATE,
    severity: "hard",
    locked: true,
    source: "system",
  },
  {
    id: "security-scope",
    type: "scope",
    label: "Security review cannot be removed",
    description: "The security review stays in launch scope in every scenario.",
    value: "security-review",
    severity: "hard",
    locked: true,
    source: "system",
    entityId: "security-review",
  },
  {
    id: "max-overload",
    type: "workload",
    label: "Maximum overload 15%",
    description: "No one may be planned above 115 % of their capacity.",
    value: 15,
    severity: "hard",
    locked: false,
    source: "system",
  },
  {
    id: "budget-baseline",
    type: "budget",
    label: "Recovery spend under $15k",
    description: `Base budget $420k. Recovery spend above ${RECOVERY_BUDGET_SOFT_CAP} needs a conversation.`,
    value: RECOVERY_BUDGET_SOFT_CAP,
    severity: "soft",
    locked: false,
    source: "system",
  },
];

export function createBaseState(): BaseState {
  return {
    workspace: { ...baselineWorkspace },
    people: baselinePeople.map((p) => ({ ...p, skills: [...p.skills] })),
    tasks: baselineTasks.map((t) => ({ ...t, dependencies: [...t.dependencies] })),
    milestones: baselineMilestones.map((m) => ({ ...m })),
    constraints: baselineConstraints.map((c) => ({ ...c })),
  };
}
