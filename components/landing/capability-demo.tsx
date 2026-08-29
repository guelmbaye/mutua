"use client";

import { useState } from "react";
import { Check, Circle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The thesis, in one control.
 *
 * A miniature of the real Capability Inspector. Approving does not simulate an
 * animation — it moves a capability across the same boundary the product does,
 * for the same reason.
 */

const SIMULATED = [
  "get_workspace_state",
  "get_active_scenario",
  "inspect_constraint",
  "list_conflicts",
  "modify_proposal",
  "compare_scenarios",
  "discard_proposal",
];

const APPROVED = ["get_workspace_state", "compare_scenarios", "discard_proposal", "commit_proposal"];

export function CapabilityDemo() {
  const [approved, setApproved] = useState(false);
  const available = approved ? APPROVED : SIMULATED;
  const locked = approved ? [] : ["commit_proposal"];

  return (
    <div className="rounded border border-slate-line bg-white">
      <div className="flex items-center justify-between border-b border-slate-line px-4 py-2.5">
        <span className="font-mono text-eyebrow uppercase tracking-[0.09em] text-slate">
          Agent capabilities
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
            approved ? "bg-success-soft text-success" : "bg-slate-faint text-slate",
          )}
        >
          phase: {approved ? "approved" : "simulated"}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <section>
          <h3 className="mb-1.5 font-mono text-eyebrow uppercase tracking-[0.09em] text-slate">
            Available now
          </h3>
          <ul className="space-y-0.5">
            {available.map((tool) => (
              <li
                key={tool}
                className={cn(
                  "flex items-center gap-2 rounded px-1 py-1 font-mono text-xs text-graphite",
                  approved && tool === "commit_proposal" && "animate-capability-in font-semibold",
                )}
              >
                <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                {tool}
              </li>
            ))}
          </ul>
        </section>

        <section aria-live="polite">
          <h3 className="mb-1.5 font-mono text-eyebrow uppercase tracking-[0.09em] text-slate">
            Context locked
          </h3>
          {locked.length === 0 ? (
            <p className="px-1 text-meta text-slate">Every capability is on the table.</p>
          ) : (
            <ul className="space-y-0.5">
              {locked.map((tool) => (
                <li key={tool} className="flex items-start gap-2 px-1 py-1">
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate/50" aria-hidden />
                  <span>
                    <span className="block font-mono text-xs text-slate">{tool}</span>
                    <span className="text-meta text-slate/80">Requires your explicit approval</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-line bg-soft px-4 py-3">
        <p className="text-meta text-slate">
          {approved
            ? "Your approval changed the state. The registry changed with it."
            : "The agent cannot commit. Not hidden in the UI — not registered."}
        </p>
        {approved ? (
          <button
            type="button"
            onClick={() => setApproved(false)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-slate-line bg-white px-2.5 py-1.5 text-xs text-graphite-600 transition-colors hover:border-graphite-600 hover:text-graphite"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Withdraw
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setApproved(true)}
            className="shrink-0 rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
          >
            Approve Proposal B
          </button>
        )}
      </div>
    </div>
  );
}
