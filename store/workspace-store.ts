"use client";

import { useMemo } from "react";
import { create } from "zustand";
import {
  createBaseState,
} from "@/demo/baseline";
import { nextId } from "@/domain/rules";
import type {
  Actor,
  ActivityEvent,
  BaseState,
  CapabilityState,
  Conflict,
  Constraint,
  ConstraintSeverity,
  ConstraintType,
  Milestone,
  Person,
  ProposalOperation,
  Scenario,
  Task,
  Workspace,
  WorkspacePhase,
} from "@/domain/types";
import { simulate } from "@/engines/simulation-engine";
import {
  applyOperations,
  createProposalScenario,
  isSimulationFresh,
  validateOperations,
  type OperationRejection,
} from "@/engines/proposal-engine";
import { derivePlan } from "@/engines/derive";
import { capabilityMap, unavailableReason } from "@/webmcp/capability-map";
import { ALL_TOOLS } from "@/domain/constants";
import { clearPersisted, loadPersisted, savePersisted } from "./persistence";

/* ------------------------------------------------------------------ types */

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export interface WorkspaceState {
  workspace: Workspace;
  people: Person[];
  tasks: Task[];
  milestones: Milestone[];
  constraints: Constraint[];

  scenarios: Scenario[];
  /** The one proposal that is currently editable. Null in current/committed. */
  activeProposalId: string | null;
  /** Which scenario tab the human is looking at. Purely presentational. */
  viewedScenarioId: string;

  phase: WorkspacePhase;
  stateVersion: number;
  planVersion: number;
  activity: ActivityEvent[];

  comparisonOpen: boolean;
  comparisonScenarioIds: string[];
  agentActivity: { busy: boolean; message: string | null };
  toast: Toast | null;
  hydrated: boolean;

  /* ---- reads ---- */
  getBaseState: () => BaseState;
  getScenario: (id: string) => Scenario | undefined;
  getActiveProposal: () => Scenario | undefined;
  getCapabilityState: () => CapabilityState;

  /* ---- human + agent actions (one path for both) ---- */
  setPersonStatus: (personId: string, status: Person["status"], actor: Actor) => boolean;
  lockEntity: (
    input: { entityType: "task" | "milestone" | "constraint"; entityId: string; reason?: string },
    actor: Actor,
  ) => { ok: boolean; message: string };
  unlockEntity: (entityId: string, actor: Actor) => boolean;
  addConstraint: (
    input: { type: ConstraintType; label: string; value: string | number; severity: ConstraintSeverity },
    actor: Actor,
  ) => Constraint;
  createProposal: (input: { title: string; objective?: string }, actor: Actor) => Scenario | undefined;
  modifyProposal: (
    proposalId: string,
    operations: ProposalOperation[],
    actor: Actor,
  ) => { scenario?: Scenario; accepted: number; rejected: { operation: ProposalOperation; rejection: OperationRejection }[] };
  simulateProposal: (proposalId: string, actor: Actor) => Scenario | undefined;
  approveProposal: (proposalId: string) => Scenario | undefined;
  rejectApproval: (proposalId: string) => void;
  commitProposal: (proposalId: string, actor: Actor) => Scenario | undefined;
  discardProposal: (proposalId: string, actor: Actor) => Scenario | undefined;

  /* ---- presentation ---- */
  setViewedScenario: (id: string) => void;
  openComparison: (ids?: string[]) => void;
  closeComparison: () => void;
  setAgentActivity: (busy: boolean, message?: string | null) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: () => void;
  logActivity: (actor: Actor, message: string, detail?: string) => void;

  /* ---- demo ---- */
  resetDemo: () => void;
  hydrate: () => void;
}

/* -------------------------------------------------------------- utilities */

const CURRENT_ID = "current";

function baseFrom(state: Pick<WorkspaceState, "workspace" | "people" | "tasks" | "milestones" | "constraints">): BaseState {
  return {
    workspace: state.workspace,
    people: state.people,
    tasks: state.tasks,
    milestones: state.milestones,
    constraints: state.constraints,
  };
}

function currentScenario(): Scenario {
  return {
    id: CURRENT_ID,
    name: "Current plan",
    kind: "current",
    status: "current",
    operations: [],
    constraintResults: [],
    conflicts: [],
    createdBy: "system",
    createdAt: new Date().toISOString(),
  };
}

