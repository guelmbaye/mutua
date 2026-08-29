import type { ActivityEvent, Constraint, Person, Scenario, Task, Workspace } from "@/domain/types";

const STORAGE_KEY = "mutua.workspace.v1";

export interface PersistedState {
  workspace: Workspace;
  people: Person[];
  tasks: Task[];
  constraints: Constraint[];
  scenarios: Scenario[];
  activeProposalId: string | null;
  viewedScenarioId: string;
  stateVersion: number;
  planVersion: number;
  activity: ActivityEvent[];
}

export function loadPersisted(): PersistedState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return undefined;
  }
}

export function savePersisted(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — the demo keeps working in memory */
  }
}

export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
