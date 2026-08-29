"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { useBaseState, useWorkspaceStore } from "@/store/workspace-store";
import { selectComparison } from "@/domain/selectors";
import { formatShortDate, formatSignedCurrency } from "@/domain/rules";
import { cn } from "@/lib/utils";

export function ComparisonView() {
  const scenarios = useWorkspaceStore((s) => s.scenarios);
  const ids = useWorkspaceStore((s) => s.comparisonScenarioIds);
  const base = useBaseState();
  const closeComparison = useWorkspaceStore((s) => s.closeComparison);
  const approveProposal = useWorkspaceStore((s) => s.approveProposal);
  const setViewedScenario = useWorkspaceStore((s) => s.setViewedScenario);

  const selected = useMemo(
    () => ids.map((id) => scenarios.find((s) => s.id === id)).filter(Boolean),
    [ids, scenarios],
  );
  const comparison = useMemo(
    () => selectComparison(base, selected as NonNullable<(typeof selected)[number]>[]),
    [base, selected],
  );

  const rows = comparison.rows;
  const recommended = comparison.recommendedScenarioId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-graphite">Side by side</h3>
        <Button variant="ghost" size="sm" onClick={closeComparison}>
          Close comparison
        </Button>
      </div>

      <div className="overflow-x-auto rounded border border-slate-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-line">
              <th scope="col" className="w-40 px-3 py-2 text-left text-eyebrow font-semibold uppercase text-slate">
                Metric
              </th>
              {rows.map((row) => (
                <th
                  key={row.scenarioId}
                  scope="col"
                  className={cn(
                    "px-3 py-2 text-left",
                    row.scenarioId === recommended && "bg-accent-soft",
                  )}
                >
                  <span className="block font-semibold text-graphite">{row.name}</span>
                  {row.scenarioId === recommended && <Badge tone="accent">Best on the numbers</Badge>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-line/70">
            <Row
              label="Launch"
              rows={rows}
              recommended={recommended}
              render={(row) =>
                row.metrics.deadlineMet ? (
                  <span className="tabular text-success">{formatShortDate(row.metrics.deadline)}</span>
                ) : (
                  <span className="tabular text-danger">
                    At risk · {formatShortDate(row.metrics.projectedLaunchDate)}
                  </span>
                )
              }
            />
            <Row
              label="Extra cost"
              rows={rows}
              recommended={recommended}
              render={(row) => <span className="tabular">{formatSignedCurrency(row.metrics.extraCost)}</span>}
            />
            <Row
              label="Peak overload"
              rows={rows}
              recommended={recommended}
              render={(row) => <span className="tabular">{row.metrics.overloadPercent}%</span>}
            />
            <Row
              label="Scope loss"
              rows={rows}
              recommended={recommended}
              render={(row) => (
                <span className="tabular">{row.metrics.scopeLoss === 0 ? "None" : `${row.metrics.scopeLoss} feature`}</span>
              )}
            />
            <Row
              label="Human locks"
              rows={rows}
              recommended={recommended}
              render={(row) =>
                row.locksRespected ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden /> Respected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <X className="h-3.5 w-3.5" aria-hidden /> Conflict
                  </span>
                )
              }
            />
          </tbody>
        </table>
      </div>

      {comparison.rationale && (
        <p className="text-sm text-graphite-600">
          {comparison.rationale} These numbers come from the workspace, not from the agent.
        </p>
      )}

      {recommended && (
        <div className="flex gap-2">
          <Button
            variant="accent"
            onClick={() => {
              approveProposal(recommended);
              closeComparison();
            }}
            disabled={rows.find((r) => r.scenarioId === recommended)?.status !== "simulated"}
          >
            Approve {rows.find((r) => r.scenarioId === recommended)?.name}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setViewedScenario(recommended);
              closeComparison();
            }}
          >
            Keep exploring
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  rows,
  recommended,
  render,
}: {
  label: string;
  rows: ReturnType<typeof selectComparison>["rows"];
  recommended?: string;
  render: (row: ReturnType<typeof selectComparison>["rows"][number]) => React.ReactNode;
}) {
  return (
    <tr>
      <th scope="row" className="px-3 py-2 text-left font-normal text-slate">
        {label}
      </th>
      {rows.map((row) => (
        <td
          key={row.scenarioId}
          className={cn("px-3 py-2 text-graphite", row.scenarioId === recommended && "bg-accent-soft/50")}
        >
          {render(row)}
        </td>
      ))}
    </tr>
  );
}
