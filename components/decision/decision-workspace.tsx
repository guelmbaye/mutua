"use client";

import { useMemo } from "react";
import { useBaseState, useWorkspaceStore } from "@/store/workspace-store";
import { selectDiff, selectSimulationFreshness } from "@/domain/selectors";
import { AgentPrompt } from "@/components/agent/agent-prompt";
import { PhaseHeader } from "./phase-header";
import { ScenarioTabs } from "./scenario-tabs";
import { ProposalSummary } from "./proposal-summary";
import { ProposalDiff } from "./proposal-diff";
import { SimulationResult } from "./simulation-result";
import { ApprovalActions } from "./approval-actions";
import { ComparisonView } from "./comparison-view";
import { Section } from "@/components/ui/primitives";

export function DecisionWorkspace() {
  const phase = useWorkspaceStore((s) => s.phase);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const planVersion = useWorkspaceStore((s) => s.planVersion);
  const viewedScenarioId = useWorkspaceStore((s) => s.viewedScenarioId);
  const scenarios = useWorkspaceStore((s) => s.scenarios);
  const comparisonOpen = useWorkspaceStore((s) => s.comparisonOpen);
  const base = useBaseState();

  const scenario = scenarios.find((s) => s.id === viewedScenarioId) ?? scenarios[0];
  const diff = useMemo(() => (scenario ? selectDiff(base, scenario) : []), [base, scenario]);
  const freshness = scenario ? selectSimulationFreshness(scenario, planVersion) : { fresh: false, hasRun: false };

  return (
    <div className="flex h-full min-w-0 flex-col bg-soft">
      <div className="flex-1 overflow-y-auto scroll-quiet px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <PhaseHeader phase={phase} scenario={scenario?.kind === "proposal" ? scenario : undefined} />

          <ScenarioTabs />

          {comparisonOpen ? (
            <ComparisonView />
          ) : scenario?.kind === "current" ? (
            <CurrentPlanBody />
          ) : scenario ? (
            <div className="space-y-5">
              {scenario.metrics && <ProposalSummary metrics={scenario.metrics} workspace={workspace} />}

              <Section title="Proposed changes">
                <ProposalDiff lines={diff} />
              </Section>

              {freshness.hasRun && (
                <Section title="Expected outcome">
                  <SimulationResult
                    constraintResults={scenario.constraintResults}
                    conflicts={scenario.conflicts}
                    fresh={freshness.fresh}
                  />
                </Section>
              )}

              <ApprovalActions scenario={scenario} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-line bg-white px-6 py-3">
        <div className="mx-auto max-w-3xl">
          <AgentPrompt />
        </div>
      </div>
    </div>
  );
}

function CurrentPlanBody() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const current = useWorkspaceStore((s) => s.scenarios.find((sc) => sc.id === "current"));
  const committed = useWorkspaceStore((s) =>
    s.scenarios.filter((sc) => sc.status === "committed").slice(-1)[0],
  );

  if (!current?.metrics) return null;

  const healthy =
    current.metrics.deadlineMet && current.metrics.overloadPercent <= workspace.maxOverloadPercent;

  return (
    <div className="space-y-5">
      <ProposalSummary metrics={current.metrics} workspace={workspace} />

      {committed && healthy ? (
        <div className="rounded border border-success/30 bg-success-soft px-4 py-3">
          <h3 className="text-sm font-medium text-graphite">Plan updated</h3>
          <ul className="mt-1 space-y-0.5 text-meta text-graphite-600">
            <li>September launch preserved</li>
            <li>Peak overload {current.metrics.overloadPercent}%</li>
            <li>
              {committed.name} committed with {committed.operations.length} operations, all visible in the
              timeline
            </li>
          </ul>
        </div>
      ) : healthy ? (
        <p className="text-sm text-slate">
          The plan holds. Change something on the left — mark someone unavailable, lock a commitment — and the
          agent sees the same reality you do.
        </p>
      ) : (
        <div className="rounded border border-slate-line bg-white px-4 py-3">
          <h3 className="text-sm font-medium text-graphite">Recovery needed</h3>
          <ul className="mt-1 space-y-0.5 text-meta text-graphite-600">
            {current.constraintResults
              .filter((r) => r.status !== "passed")
              .map((r) => (
                <li key={r.constraintId}>{r.message}</li>
              ))}
          </ul>
          <p className="mt-2 text-sm text-slate">Ask the agent what to preserve.</p>
        </div>
      )}
    </div>
  );
}
