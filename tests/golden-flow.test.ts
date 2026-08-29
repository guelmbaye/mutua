import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore } from "@/store/workspace-store";
import { registry } from "@/webmcp/registry";
import { resetIdCounter } from "@/domain/rules";
import { simulate } from "@/engines/simulation-engine";

/**
 * The golden flow, driven exactly the way the demo is:
 * human actions through the store, agent actions through the WebMCP registry.
 */

function store() {
  return useWorkspaceStore.getState();
}

function syncRegistry() {
  registry.sync(store().phase);
}

beforeEach(() => {
  resetIdCounter();
  registry.reset();
  store().resetDemo();
  syncRegistry();
});

describe("golden flow", () => {
  it("runs end to end and only commits after human approval", async () => {
    /* 1 — the incident, made by a human in the interface */
    store().setPersonStatus("maya", "unavailable", "human");
    syncRegistry();
    expect(store().phase).toBe("current");

    /* 2 — the agent reads the same reality */
    const state = await registry.call("get_workspace_state");
    expect(state.ok).toBe(true);
    expect((state.data as { metrics: { overloadPercent: number } }).metrics.overloadPercent).toBe(34);

    const conflicts = await registry.call("list_conflicts");
    expect((conflicts.data as { conflicts: unknown[] }).conflicts.length).toBeGreaterThan(0);

    /* 3 — Proposal A, isolated from the canonical plan */
    const created = await registry.call("create_proposal", { autoPlan: true });
    expect(created.ok).toBe(true);
    syncRegistry();
    expect(store().phase).toBe("draft");
    expect(registry.getRegisteredTools()).not.toContain("create_proposal");
    expect(store().tasks.find((t) => t.id === "analytics-dashboard")?.inLaunchScope).toBe(true);

    const simulatedA = await registry.call("simulate_proposal");
    syncRegistry();
    expect(simulatedA.ok).toBe(true);
    expect((simulatedA.data as { metrics: Record<string, unknown> }).metrics).toMatchObject({
      deadlineMet: true,
      extraCost: 12000,
      overloadPercent: 4,
      scopeLoss: 1,
    });
    expect(store().phase).toBe("simulated");

    /* 4 — the human locks Analytics: the agent's context changes */
    store().lockEntity(
      { entityType: "task", entityId: "analytics-dashboard", reason: "Committed to the board" },
      "human",
    );
    syncRegistry();

    const proposalA = store().getScenario("proposal-a")!;
    expect(proposalA.status).toBe("conflicted");
    expect(store().activeProposalId).toBeNull();
    expect(store().phase).toBe("current");
    expect(registry.getRegisteredTools()).toContain("create_proposal");

    /* 5 — the agent solves the same problem under the new constraint */
    const createdB = await registry.call("create_proposal", { autoPlan: true });
    expect(createdB.ok).toBe(true);
    expect((createdB.data as { strategy: string }).strategy).toBe("scope-preserving");
    syncRegistry();

    const simulatedB = await registry.call("simulate_proposal");
    syncRegistry();
    expect((simulatedB.data as { metrics: Record<string, unknown> }).metrics).toMatchObject({
      deadlineMet: true,
      extraCost: 4000,
      overloadPercent: 9,
      scopeLoss: 0,
    });
    const bConflicts = (simulatedB.data as { conflicts: { type: string; severity: string }[] }).conflicts;
    expect(bConflicts.filter((c) => c.severity === "failed")).toHaveLength(0);
    expect(bConflicts.some((c) => c.type === "lock")).toBe(false);

    /* 6 — compare, on numbers the workspace computed */
    const comparison = await registry.call("compare_scenarios");
    expect(comparison.ok).toBe(true);
    expect((comparison.data as { recommendedScenarioId: string }).recommendedScenarioId).toBe("proposal-b");
    expect(store().comparisonOpen).toBe(true);

    /* 7 — commit is not merely hidden: it is refused */
    const early = await registry.call("commit_proposal");
    expect(early.ok).toBe(false);
    expect(early.error?.code).toBe("TOOL_NOT_AVAILABLE");

    const directCall = (await import("@/webmcp/tools/commit-proposal")).commitProposal.handler({});
    expect(directCall.ok).toBe(false);
    expect(directCall.error?.code).toBe("APPROVAL_REQUIRED");

    /* 8 — human approval unlocks the capability */
    store().approveProposal("proposal-b");
    syncRegistry();
    expect(store().phase).toBe("approved");
    expect(registry.getRegisteredTools()).toContain("commit_proposal");

    /* 9 — commit */
    const committed = await registry.call("commit_proposal");
    syncRegistry();
    expect(committed.ok).toBe(true);
    expect(store().phase).toBe("committed");
    expect(registry.getRegisteredTools()).not.toContain("commit_proposal");

    /* 10 — the canonical plan really moved */
    const after = simulate(store().getBaseState(), []);
    expect(after.metrics.overloadPercent).toBe(9);
    expect(after.metrics.deadlineMet).toBe(true);
    expect(store().workspace.baseBudget).toBe(424_000);
    expect(store().tasks.find((t) => t.id === "analytics-dashboard")?.inLaunchScope).toBe(true);
    expect(store().people.some((p) => p.contractor)).toBe(true);

    /* 11 — the whole sequence is attributable */
    const messages = store().activity.map((event) => `${event.actor}: ${event.message}`);
    expect(messages.some((m) => m.startsWith("human") && m.includes("Maya"))).toBe(true);
    expect(messages.some((m) => m.startsWith("human") && m.includes("locked"))).toBe(true);
    expect(messages.some((m) => m.startsWith("human") && m.includes("approved"))).toBe(true);
    expect(messages.some((m) => m.startsWith("agent") && m.includes("committed"))).toBe(true);
  });

  it("refuses an operation that would touch a locked entity", async () => {
    store().setPersonStatus("maya", "unavailable", "human");
    store().lockEntity({ entityType: "task", entityId: "analytics-dashboard" }, "human");
    syncRegistry();

    await registry.call("create_proposal", { autoPlan: false });
    syncRegistry();

    const result = await registry.call("modify_proposal", {
      operations: [{ type: "reduce_scope", taskId: "analytics-dashboard" }],
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("ENTITY_LOCKED");
    expect(store().tasks.find((t) => t.id === "analytics-dashboard")?.inLaunchScope).toBe(true);
  });

  it("marks a simulation stale when the plan moves under it", async () => {
    store().setPersonStatus("maya", "unavailable", "human");
    syncRegistry();
    await registry.call("create_proposal", { autoPlan: true });
    syncRegistry();
    await registry.call("simulate_proposal");
    syncRegistry();
    expect(store().phase).toBe("simulated");

    store().setPersonStatus("noah", "unavailable", "human");
    syncRegistry();
    expect(store().phase).toBe("draft");
    expect(registry.getRegisteredTools()).toContain("simulate_proposal");
  });

  it("resets to the baseline in one call", async () => {
    store().setPersonStatus("maya", "unavailable", "human");
    await registry.call("create_proposal", { autoPlan: true });
    store().resetDemo();
    syncRegistry();

    expect(store().phase).toBe("current");
    expect(store().scenarios).toHaveLength(1);
    expect(store().people.every((p) => p.status === "available")).toBe(true);
    expect(store().activity).toHaveLength(0);
  });
});
