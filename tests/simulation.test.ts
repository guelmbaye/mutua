import { describe, expect, it } from "vitest";
import { createBaseState } from "@/demo/baseline";
import { baseWithIncident, goldenProposalA, goldenProposalB } from "@/demo/scenarios";
import { simulate } from "@/engines/simulation-engine";
import { compare } from "@/engines/comparison-engine";
import { chooseStrategy } from "@/engines/planner";
import type { Scenario } from "@/domain/types";

function scenarioOf(id: string, name: string, operations: Scenario["operations"]): Scenario {
  return {
    id,
    name,
    kind: "proposal",
    status: "simulated",
    operations,
    constraintResults: [],
    conflicts: [],
    createdBy: "agent",
    createdAt: new Date().toISOString(),
  };
}

describe("simulation engine", () => {
  it("is deterministic", () => {
    const base = baseWithIncident();
    const ops = goldenProposalA().operations;
    const a = simulate(base, ops).metrics;
    const b = simulate(base, ops).metrics;
    expect(a).toEqual(b);
  });

  it("scores the healthy baseline", () => {
    const { metrics } = simulate(createBaseState(), []);
    expect(metrics).toMatchObject({ overloadPercent: 0, deadlineMet: true, extraCost: 0, scopeLoss: 0 });
  });

  it("scores the incident", () => {
    const { metrics, constraintResults } = simulate(baseWithIncident(), []);
    expect(metrics.overloadPercent).toBe(34);
    expect(metrics.deadlineMet).toBe(false);
    expect(constraintResults.find((r) => r.constraintId === "max-overload")?.status).toBe("failed");
    expect(constraintResults.find((r) => r.constraintId === "launch-deadline")?.status).toBe("failed");
  });

  it("scores Proposal A: on time, +$12k, 4% overload, one feature deferred", () => {
    const base = baseWithIncident();
    const { metrics } = simulate(base, goldenProposalA().operations);
    expect(metrics).toMatchObject({
      deadlineMet: true,
      extraCost: 12000,
      overloadPercent: 4,
      scopeLoss: 1,
    });
    expect(metrics.scopeLossTaskIds).toEqual(["analytics-dashboard"]);
  });

  it("scores Proposal B: on time, +$4k, 9% overload, full scope", () => {
    const base = baseWithIncident();
    const { metrics } = simulate(base, goldenProposalB().operations);
    expect(metrics).toMatchObject({
      deadlineMet: true,
      extraCost: 4000,
      overloadPercent: 9,
      scopeLoss: 0,
    });
  });

  it("lets a human lock change which recovery policy is even viable", () => {
    const open = baseWithIncident();
    expect(chooseStrategy(open)).toBe("scope-flexible");

    const locked = baseWithIncident();
    locked.tasks = locked.tasks.map((t) =>
      t.id === "analytics-dashboard" ? { ...t, locked: true } : t,
    );
    expect(chooseStrategy(locked)).toBe("scope-preserving");
  });

  it("flags a proposal built before a lock instead of rewriting it", () => {
    const locked = baseWithIncident();
    locked.tasks = locked.tasks.map((t) =>
      t.id === "analytics-dashboard" ? { ...t, locked: true } : t,
    );
    const { conflicts } = simulate(locked, goldenProposalA().operations);
    expect(conflicts.some((c) => c.type === "lock" && c.severity === "failed")).toBe(true);
  });

  it("ranks scenarios on scope, then cost, then load", () => {
    const base = baseWithIncident();
    const comparison = compare(base, [
      scenarioOf("current", "Current plan", []),
      scenarioOf("proposal-a", "Proposal A", goldenProposalA().operations),
      scenarioOf("proposal-b", "Proposal B", goldenProposalB().operations),
    ]);
    expect(comparison.recommendedScenarioId).toBe("proposal-b");
    expect(comparison.rows.find((r) => r.scenarioId === "current")?.metrics.deadlineMet).toBe(false);
  });
});
