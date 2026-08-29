"use client";

import { useEffect, useState } from "react";
import { useToolCallLog } from "@/webmcp/lifecycle";
import { useWorkspaceStore } from "@/store/workspace-store";

/**
 * ?debug=1 — technical evidence for a judge who wants to see the wire, without
 * putting protocol noise in the product.
 */
export function DebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const log = useToolCallLog();
  const stateVersion = useWorkspaceStore((s) => s.stateVersion);
  const planVersion = useWorkspaceStore((s) => s.planVersion);
  const phase = useWorkspaceStore((s) => s.phase);

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  if (!enabled) return null;

  return (
    <aside className="fixed bottom-20 right-4 z-40 max-h-80 w-96 overflow-y-auto scroll-quiet rounded border border-graphite bg-graphite p-3 font-mono text-[11px] text-soft shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <strong className="tracking-wide">WebMCP call log</strong>
        <span className="text-soft/60">
          phase={phase} state=v{stateVersion} plan=v{planVersion}
        </span>
      </div>
      <ul className="space-y-1">
        {log
          .slice()
          .reverse()
          .map((record) => (
            <li key={record.id} className="border-b border-white/10 pb-1">
              <span className={record.result.ok ? "text-[#7fe0b0]" : "text-[#ff9b9b]"}>
                {record.result.ok ? "ok " : "err"}
              </span>{" "}
              {record.tool} · {record.durationMs}ms
              {!record.result.ok && <div className="text-soft/70">{record.result.error?.code}</div>}
            </li>
          ))}
        {log.length === 0 && <li className="text-soft/60">No tool calls yet.</li>}
      </ul>
    </aside>
  );
}
