import type { ToolDefinition } from "../types";
import { getWorkspaceState } from "./get-workspace-state";
import { getActiveScenario } from "./get-active-scenario";
import { inspectConstraint } from "./inspect-constraint";
import { listConflicts } from "./list-conflicts";
import { createProposal } from "./create-proposal";
import { modifyProposal } from "./modify-proposal";
import { addConstraint } from "./add-constraint";
import { lockEntity } from "./lock-entity";
import { simulateProposal } from "./simulate-proposal";
import { compareScenarios } from "./compare-scenarios";
import { discardProposal } from "./discard-proposal";
import { commitProposal } from "./commit-proposal";

export const toolDefinitions: ToolDefinition<any, any>[] = [
  getWorkspaceState,
  getActiveScenario,
  inspectConstraint,
  listConflicts,
  createProposal,
  modifyProposal,
  addConstraint,
  lockEntity,
  simulateProposal,
  compareScenarios,
  discardProposal,
  commitProposal,
];

export const toolsByName = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

export {
  getWorkspaceState,
  getActiveScenario,
  inspectConstraint,
  listConflicts,
  createProposal,
  modifyProposal,
  addConstraint,
  lockEntity,
  simulateProposal,
  compareScenarios,
  discardProposal,
  commitProposal,
};
