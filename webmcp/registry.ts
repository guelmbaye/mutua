"use client";

import type { WorkspacePhase } from "@/domain/types";
import { capabilityMap } from "./capability-map";
import { toolsByName, toolDefinitions } from "./tools";
import { failResult } from "./envelope";
import type { ToolResult } from "./result";

/* ------------------------------------------------- WebMCP host interface */

/**
 * The WebMCP imperative API, as specified by the Chrome origin trial.
 *
 * Registration lives on `document.modelContext`. `registerTool` is async and
 * returns nothing useful: a tool is removed by aborting the AbortSignal handed
 * to it at registration. `execute` receives the parsed input and a second
 * argument carrying a `signal` for cancellation, and resolves to a string.
 *
 * `navigator.modelContext` is kept as a fallback for hosts that shipped the
 * earlier draft, so MUTUA works in both without branching anywhere else.
 */
interface WebMcpToolDescriptor {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (args: Record<string, unknown>, context?: { signal?: AbortSignal }) => Promise<string>;
}

interface RegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

interface ModelContext {
  registerTool?: (
    tool: WebMcpToolDescriptor,
    options?: RegisterToolOptions,
  ) => Promise<unknown> | unknown;
  /** Earlier draft: the whole tool list is pushed at once. */
  provideContext?: (context: { tools: WebMcpToolDescriptor[] }) => void;
}

function modelContext(): ModelContext | undefined {
  if (typeof document !== "undefined") {
    const fromDocument = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (fromDocument) return fromDocument;
  }
  if (typeof navigator !== "undefined") {
    return (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  }
  return undefined;
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

    const controller = new AbortController();

    const descriptor: WebMcpToolDescriptor = {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.jsonSchema,
      annotations: {
        readOnlyHint: tool.annotations.readOnly,
        destructiveHint: tool.annotations.destructive,
        // Everything an agent reads here is workspace state the user can see.
        untrustedContentHint: false,
      },
      execute: async (args) => {
        const result = await this.call(name, args ?? {});
        return JSON.stringify(result);
      },
    };

    // registerTool is async, but the phase transition that triggered it is not.
    // Registering optimistically keeps the UI, the registry and the tests in
    // step; a rejected registration simply leaves the host without the tool.
    void Promise.resolve(ctx.registerTool(descriptor, { signal: controller.signal })).catch(() => {
      /* the host refused the tool; the inspector still reflects our own map */
    });

    return () => controller.abort();
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
          execute: async (args: Record<string, unknown>) => {
            const result = await this.call(name, args ?? {});
            return JSON.stringify(result);
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
