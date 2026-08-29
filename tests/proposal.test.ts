import { beforeEach, describe, expect, it } from "vitest";
import { createBaseState } from "@/demo/baseline";
import { validateOperations, applyOperations, createProposalScenario } from "@/engines/proposal-engine";
import { buildDiff } from "@/engines/diff-engine";
import { derivePlan } from "@/engines/derive";
import type { BaseState, ProposalOperation } from "@/domain/types";

let base: BaseState;

beforeEach(() => {
  base = createBaseState();
});

const reduceAnalytics: ProposalOperation = {
  id: "op-1",
  createdBy: "agent",
  type: "reduce_scope",
  taskId: "analytics-dashboard",
};

describe("proposal engine", () => {
  it("refuses to touch a human-locked entity", () => {
    base.tasks = base.tasks.map((t) => (t.id === "analytics-dashboard" ? { ...t, locked: true } : t));
    const { accepted, rejected } = validateOperations(base, [reduceAnalytics]);
    expect(accepted).toHaveLength(0);
    expect(rejected[0].rejection.code).toBe("ENTITY_LOCKED");
  });

  it("refuses operations on entities that do not exist", () => {
    const { rejected } = validateOperations(base, [
      { id: "op-x", createdBy: "agent", type: "reduce_scope", taskId: "nope" },
    ]);
    expect(rejected[0].rejection.code).toBe("ENTITY_NOT_FOUND");
  });

  it("never mutates the canonical state", () => {
    const before = JSON.stringify(base);
    const scenario = applyOperations(
      createProposalScenario(base, { title: "Proposal A", createdBy: "agent" }),
      [reduceAnalytics],
    );
    const plan = derivePlan(base, scenario.operations);

    expect(plan.tasks.find((t) => t.id === "analytics-dashboard")?.inLaunchScope).toBe(false);
    expect(base.tasks.find((t) => t.id === "analytics-dashboard")?.inLaunchScope).toBe(true);
    expect(JSON.stringify(base)).toBe(before);
  });

  it("turns operations into sentences, not JSON", () => {
    const diff = buildDiff(base, [
      reduceAnalytics,
      {
        id: "op-2",
        createdBy: "agent",
        type: "add_contractor",
        contractorId: "contractor-qa",
        name: "QA contractor",
        role: "QA",
        discipline: "qa",
        days: 4,
        dailyRate: 1000,
      },
      { id: "op-3", createdBy: "agent", type: "rebalance_task", taskId: "payment-qa", toPersonId: "noah", effort: 5 },
    ]);

    expect(diff[0].label).toBe("Remove Analytics dashboard from launch scope");
    expect(diff[0].kind).toBe("remove");
    expect(diff[1].label).toBe("Add QA contractor for 4 days");
    expect(diff[2].label).toBe("Rebalance Payment QA — 5 pts to Noah");
  });

  it("invalidates a simulation as soon as the proposal changes", () => {
    const scenario = {
      ...createProposalScenario(base, { title: "Proposal A", createdBy: "agent" }),
      status: "simulated" as const,
      lastSimulatedAtPlanVersion: 4,
    };
    const updated = applyOperations(scenario, [reduceAnalytics]);
    expect(updated.status).toBe("draft");
    expect(updated.lastSimulatedAtPlanVersion).toBeUndefined();
  });
});