function initialSlice() {
  const base = createBaseState();
  return {
    ...base,
    scenarios: [currentScenario()],
    activeProposalId: null as string | null,
    viewedScenarioId: CURRENT_ID,
    phase: "current" as WorkspacePhase,
    stateVersion: 1,
    planVersion: 1,
    activity: [] as ActivityEvent[],
    comparisonOpen: false,
    comparisonScenarioIds: [] as string[],
    agentActivity: { busy: false, message: null as string | null },
    toast: null as Toast | null,
  };
}

function hasFailedLockConflict(conflicts: Conflict[]): boolean {
  return conflicts.some((c) => c.type === "lock" && c.severity === "failed");
}

/**
 * Every scenario is re-scored against the canonical state after each mutation.
 * A proposal built before a human lock is never rewritten — it is marked
 * `conflicted`, kept for comparison, and loses its editable status.
 */
function rescore(
  base: BaseState,
  scenario: Scenario,
  planVersion: number,
  freshlySimulatedId?: string,
): Scenario {
  if (scenario.status === "discarded") return scenario;

  const outcome = simulate(base, scenario.operations);

  if (scenario.kind === "current") {
    return {
      ...scenario,
      status: "current",
      metrics: outcome.metrics,
      constraintResults: outcome.constraintResults,
      conflicts: outcome.conflicts,
      lastSimulatedAtPlanVersion: planVersion,
    };
  }

  if (scenario.status === "committed") {
    return { ...scenario, constraintResults: outcome.constraintResults, conflicts: outcome.conflicts };
  }

  const base_ = {
    ...scenario,
    constraintResults: outcome.constraintResults,
    conflicts: outcome.conflicts,
  };

  if (freshlySimulatedId === scenario.id) {
    return {
      ...base_,
      status: "simulated",
      metrics: outcome.metrics,
      lastSimulatedAtPlanVersion: planVersion,
    };
  }

  if (hasFailedLockConflict(outcome.conflicts)) {
    return { ...base_, status: "conflicted" };
  }

  if (scenario.status === "conflicted") {
    // The lock that caused the conflict was released.
    return {
      ...base_,
      status: isSimulationFresh(scenario, planVersion) ? "simulated" : "draft",
    };
  }

  if (scenario.status === "approved") {
    return isSimulationFresh(scenario, planVersion)
      ? base_
      : { ...base_, status: "draft", approvedAt: undefined, approvedBy: undefined };
  }

  return {
    ...base_,
    status: isSimulationFresh(scenario, planVersion) ? "simulated" : "draft",
  };
}

function derivePhase(scenarios: Scenario[], activeProposalId: string | null): WorkspacePhase {
  const active = scenarios.find((s) => s.id === activeProposalId);
  if (active) {
    if (active.status === "approved") return "approved";
    if (active.status === "simulated") return "simulated";
    return "draft";
  }
  return scenarios.some((s) => s.status === "committed") ? "committed" : "current";
}

interface MutationInput {
  workspace?: Workspace;
  people?: Person[];
  tasks?: Task[];
  milestones?: Milestone[];
  constraints?: Constraint[];
  scenarios?: Scenario[];
  activeProposalId?: string | null;
  viewedScenarioId?: string;
  /** True when the plan itself changed, which invalidates open simulations. */
  touchesPlan?: boolean;
  freshlySimulatedId?: string;
  event?: { actor: Actor; message: string; detail?: string };
  extra?: Partial<WorkspaceState>;
}

