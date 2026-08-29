"use client";

import { Lock, Minus, Plus, RefreshCw } from "lucide-react";
import type { OperationDiffLine } from "@/domain/types";
import { cn } from "@/lib/utils";

const MARK = {
  add: { Icon: Plus, tone: "text-success", label: "added" },
  change: { Icon: RefreshCw, tone: "text-accent", label: "changed" },
  remove: { Icon: Minus, tone: "text-danger", label: "removed" },
};

export function ProposalDiff({ lines }: { lines: OperationDiffLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="rounded border border-dashed border-slate-line px-3 py-4 text-sm text-slate">
        No operations yet. This proposal changes nothing.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((line) => {
        const { Icon, tone, label } = MARK[line.kind];
        return (
          <li
            key={line.operationId}
            className={cn(
              "flex items-start gap-2 rounded px-2 py-1.5 text-sm",
              line.conflicting ? "bg-danger-soft" : "bg-slate-faint/60",
            )}
          >
            <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone)} aria-hidden />
            <span className="sr-only">{label}: </span>
            <div className="min-w-0">
              <div className="text-graphite">{line.label}</div>
              {line.detail && <div className="text-meta text-slate">{line.detail}</div>}
              {line.conflicting && (
                <div className="mt-0.5 flex items-center gap-1 text-meta font-medium text-danger">
                  <Lock className="h-3 w-3" aria-hidden />
                  Touches an item you locked
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
