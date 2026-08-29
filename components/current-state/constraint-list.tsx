"use client";

import { Check, Lock, TriangleAlert, X } from "lucide-react";
import { Section } from "@/components/ui/primitives";
import type { ConstraintResult, Constraint } from "@/domain/types";
import { cn } from "@/lib/utils";

const ICON = {
  passed: Check,
  warning: TriangleAlert,
  failed: X,
};

const TONE = {
  passed: "text-success",
  warning: "text-warning",
  failed: "text-danger",
};

export function ConstraintList({
  constraints,
  results,
}: {
  constraints: Constraint[];
  results: ConstraintResult[];
}) {
  return (
    <Section title="Constraints">
      <ul className="space-y-1">
        {results.map((result) => {
          const constraint = constraints.find((c) => c.id === result.constraintId);
          const Icon = ICON[result.status];
          const human = constraint?.source === "human";
          return (
            <li key={result.constraintId} className="flex items-start gap-2 text-sm">
              {human ? (
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-graphite" aria-hidden />
              ) : (
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", TONE[result.status])} aria-hidden />
              )}
              <div className="min-w-0">
                <div className={cn("truncate", result.status === "failed" ? "text-graphite" : "text-graphite-600")}>
                  {result.label}
                </div>
                {result.status !== "passed" && result.message && (
                  <div className="text-meta text-slate">{result.message}</div>
                )}
              </div>
              <span className="sr-only">{result.status}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
