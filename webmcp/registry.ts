"use client";

import type { WorkspacePhase } from "@/domain/types";
import { capabilityMap } from "./capability-map";
import { toolsByName, toolDefinitions } from "./tools";
import { failResult } from "./envelope";
import type { ToolResult } from "./result";

/* ------------------------------------------------- WebMCP host interface */

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  execute: (args: unknown) => Promise<{ content: { type: "text"; text: string }[] }>;
}

interface ModelContext {
  registerTool?: (tool: WebMcpTool) => (() => void) | void;
  provideContext?: (context: { tools: WebMcpTool[] }) => void;
}

function modelContext(): ModelContext | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
}

export function isWebMcpHostAvailable(): boolean {
  const ctx = modelContext();
  return !!ctx && (typeof ctx.registerTool === "function" || typeof ctx.provideContext === "function");
}

/* ------------------------------------------------------------- call log */

export interface ToolCallRecord {
  id: number;
  at: number;
  tool: string;
  input: unknown;
  result: ToolResult;
  durationMs: number;
}

type Listener = () => void;

/**
 * One registry owns registration for the whole app. React components never
 * register tools; they subscribe to this.
 */
class WebMcpRegistry {
  private registered = new Map<string, (() => void) | undefined>();
  private listeners = new Set<Listener>();
  private log: ToolCallRecord[] = [];
  private callCounter = 0;
  private phase: WorkspacePhase = "current";
  private lastChange: { added: string[]; removed: string[] } = { added: [], removed: [] };

  getRegisteredTools(): string[] {
    return [...this.registered.keys()];
  }

  getPhase(): WorkspacePhase {
    return this.phase;
  }

  getLastChange() {
    return this.lastChange;
  }

  /** Immutable: the log array is replaced, never mutated, so subscribers re-render. */
  getLog(): ReadonlyArray<ToolCallRecord> {
    return this.log;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  /** Registration follows the phase. Stale capabilities are actually removed. */
  sync(phase: WorkspacePhase): { added: string[]; removed: string[] } {
    const allowed = capabilityMap[phase] ?? [];
    const removed: string[] = [];
    const added: string[] = [];

    for (const name of [...this.registered.keys()]) {
      if (allowed.includes(name)) continue;
      const unregister = this.registered.get(name);
      try {
        unregister?.();
      } catch {
        /* the host may already have dropped it */
      }
      this.registered.delete(name);
      removed.push(name);
    }

    for (const name of allowed) {
      if (this.registered.has(name)) continue;
      this.registered.set(name, this.registerWithHost(name));
      added.push(name);
    }

    this.phase = phase;
    this.lastChange = { added, removed };

    if (added.length > 0 || removed.length > 0) {
      this.pushToHost();
      this.emit();
    }
    return this.lastChange;
  }

  private registerWithHost(name: string): (() => void) | undefined {
    const ctx = modelContext();
    const tool = toolsByName.get(name);
    if (!ctx || !tool || typeof ctx.registerTool !== "function") return undefined;

    const handle = ctx.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.jsonSchema,
      annotations: {
        title: tool.title,
        readOnlyHint: tool.annotations.readOnly,
        destructiveHint: tool.annotations.destructive,
        requiresHumanApproval: tool.annotations.requiresHumanApproval ?? false,
      },
      execute: async (args: unknown) => {
        const result = await this.call(name, args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      },
    });

    return typeof handle === "function" ? handle : undefined;
  }

  /** Hosts that take the whole tool list at once rather than one by one. */
  private pushToHost() {
    const ctx = modelContext();
    if (!ctx || typeof ctx.provideContext !== "function" || typeof ctx.registerTool === "function") {
      return;
    }
    ctx.provideContext({
      tools: this.getRegisteredTools().map((name) => {
        const tool = toolsByName.get(name)!;
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.jsonSchema,
          execute: async (args: unknown) => {
            const result = await this.call(name, args);
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          },
        };
      }),
    });
  }

  /**
   * Single entry point for every tool call — from a real agent host, from the
   * built-in agent, or from a test. Registration is checked here too, so an
   * unregistered capability is refused rather than quietly executed.
   */
  async call(name: string, rawInput: unknown = {}): Promise<ToolResult> {
    const startedAt = performance.now();
    const tool = toolsByName.get(name);

    let result: ToolResult;

    if (!tool) {
      result = failResult("TOOL_NOT_AVAILABLE", `MUTUA has no capability called "${name}".`, {
        recoverable: false,
      });
    } else if (!this.registered.has(name)) {
      result = failResult(
        "TOOL_NOT_AVAILABLE",
        `"${name}" is not available while the workspace is ${this.phase}.`,
        { suggestedNextAction: "get_workspace_state" },
      );
    } else {
      const parsed = tool.inputSchema.safeParse(rawInput ?? {});
      if (!parsed.success) {
        result = failResult(
          "INVALID_INPUT",
          parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; "),
        );
      } else {
        try {
          result = tool.handler(parsed.data);
        } catch (error) {
          result = failResult(
            "INVALID_OPERATION",
            error instanceof Error ? error.message : "The workspace could not run that.",
            { recoverable: false },
          );
        }
      }
    }

    this.callCounter += 1;
    this.log = [
      ...this.log.slice(-99),
      {
        id: this.callCounter,
        at: Date.now(),
        tool: name,
        input: rawInput,
        result,
        durationMs: Math.round(performance.now() - startedAt),
      },
    ];
    this.emit();
    return result;
  }

  reset() {
    for (const unregister of this.registered.values()) {
      try {
        unregister?.();
      } catch {
        /* ignore */
      }
    }
    this.registered.clear();
    this.log = [];
    this.callCounter = 0;
    this.emit();
  }
}

export const registry = new WebMcpRegistry();

export { toolDefinitions };

/* Handy for judges, tests and the ?debug=1 panel. */
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__MUTUA__ = {
    registry,
    tools: toolDefinitions.map((t) => t.name),
    call: (name: string, input?: unknown) => registry.call(name, input),
  };
}
