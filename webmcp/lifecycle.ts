"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { registry, type ToolCallRecord } from "./registry";

/**
 * Registration is a consequence of application state, nothing else.
 * Every phase change — human or agent triggered — flows through here.
 */
export function useWebMcpLifecycle(): void {
  const phase = useWorkspaceStore((s) => s.phase);
  const logActivity = useWorkspaceStore((s) => s.logActivity);

  useEffect(() => {
    const { added, removed } = registry.sync(phase);
    if (added.length === 0 && removed.length === 0) return;
    if (added.includes("commit_proposal")) {
      logActivity("system", "Capability unlocked: commit proposal", "Human approval recorded");
    }
  }, [phase, logActivity]);
}

export function useRegisteredTools(): string[] {
  return useSyncExternalStore(
    (listener) => registry.subscribe(listener),
    () => registrySnapshot(),
    () => EMPTY,
  );
}

const EMPTY: string[] = [];
let cachedKey = "";
let cachedValue: string[] = EMPTY;

function registrySnapshot(): string[] {
  const tools = registry.getRegisteredTools();
  const key = tools.join("|");
  if (key !== cachedKey) {
    cachedKey = key;
    cachedValue = tools;
  }
  return cachedValue;
}

const EMPTY_LOG: ReadonlyArray<ToolCallRecord> = [];

export function useToolCallLog(): ReadonlyArray<ToolCallRecord> {
  return useSyncExternalStore(
    (listener) => registry.subscribe(listener),
    () => registry.getLog(),
    () => EMPTY_LOG,
  );
}
