"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Circle } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useRegisteredTools } from "@/webmcp/lifecycle";
import { unavailableReason } from "@/webmcp/capability-map";
import { ALL_TOOLS, TOOL_LABELS } from "@/domain/constants";
import { cn } from "@/lib/utils";

/**
 * The signature element.
 *
 * Dynamic tool registration is invisible by nature, so MUTUA renders the real
 * registry — not the capability map, the registry itself. What you read here is
 * exactly what an agent can call right now.
 */
export function CapabilityInspector() {
  const phase = useWorkspaceStore((s) => s.phase);
  const registered = useRegisteredTools();
  const previous = useRef<string[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);

  useEffect(() => {
    const added = registered.filter((tool) => !previous.current.includes(tool));
    previous.current = registered;
    if (added.length === 0) return;
    setRecentlyAdded(added);
    const timer = setTimeout(() => setRecentlyAdded([]), 1200);
    return () => clearTimeout(timer);
  }, [registered]);

  const locked = ALL_TOOLS.filter((tool) => !registered.includes(tool));

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto scroll-quiet border-l border-slate-line bg-white px-5 py-5">
      <div>
        <h2 className="text-eyebrow font-semibold uppercase text-slate">Agent capabilities</h2>
        <p className="mt-1 text-meta text-slate">
          Registered through WebMCP for the <span className="font-medium text-graphite-600">{phase}</span>{" "}
          phase. This list is the live registry.
        </p>
      </div>

      <section>
        <h3 className="mb-1.5 text-eyebrow font-semibold uppercase text-slate">Available now</h3>
        <ul className="space-y-0.5">
          {registered.map((tool) => (
            <li
              key={tool}
              className={cn(
                "flex items-start gap-2 rounded px-1.5 py-1",
                recentlyAdded.includes(tool) && "animate-capability-in",
              )}
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              <div className="min-w-0">
                <div className="text-sm text-graphite">{TOOL_LABELS[tool] ?? tool}</div>
                <code className="text-meta text-slate">{tool}</code>
              </div>
            </li>
          ))}
          {registered.length === 0 && (
            <li className="px-1.5 py-1 text-meta text-slate">Registry syncing…</li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="mb-1.5 text-eyebrow font-semibold uppercase text-slate">Context locked</h3>
        <ul className="space-y-0.5">
          {locked.map((tool) => (
            <li key={tool} className="flex items-start gap-2 px-1.5 py-1">
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate/50" aria-hidden />
              <div className="min-w-0">
                <div className="text-sm text-slate">{TOOL_LABELS[tool] ?? tool}</div>
                <div className="text-meta text-slate/80">{unavailableReason(tool, phase)}</div>
              </div>
            </li>
          ))}
          {locked.length === 0 && (
            <li className="px-1.5 py-1 text-meta text-slate">Every capability is on the table.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
