import { describe, expect, it } from "vitest";
import { createBaseState } from "@/demo/baseline";
import { simulate } from "@/engines/simulation-engine";
import { planRecovery, chooseStrategy } from "@/engines/planner";
import type { BaseState } from "@/domain/types";

function withMayaUnavailable(): BaseState {
  const base = createBaseState();
  base.people = base.people.map((p) =>
    p.id === "maya" ? { ...p, status: "unavailable" as const } : p,
  );
  return base;
}

function lockAnalytics(base: BaseState): BaseState {
  return {
    ...base,
    tasks: base.tasks.map((t) => (t.id === "analytics-dashboard" ? { ...t, locked: true } : t)),
    constraints: [
      ...base.constraints,
      {
        id: "lock-analytics-dashboard",
        type: "scope" as const,
        label: "Analytics dashboard remains in scope",
        value: "analytics-dashboard",
        severity: "hard" as const,
        locked: true,
        source: "human" as const,
        entityId: "analytics-dashboard",
      },
    ],
  };
}

describe("calibration", () => {
  it("baseline is healthy", () => {
    const { metrics, plan } = simulate(createBaseState(), []);
    console.log("baseline loads", plan.loads.map((l) => `${l.name}:${l.loadPercent}`).join(" "));
    expect(metrics.overloadPercent).toBe(0);
    expect(metrics.deadlineMet).toBe(true);
  });

  it("maya unavailable -> 34% overload, launch slips", () => {
    const { metrics, plan } = simulate(withMayaUnavailable(), []);
    console.log("incident loads", plan.loads.map((l) => `${l.name}:${l.loadPercent}`).join(" "));
    expect(metrics.overloadPercent).toBe(34);
    expect(metrics.deadlineMet).toBe(false);
  });

  it("proposal A", () => {
    const base = withMayaUnavailable();
    expect(chooseStrategy(base)).toBe("scope-flexible");
    const planned = planRecovery(base);
    const { metrics, plan } = simulate(base, planned.operations);
    console.log("A ops", JSON.stringify(planned.operations.map((o) => o.type + ":" + JSON.stringify(o)), null, 1));
    console.log("A loads", plan.loads.map((l) => `${l.name}:${l.loadPercent}`).join(" "));
    console.log("A metrics", metrics);
    expect(metrics.extraCost).toBe(12000);
    expect(metrics.overloadPercent).toBe(4);
    expect(metrics.scopeLoss).toBe(1);
    expect(metrics.deadlineMet).toBe(true);
  });

  it("proposal B", () => {
    const base = lockAnalytics(withMayaUnavailable());
    expect(chooseStrategy(base)).toBe("scope-preserving");
    const planned = planRecovery(base);
    const { metrics, plan } = simulate(base, planned.operations);
    console.log("B ops", JSON.stringify(planned.operations, null, 1));
    console.log("B loads", plan.loads.map((l) => `${l.name}:${l.loadPercent}`).join(" "));
    console.log("B metrics", metrics);
    expect(metrics.extraCost).toBe(4000);
    expect(metrics.overloadPercent).toBe(9);
    expect(metrics.scopeLoss).toBe(0);
    expect(metrics.deadlineMet).toBe(true);
  });
});
