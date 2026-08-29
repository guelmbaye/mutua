import { useWorkspaceStore } from "@/store/workspace-store";
import { simulate } from "@/engines/simulation-engine";
import { EmptyInput } from "../schemas";
import { okResult } from "../envelope";
import type { ToolDefinition } from "../types";

export const getWorkspaceState: ToolDefinition = {
  name: "get_workspace_state",
  title: "Inspect workspace",
  description:
    "Read the canonical launch plan: team availability and load, work in launch scope, active constraints, human locks, and the current workflow phase. Call this first, and again after any human action.",
  inputSchema: EmptyInput,
  jsonSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnly: true, destructive: false },
  handler: () => {
    const state = useWorkspaceStore.getState();
    const base = state.getBaseState();
    const { plan, metrics, constraintResults } = simulate(base, []);

    return okResult({
      workspace: {
        name: state.workspace.name,
        deadline: state.workspace.launchDate,
        budget: state.workspace.baseBudget,
        maxOverloadPercent: state.workspace.maxOverloadPercent,
        contractorDailyRate: state.workspace.contractorDailyRate,
      },
      team: plan.loads.map((load) => ({
        id: load.personId,
        name: load.name,
        role: load.role,
        status: load.status,
        loadPercent: load.loadPercent,
        contractor: load.contractor,
      })),
      unavailable: state.people
        .filter((p) => p.status === "unavailable")
        .map((p) => ({ id: p.id, name: p.name, role: p.role })),
      work: state.tasks
        .filter((t) => !t.parentTaskId)
        .map((task) => ({
          id: task.id,
          name: task.name,
          ownerId: plan.effectiveOwner[task.id] ?? null,
          declaredOwnerId: task.ownerId ?? null,
          effort: task.effort,
          discipline: task.discipline,
          criticality: task.criticality,
          launchCommitment: task.launchCommitment,
          inLaunchScope: task.inLaunchScope,
          deferred: task.deferred,
          locked: task.locked,
        })),
      constraints: constraintResults.map((result) => ({
        id: result.constraintId,
        label: result.label,
        severity: result.severity,
        status: result.status,
        actualValue: result.actualValue,
      })),
      locks: state.tasks
        .filter((t) => t.locked)
        .map((t) => ({
          entityType: "task" as const,
          entityId: t.id,
          name: t.name,
          reason: state.constraints.find((c) => c.id === `lock-${t.id}`)?.description,
        })),
      metrics,
      activeProposalId: state.activeProposalId,
      phase: state.phase,
      stateVersion: state.stateVersion,
    });
  },
};
