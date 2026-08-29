"use client";

import { Badge } from "@/components/ui/primitives";
import type { Scenario, WorkspacePhase } from "@/domain/types";

const COPY: Record<WorkspacePhase, { title: string; body: string }> = {
  current: {
    title: "Decision workspace",
    body: "Change anything on the left, then ask the agent for a plan. It proposes; you decide.",
  },
  draft: {
    title: "Draft proposal",
    body: "Operations are staged. Nothing is real until it is simulated, approved and committed.",
  },
  simulated: {
    title: "Simulated",
    body: "The workspace computed the consequences. Review the trade-offs before approving.",
  },
  approved: {
    title: "Approved by you",
    body: "Your approval just changed what the agent is allowed to do.",
  },
  committed: {
    title: "Plan updated",
    body: "The approved proposal is now the canonical plan.",
  },
};

export function PhaseHeader({ phase, scenario }: { phase: WorkspacePhase; scenario?: Scenario }) {
  const copy = COPY[phase];
  const conflicted = scenario?.status === "conflicted";

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-semibold tracking-tight text-graphite">
            {scenario && scenario.kind === "proposal" ? scenario.name : copy.title}
          </h2>
          {conflicted && <Badge tone="danger">Conflict</Badge>}
        </div>
        <p className="mt-0.5 max-w-xl text-sm text-slate">
          {conflicted
            ? "This proposal changes something you locked. It is kept for comparison, but it can no longer be edited or approved."
            : (scenario?.objective ?? copy.body)}
        </p>
      </div>
    </div>
  );
}
