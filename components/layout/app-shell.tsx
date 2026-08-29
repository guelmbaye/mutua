"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useWebMcpLifecycle } from "@/webmcp/lifecycle";
import { Header } from "./header";
import { ToastHost } from "./toast-host";
import { CurrentStatePanel } from "@/components/current-state/current-state-panel";
import { DecisionWorkspace } from "@/components/decision/decision-workspace";
import { CapabilityInspector } from "@/components/capabilities/capability-inspector";
import { ActivityTimeline } from "@/components/timeline/activity-timeline";
import { DebugPanel } from "@/components/capabilities/debug-panel";

export function AppShell() {
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const hydrated = useWorkspaceStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useWebMcpLifecycle();

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-slate">Loading workspace…</div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[24%_minmax(0,1fr)_24%]">
        <div className="hidden min-h-0 lg:block">
          <CurrentStatePanel />
        </div>
        <div className="min-h-0">
          <DecisionWorkspace />
        </div>
        <div className="hidden min-h-0 lg:block">
          <CapabilityInspector />
        </div>
      </main>
      <ActivityTimeline />
      <ToastHost />
      <DebugPanel />
    </div>
  );
}
