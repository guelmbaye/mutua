import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registry, isWebMcpHostAvailable } from "@/webmcp/registry";
import { useWorkspaceStore } from "@/store/workspace-store";
import { resetIdCounter } from "@/domain/rules";

/**
 * MUTUA against the WebMCP imperative API as specified: registration on
 * `document.modelContext`, removal through the AbortSignal handed to
 * `registerTool`, and an `execute` that resolves to a string.
 *
 * The host below is a stand-in for Chrome and the ChatGPT in-app browser. It
 * only implements what the specification promises, so anything MUTUA relies on
 * beyond that would fail here.
 */

interface HostTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean | undefined>;
  execute: (args: Record<string, unknown>, ctx?: { signal?: AbortSignal }) => Promise<string>;
}

function createHost() {
  const tools = new Map<string, HostTool>();
  return {
    tools,
    registerTool: async (tool: HostTool, options?: { signal?: AbortSignal }) => {
      tools.set(tool.name, tool);
      options?.signal?.addEventListener("abort", () => tools.delete(tool.name));
    },
    getTools: async () => [...tools.values()].sort((a, b) => a.name.localeCompare(b.name)),
    executeTool: async (name: string, argsJson: string) => {
      const tool = tools.get(name);
      if (!tool) throw new Error(`not registered: ${name}`);
      return tool.execute(JSON.parse(argsJson || "{}"));
    },
  };
}

let host: ReturnType<typeof createHost>;

beforeEach(() => {
  host = createHost();
  (globalThis as { document?: unknown }).document = { modelContext: host };
  resetIdCounter();
  registry.reset();
  useWorkspaceStore.getState().resetDemo();
});

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

describe("WebMCP host bridge", () => {
  it("finds the host on document.modelContext", () => {
    expect(isWebMcpHostAvailable()).toBe(true);
  });

  it("registers the current phase's capabilities on the host itself", async () => {
    registry.sync("current");
    await Promise.resolve();

    const names = (await host.getTools()).map((t) => t.name);
    expect(names).toContain("create_proposal");
    expect(names).toContain("get_workspace_state");
    expect(names).not.toContain("simulate_proposal");
    expect(names).not.toContain("commit_proposal");
  });

  it("describes tools the way the specification expects", async () => {
    registry.sync("approved");
    await Promise.resolve();

    const commit = (await host.getTools()).find((t) => t.name === "commit_proposal")!;
    expect(commit.title).toBeTruthy();
    expect(commit.inputSchema).toHaveProperty("type", "object");
    expect(commit.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    expect(typeof commit.execute).toBe("function");

    const read = (await host.getTools()).find((t) => t.name === "get_workspace_state")!;
    expect(read.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
  });

  it("really removes a capability from the host when the phase moves", async () => {
    registry.sync("current");
    await Promise.resolve();
    expect(host.tools.has("create_proposal")).toBe(true);

    registry.sync("draft");
    await Promise.resolve();
    expect(host.tools.has("create_proposal")).toBe(false);
    expect(host.tools.has("simulate_proposal")).toBe(true);

    await expect(host.executeTool("create_proposal", "{}")).rejects.toThrow(/not registered/);
  });

  it("returns a string result the agent can parse", async () => {
    useWorkspaceStore.getState().setPersonStatus("maya", "unavailable", "human");
    registry.sync(useWorkspaceStore.getState().phase);
    await Promise.resolve();

    const raw = await host.executeTool("get_workspace_state", "{}");
    expect(typeof raw).toBe("string");

    const parsed = JSON.parse(raw);
    expect(parsed.ok).toBe(true);
    expect(parsed.phase).toBe("current");
    expect(parsed.stateVersion).toBeGreaterThan(0);
    expect(parsed.data.metrics.overloadPercent).toBe(34);
  });

  it("exposes commit to the host only once a human has approved", async () => {
    const store = useWorkspaceStore.getState();
    store.setPersonStatus("maya", "unavailable", "human");
    registry.sync(useWorkspaceStore.getState().phase);
    await Promise.resolve();

    await host.executeTool("create_proposal", '{"autoPlan": true}');
    registry.sync(useWorkspaceStore.getState().phase);
    await Promise.resolve();

    await host.executeTool("simulate_proposal", "{}");
    registry.sync(useWorkspaceStore.getState().phase);
    await Promise.resolve();
    expect(host.tools.has("commit_proposal")).toBe(false);

    useWorkspaceStore.getState().approveProposal("proposal-a");
    registry.sync(useWorkspaceStore.getState().phase);
    await Promise.resolve();
    expect(host.tools.has("commit_proposal")).toBe(true);

    const committed = JSON.parse(await host.executeTool("commit_proposal", "{}"));
    expect(committed.ok).toBe(true);

    registry.sync(useWorkspaceStore.getState().phase);
    await Promise.resolve();
    expect(host.tools.has("commit_proposal")).toBe(false);
  });
});
