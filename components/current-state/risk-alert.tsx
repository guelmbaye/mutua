"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DerivedPlan, Person, Workspace } from "@/domain/types";

export function RiskAlert({
  workspace,
  people,
  plan,
}: {
  workspace: Workspace;
  people: Person[];
  plan: DerivedPlan;
}) {
  const away = people.filter((p) => p.status === "unavailable");
  const atRisk = !plan.deadlineMet || plan.overloadPercent > workspace.maxOverloadPercent;

  if (!atRisk) {
    return (
      <div className="flex items-start gap-2 rounded border border-success/25 bg-success-soft px-3 py-2.5">
        <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-success" aria-hidden />
        <div>
          <div className="text-sm font-medium text-graphite">Launch on track</div>
          <p className="text-meta text-graphite-600">
            Peak load {plan.peakLoadPercent}%, under the {workspace.maxOverloadPercent}% limit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded border border-danger/25 bg-danger-soft px-3 py-2.5">
      <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-danger" aria-hidden />
      <div>
        <div className="text-sm font-medium text-graphite">Launch at risk</div>
        <p className="text-meta text-graphite-600">
          {away.length > 0 && `${away.map((p) => p.name).join(", ")} unavailable. `}
          Workload peaks at {plan.peakLoadPercent}%, above the {workspace.maxOverloadPercent}% limit.
        </p>
      </div>
    </div>
  );
}
