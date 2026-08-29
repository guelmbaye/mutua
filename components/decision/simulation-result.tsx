"use client";

import { Badge } from "@/components/ui/primitives";
import { summariseConstraints } from "@/engines/simulation-engine";
import type { Conflict, ConstraintResult } from "@/domain/types";

export function SimulationResult({
  constraintResults,
  conflicts,
  fresh,
}: {
  constraintResults: ConstraintResult[];
  conflicts: Conflict[];
  fresh: boolean;
}) {
  const summary = summariseConstraints(constraintResults);
  const lockConflicts = conflicts.filter((c) => c.type === "lock");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!fresh && <Badge tone="warning">Simulation outdated</Badge>}
        <Badge tone={summary.failed === 0 ? "success" : "danger"}>
          {summary.passed} passed
        </Badge>
        {summary.warnings > 0 && <Badge tone="warning">{summary.warnings} warnings</Badge>}
        <Badge tone={summary.hardFailures === 0 ? "neutral" : "danger"}>
          {summary.hardFailures} hard violations
        </Badge>
        {lockConflicts.length === 0 ? (
          <Badge tone="success">All human locks respected</Badge>
        ) : (
          <Badge tone="danger">Breaks a lock</Badge>
        )}
      </div>

      {constraintResults
        .filter((r) => r.status !== "passed")
        .map((result) => (
          <p key={result.constraintId} className="text-meta text-graphite-600">
            <span className="font-medium">{result.label}:</span> {result.message}
          </p>
        ))}
    </div>
  );
}
