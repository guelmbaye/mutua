"use client";

import { useMemo } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { selectCurrentPlan } from "@/domain/selectors";
import { MetricsGrid } from "./metrics-grid";
import { RiskAlert } from "./risk-alert";
import { TeamList } from "./team-list";
import { WorkList } from "./work-list";
import { ConstraintList } from "./constraint-list";

/**
 * The canonical reality. Everything here is the plan as it stands right now —
 * never a proposal, never a preview.
 */
export function CurrentStatePanel() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const people = useWorkspaceStore((s) => s.people);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const constraints = useWorkspaceStore((s) => s.constraints);
  const currentScenario = useWorkspaceStore((s) => s.scenarios.find((sc) => sc.id === "current"));

  const base = useMemo(
    () => ({ workspace, people, tasks, milestones: [], constraints }),
    [workspace, people, tasks, constraints],
  );
  const plan = useMemo(() => selectCurrentPlan(base), [base]);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto scroll-quiet border-r border-slate-line bg-white px-5 py-5">
      <div>
        <h1 className="text-eyebrow font-semibold uppercase text-slate">Current state</h1>
        <div className="mt-3">
          <MetricsGrid workspace={workspace} people={people} plan={plan} />
        </div>
      </div>

      <RiskAlert workspace={workspace} people={people} plan={plan} />
      <TeamList people={people} plan={plan} workspace={workspace} />
      <WorkList tasks={tasks} plan={plan} />
      <ConstraintList constraints={constraints} results={currentScenario?.constraintResults ?? []} />
    </div>
  );
}
