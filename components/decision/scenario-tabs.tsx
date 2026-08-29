"use client";

import { useWorkspaceStore } from "@/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Scenario } from "@/domain/types";

const STATUS_LABEL: Record<Scenario["status"], string> = {
  current: "Baseline",
  draft: "Draft",
  simulated: "Simulated",
  approved: "Approved",
  committed: "Committed",
  conflicted: "Conflict",
  discarded: "Discarded",
};

export function ScenarioTabs() {
  const allScenarios = useWorkspaceStore((s) => s.scenarios);
  const scenarios = allScenarios.filter((sc) => sc.status !== "discarded");
  const viewedScenarioId = useWorkspaceStore((s) => s.viewedScenarioId);
  const setViewedScenario = useWorkspaceStore((s) => s.setViewedScenario);
  const closeComparison = useWorkspaceStore((s) => s.closeComparison);

  if (scenarios.length <= 1) return null;

  return (
    <div role="tablist" aria-label="Scenarios" className="flex items-center gap-1 border-b border-slate-line">
      {scenarios.map((scenario) => {
        const active = scenario.id === viewedScenarioId;
        return (
          <button
            key={scenario.id}
            role="tab"
            aria-selected={active}
            onClick={() => {
              setViewedScenario(scenario.id);
              closeComparison();
            }}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? scenario.kind === "current"
                  ? "border-graphite text-graphite"
                  : "border-accent text-accent"
                : "border-transparent text-slate hover:text-graphite",
            )}
          >
            {scenario.name}
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.08em]",
                scenario.status === "conflicted" ? "text-danger" : "text-slate",
              )}
            >
              {STATUS_LABEL[scenario.status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
