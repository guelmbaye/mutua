import type { BaseState } from "@/domain/types";
import { createBaseState } from "./baseline";
import { planRecovery } from "@/engines/planner";

/**
 * The golden demo, expressed as data. Used by the integration tests and by
 * anyone who wants to replay the sequence without touching the UI.
 */
export const GOLDEN_SEQUENCE = [
  "Mark Maya unavailable",
  "Keep the September launch without increasing burnout",
  "Lock Analytics dashboard",
  "Keep Analytics and find another option",
  "Compare them",
  "Approve Proposal B",
  "Use B",
] as const;

export function baseWithIncident(): BaseState {
  const base = createBaseState();
  base.people = base.people.map((p) => (p.id === "maya" ? { ...p, status: "unavailable" } : p));
  return base;
}

export function goldenProposalA() {
  return planRecovery(baseWithIncident(), { strategy: "scope-flexible" });
}

export function goldenProposalB() {
  const base = baseWithIncident();
  base.tasks = base.tasks.map((t) => (t.id === "analytics-dashboard" ? { ...t, locked: true } : t));
  return planRecovery(base, { strategy: "scope-preserving" });
}