/* ----------------------------------------------------------------- store */

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  function mutate(input: MutationInput) {
    set((state) => {
      const stateVersion = state.stateVersion + 1;
      const planVersion = input.touchesPlan ? state.planVersion + 1 : state.planVersion;

      const nextBaseSlice = {
        workspace: input.workspace ?? state.workspace,
        people: input.people ?? state.people,
        tasks: input.tasks ?? state.tasks,
        milestones: input.milestones ?? state.milestones,
        constraints: input.constraints ?? state.constraints,
      };
      const base = baseFrom(nextBaseSlice);

      const scenarios = (input.scenarios ?? state.scenarios).map((scenario) =>
        rescore(base, scenario, planVersion, input.freshlySimulatedId),
      );

      let activeProposalId =
        input.activeProposalId !== undefined ? input.activeProposalId : state.activeProposalId;

      const active = scenarios.find((s) => s.id === activeProposalId);
      if (active && (active.status === "conflicted" || active.status === "discarded" || active.status === "committed")) {
        activeProposalId = null;
      }

      const activity = input.event
        ? [
            ...state.activity,
            {
              id: nextId("event"),
              at: new Date().toISOString(),
              actor: input.event.actor,
              message: input.event.message,
              detail: input.event.detail,
              stateVersion,
            } satisfies ActivityEvent,
          ]
        : state.activity;

      const next: WorkspaceState = {
        ...state,
        ...nextBaseSlice,
        ...(input.extra ?? {}),
        scenarios,
        activeProposalId,
        viewedScenarioId: input.viewedScenarioId ?? state.viewedScenarioId,
        phase: derivePhase(scenarios, activeProposalId),
        stateVersion,
        planVersion,
        activity,
      };

      savePersisted({
        workspace: next.workspace,
        people: next.people,
        tasks: next.tasks,
        constraints: next.constraints,
        scenarios: next.scenarios,
        activeProposalId: next.activeProposalId,
        viewedScenarioId: next.viewedScenarioId,
        stateVersion: next.stateVersion,
        planVersion: next.planVersion,
        activity: next.activity,
      });

      return next;
    });
  }

  return {
    ...initialSlice(),
    hydrated: false,

    /* ------------------------------------------------------------- reads */

    getBaseState: () => baseFrom(get()),
    getScenario: (id) => get().scenarios.find((s) => s.id === id),
    getActiveProposal: () => {
      const { scenarios, activeProposalId } = get();
      return scenarios.find((s) => s.id === activeProposalId);
    },
    getCapabilityState: () => {
      const phase = get().phase;
      const availableTools = capabilityMap[phase];
      return {
        phase,
        availableTools,
        unavailableTools: ALL_TOOLS.filter((tool) => !availableTools.includes(tool)).map((tool) => ({
          tool,
          reason: unavailableReason(tool, phase),
        })),
      };
    },

    /* ----------------------------------------------------------- actions */

    setPersonStatus: (personId, status, actor) => {
      const state = get();
      const person = state.people.find((p) => p.id === personId);
      if (!person || person.status === status) return false;

      const people = state.people.map((p) => (p.id === personId ? { ...p, status } : p));
      mutate({
        people,
        touchesPlan: true,
        event: {
          actor,
          message:
            status === "unavailable"
              ? `${actor === "human" ? "Human" : "Agent"} marked ${person.name} unavailable`
              : `${person.name} is available again`,
        },
      });
      return true;
    },

    lockEntity: ({ entityType, entityId, reason }, actor) => {
      const state = get();

      if (entityType === "task") {
        const task = state.tasks.find((t) => t.id === entityId);
        if (!task) return { ok: false, message: `No task called "${entityId}".` };
        if (task.locked) return { ok: true, message: `${task.name} is already locked.` };

        const tasks = state.tasks.map((t) => (t.id === entityId ? { ...t, locked: true } : t));
        const constraint: Constraint = {
          id: `lock-${entityId}`,
          type: "scope",
          label: `${task.name} remains in scope`,
          description: reason,
          value: entityId,
          severity: "hard",
          locked: true,
          source: actor === "agent" ? "agent" : "human",
          entityId,
        };
        mutate({
          tasks,
          constraints: [...state.constraints, constraint],
          touchesPlan: true,
          event: {
            actor,
            message: `${actor === "human" ? "Human" : "Agent"} locked ${task.name}`,
            detail: reason,
          },
          extra: {
            toast: {
              id: nextId("toast"),
              title: `${task.name} locked`,
              body: "Future proposals must keep it in scope.",
              tone: "neutral",
            },
          },
        });
        return { ok: true, message: `${task.name} is locked.` };
      }

      if (entityType === "milestone") {
        const milestone = state.milestones.find((m) => m.id === entityId);
        if (!milestone) return { ok: false, message: `No milestone called "${entityId}".` };
        mutate({
          milestones: state.milestones.map((m) => (m.id === entityId ? { ...m, locked: true } : m)),
          touchesPlan: true,
          event: { actor, message: `Locked ${milestone.name}` },
        });
        return { ok: true, message: `${milestone.name} is locked.` };
      }

      const constraint = state.constraints.find((c) => c.id === entityId);
      if (!constraint) return { ok: false, message: `No constraint called "${entityId}".` };
      mutate({
        constraints: state.constraints.map((c) => (c.id === entityId ? { ...c, locked: true } : c)),
        touchesPlan: true,
        event: { actor, message: `Locked constraint ${constraint.label}` },
      });
      return { ok: true, message: `${constraint.label} is locked.` };
    },

    unlockEntity: (entityId, actor) => {
      const state = get();
      const task = state.tasks.find((t) => t.id === entityId);
      if (!task || !task.locked) return false;
      mutate({
        tasks: state.tasks.map((t) => (t.id === entityId ? { ...t, locked: false } : t)),
        constraints: state.constraints.filter((c) => c.id !== `lock-${entityId}`),
        touchesPlan: true,
        event: { actor, message: `${actor === "human" ? "Human" : "Agent"} unlocked ${task.name}` },
      });
      return true;
    },

    addConstraint: ({ type, label, value, severity }, actor) => {
      const state = get();
      const constraint: Constraint = {
        id: nextId("constraint"),
        type,
        label,
        value,
        severity,
        locked: false,
        source: actor === "human" ? "human" : "agent",
      };
      mutate({
        constraints: [...state.constraints, constraint],
        touchesPlan: true,
        event: { actor, message: `${actor === "human" ? "Human" : "Agent"} added constraint: ${label}` },
      });
      return constraint;
    },

    createProposal: ({ title, objective }, actor) => {
      const state = get();
      if (state.activeProposalId) return undefined;

      const proposalCount = state.scenarios.filter((s) => s.kind === "proposal").length;
      const letter = String.fromCharCode(65 + proposalCount);
      const scenario = createProposalScenario(baseFrom(state), {
        id: `proposal-${letter.toLowerCase()}`,
        title: title || `Proposal ${letter}`,
        objective,
        createdBy: actor,
      });

      mutate({
        scenarios: [...state.scenarios, scenario],
        activeProposalId: scenario.id,
        viewedScenarioId: scenario.id,
        touchesPlan: true,
        event: {
          actor,
          message: `${actor === "agent" ? "Agent" : "Human"} created ${scenario.name}`,
          detail: objective,
        },
      });
      return get().getScenario(scenario.id);
    },

    modifyProposal: (proposalId, operations, actor) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === proposalId);
      if (!scenario) return { accepted: 0, rejected: [] };

      const { accepted, rejected } = validateOperations(baseFrom(state), operations);
      if (accepted.length === 0) {
        return { scenario, accepted: 0, rejected };
      }

      const updated = applyOperations(scenario, accepted);
      mutate({
        scenarios: state.scenarios.map((s) => (s.id === proposalId ? updated : s)),
        touchesPlan: true,
        event: {
          actor,
          message: `${actor === "agent" ? "Agent" : "Human"} shaped ${scenario.name}`,
          detail: `${accepted.length} operation${accepted.length > 1 ? "s" : ""}${rejected.length ? `, ${rejected.length} blocked` : ""}`,
        },
      });
      return { scenario: get().getScenario(proposalId), accepted: accepted.length, rejected };
    },

    simulateProposal: (proposalId, actor) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === proposalId);
      if (!scenario) return undefined;

      mutate({
        freshlySimulatedId: proposalId,
        event: { actor, message: `${scenario.name} simulated` },
      });
      return get().getScenario(proposalId);
    },

    /** Approval is human-only by design. There is no agent tool for it. */
    approveProposal: (proposalId) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === proposalId);
      if (!scenario || scenario.status !== "simulated") return undefined;

      const updated: Scenario = {
        ...scenario,
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: "human",
      };
      mutate({
        scenarios: state.scenarios.map((s) => (s.id === proposalId ? updated : s)),
        activeProposalId: proposalId,
        viewedScenarioId: proposalId,
        event: { actor: "human", message: `Human approved ${scenario.name}` },
        extra: {
          toast: {
            id: nextId("toast"),
            title: `${scenario.name} approved`,
            body: "The agent can now commit it.",
            tone: "success",
          },
        },
      });
      return get().getScenario(proposalId);
    },

    rejectApproval: (proposalId) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === proposalId);
      if (!scenario || scenario.status !== "approved") return;
      mutate({
        scenarios: state.scenarios.map((s) =>
          s.id === proposalId ? { ...s, status: "simulated", approvedAt: undefined, approvedBy: undefined } : s,
        ),
        event: { actor: "human", message: `Human withdrew approval of ${scenario.name}` },
      });
    },

    commitProposal: (proposalId, actor) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === proposalId);
      if (!scenario) return undefined;

      const base = baseFrom(state);
      const plan = derivePlan(base, scenario.operations);

      const workspace: Workspace = {
        ...state.workspace,
        baseBudget: state.workspace.baseBudget + plan.extraCost,
      };

      const committed: Scenario = {
        ...scenario,
        status: "committed",
        committedAt: new Date().toISOString(),
        metrics: scenario.metrics,
      };

      mutate({
        workspace,
        people: plan.people,
        tasks: plan.tasks,
        scenarios: state.scenarios.map((s) => (s.id === proposalId ? committed : s)),
        activeProposalId: null,
        viewedScenarioId: CURRENT_ID,
        touchesPlan: true,
        event: {
          actor,
          message: `${actor === "agent" ? "Agent" : "Human"} committed ${scenario.name}`,
          detail: `${scenario.operations.length} operations are now the plan`,
        },
        extra: {
          comparisonOpen: false,
          toast: {
            id: nextId("toast"),
            title: "Plan updated",
            body: `${scenario.name} is now the current plan.`,
            tone: "success",
          },
        },
      });
      return get().getScenario(proposalId);
    },

    discardProposal: (proposalId, actor) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === proposalId);
      if (!scenario || scenario.kind !== "proposal") return undefined;

      mutate({
        scenarios: state.scenarios.map((s) =>
          s.id === proposalId ? { ...s, status: "discarded" as const } : s,
        ),
        activeProposalId: state.activeProposalId === proposalId ? null : state.activeProposalId,
        viewedScenarioId: state.viewedScenarioId === proposalId ? CURRENT_ID : state.viewedScenarioId,
        touchesPlan: true,
        event: {
          actor,
          message: `${actor === "agent" ? "Agent" : "Human"} discarded ${scenario.name}`,
        },
      });
      return get().getScenario(proposalId);
    },

    /* ---------------------------------------------------- presentation */

    setViewedScenario: (id) => set({ viewedScenarioId: id }),
    openComparison: (ids) =>
      set((state) => ({
        comparisonOpen: true,
        comparisonScenarioIds:
          ids ??
          state.scenarios
            .filter((s) => s.status !== "discarded")
            .map((s) => s.id),
      })),
    closeComparison: () => set({ comparisonOpen: false }),
    setAgentActivity: (busy, message = null) => set({ agentActivity: { busy, message } }),
    pushToast: (toast) => set({ toast: { ...toast, id: nextId("toast") } }),
    dismissToast: () => set({ toast: null }),
    logActivity: (actor, message, detail) =>
      set((state) => ({
        activity: [
          ...state.activity,
          {
            id: nextId("event"),
            at: new Date().toISOString(),
            actor,
            message,
            detail,
            stateVersion: state.stateVersion,
          },
        ],
      })),

    /* ------------------------------------------------------------- demo */

    resetDemo: () => {
      clearPersisted();
      const fresh = initialSlice();
      const base = baseFrom(fresh);
      set({
        ...fresh,
        scenarios: fresh.scenarios.map((s) => rescore(base, s, fresh.planVersion)),
        hydrated: true,
      });
    },

    hydrate: () => {
      if (get().hydrated) return;
      const persisted = loadPersisted();
      if (!persisted) {
        const fresh = get();
        const base = baseFrom(fresh);
        set({
          scenarios: fresh.scenarios.map((s) => rescore(base, s, fresh.planVersion)),
          hydrated: true,
        });
        return;
      }
      const base: BaseState = {
        workspace: persisted.workspace,
        people: persisted.people,
        tasks: persisted.tasks,
        milestones: get().milestones,
        constraints: persisted.constraints,
      };
      const planVersion = persisted.planVersion ?? persisted.stateVersion;
      const scenarios = persisted.scenarios.map((s) => rescore(base, s, planVersion));
      set({
        ...base,
        scenarios,
        activeProposalId: persisted.activeProposalId,
        viewedScenarioId: persisted.viewedScenarioId,
        stateVersion: persisted.stateVersion,
        planVersion,
        activity: persisted.activity,
        phase: derivePhase(scenarios, persisted.activeProposalId),
        hydrated: true,
      });
    },
  };
});

/**
 * `getBaseState()` builds a fresh object on every call, which is correct for
 * engines and tools but poison for a React selector — Zustand would see a new
 * reference on every read. Components use this instead.
 */
export function useBaseState(): BaseState {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const people = useWorkspaceStore((s) => s.people);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const milestones = useWorkspaceStore((s) => s.milestones);
  const constraints = useWorkspaceStore((s) => s.constraints);

  return useMemo(
    () => ({ workspace, people, tasks, milestones, constraints }),
    [workspace, people, tasks, milestones, constraints],
  );
}
