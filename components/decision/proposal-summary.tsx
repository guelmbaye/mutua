"use client";

import { Metric } from "@/components/ui/primitives";
import { formatShortDate, formatSignedCurrency } from "@/domain/rules";
import type { ScenarioMetrics, Workspace } from "@/domain/types";

export function ProposalSummary({
  metrics,
  workspace,
}: {
  metrics: ScenarioMetrics;
  workspace: Workspace;
}) {
  return (
    <div className="grid grid-cols-4 gap-4 rounded border border-slate-line bg-white px-4 py-3">
      <Metric
        label="Launch"
        value={
          <span className="tabular">
            {metrics.deadlineMet ? formatShortDate(metrics.deadline) : formatShortDate(metrics.projectedLaunchDate)}
          </span>
        }
        hint={metrics.deadlineMet ? "On time" : `${metrics.slipDays} days late`}
        tone={metrics.deadlineMet ? "success" : "danger"}
      />
      <Metric
        label="Extra cost"
        value={<span className="tabular">{formatSignedCurrency(metrics.extraCost)}</span>}
        hint="Recovery spend"
      />
      <Metric
        label="Peak overload"
        value={<span className="tabular">{metrics.overloadPercent}%</span>}
        hint={`Limit ${workspace.maxOverloadPercent}%`}
        tone={metrics.overloadPercent > workspace.maxOverloadPercent ? "danger" : "success"}
      />
      <Metric
        label="Scope"
        value={<span className="tabular">{metrics.scopeLoss === 0 ? "Unchanged" : `−${metrics.scopeLoss}`}</span>}
        hint={metrics.scopeLoss === 0 ? "Full launch scope" : "Feature deferred"}
        tone={metrics.scopeLoss === 0 ? "success" : "warning"}
      />
    </div>
  );
}
