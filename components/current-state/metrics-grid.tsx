"use client";

import { Metric } from "@/components/ui/primitives";
import { formatCompactCurrency, formatShortDate } from "@/domain/rules";
import type { DerivedPlan, Person, Workspace } from "@/domain/types";

export function MetricsGrid({
  workspace,
  people,
  plan,
}: {
  workspace: Workspace;
  people: Person[];
  plan: DerivedPlan;
}) {
  const permanent = people.filter((p) => !p.contractor);
  const available = permanent.filter((p) => p.status !== "unavailable").length;
  const contractors = plan.people.filter((p) => p.contractor).length;
  const overloaded = plan.overloadPercent > workspace.maxOverloadPercent;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
      <Metric
        label="Launch"
        value={
          <span className="tabular">
            {formatShortDate(plan.deadlineMet ? workspace.launchDate : plan.projectedLaunchDate)}
          </span>
        }
        hint={plan.deadlineMet ? "On time" : `${plan.slipDays} days late`}
        tone={plan.deadlineMet ? "neutral" : "danger"}
      />
      <Metric
        label="Team"
        value={
          <span className="tabular">
            {available} / {permanent.length}
          </span>
        }
        hint={contractors > 0 ? `+ ${contractors} contractor` : "Permanent staff"}
      />
      <Metric
        label="Budget"
        value={<span className="tabular">{formatCompactCurrency(plan.totalBudget)}</span>}
        hint={plan.extraCost > 0 ? `${formatCompactCurrency(plan.extraCost)} recovery` : "Baseline"}
      />
      <Metric
        label="Overload"
        value={<span className="tabular">{plan.overloadPercent}%</span>}
        hint={`Limit ${workspace.maxOverloadPercent}%`}
        tone={overloaded ? "danger" : "success"}
      />
    </div>
  );
}
