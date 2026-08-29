"use client";

import Image from "next/image";
import { useWorkspaceStore } from "@/store/workspace-store";
import { isWebMcpHostAvailable } from "@/webmcp/registry";
import { resetEverything } from "@/demo/reset";
import { Badge, Button } from "@/components/ui/primitives";
import { useEffect, useState } from "react";

const PHASE_LABEL: Record<string, string> = {
  current: "Current",
  draft: "Draft",
  simulated: "Simulated",
  approved: "Approved",
  committed: "Committed",
};

export function Header() {
  const phase = useWorkspaceStore((s) => s.phase);
  const name = useWorkspaceStore((s) => s.workspace.name);
  const [hostAvailable, setHostAvailable] = useState(false);

  useEffect(() => {
    setHostAvailable(isWebMcpHostAvailable());
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-line bg-white px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Image src="/icon.png" alt="" width={24} height={24} priority className="rounded-[5px]" />
        <span className="text-[15px] font-semibold tracking-[0.14em]">MUTUA</span>
        <span className="h-4 w-px bg-slate-line" aria-hidden />
        <span className="truncate text-sm text-graphite-600">{name}</span>
      </div>

      <div className="flex items-center gap-3">
        <Badge tone={phase === "committed" ? "success" : phase === "current" ? "neutral" : "accent"}>
          {PHASE_LABEL[phase] ?? phase}
        </Badge>
        <span className="flex items-center gap-1.5 text-meta text-slate">
          <span
            className={`h-1.5 w-1.5 rounded-full ${hostAvailable ? "bg-success" : "bg-accent"}`}
            aria-hidden
          />
          {hostAvailable ? "Agent host connected" : "Built-in agent"}
        </span>
        <Button variant="ghost" size="sm" onClick={resetEverything}>
          Reset demo
        </Button>
      </div>
    </header>
  );
}
