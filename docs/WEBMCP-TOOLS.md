# WebMCP capability reference

Twelve capabilities. Never all at once.

## Capability matrix

| Tool | current | draft | simulated | approved | committed |
|---|:--:|:--:|:--:|:--:|:--:|
| `get_workspace_state` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `get_active_scenario` | ✓ | ✓ | ✓ | — | ✓ |
| `inspect_constraint` | ✓ | ✓ | ✓ | — | ✓ |
| `list_conflicts` | ✓ | ✓ | ✓ | — | ✓ |
| `create_proposal` | ✓ | — | — | — | ✓ |
| `modify_proposal` | — | ✓ | ✓ | — | — |
| `add_constraint` | ✓ | ✓ | — | — | ✓ |
| `lock_entity` | ✓ | ✓ | — | — | ✓ |
| `simulate_proposal` | — | ✓ | — | — | — |
| `compare_scenarios` | — | — | ✓ | ✓ | — |
| `discard_proposal` | — | ✓ | ✓ | ✓ | — |
| `commit_proposal` | — | — | — | ✓ | — |

Source of truth: `webmcp/capability-map.ts`. The same map drives registration
and the Capability Inspector.

## Result envelope

Every tool returns the same shape.

```ts
type ToolResult<T> = {
  ok: boolean
  data?: T
  error?: {
    code: ToolErrorCode
    message: string
    recoverable: boolean
    suggestedNextAction?: string
    entityId?: string
  }
  stateVersion: number
  phase: WorkspacePhase
}
```

No stack trace ever reaches an agent.

## Error contract

| Code | Meaning | Recoverable |
|---|---|:--:|
| `ENTITY_NOT_FOUND` | No such task or person | ✓ |
| `ENTITY_LOCKED` | The human locked it; the operation was not applied | ✓ |
| `CONSTRAINT_NOT_FOUND` | No such constraint | ✓ |
| `NO_ACTIVE_PROPOSAL` | Nothing open to modify, simulate or discard | ✓ |
| `PROPOSAL_NOT_FOUND` | No proposal with that id | ✓ |
| `PROPOSAL_ALREADY_ACTIVE` | One editable proposal at a time | ✓ |
| `INVALID_OPERATION` | Domain-illegal operation | ✓ |
| `INVALID_INPUT` | Failed Zod validation | ✓ |
| `SIMULATION_REQUIRED` | Never simulated | ✓ |
| `SIMULATION_STALE` | Plan moved after the last simulation | ✓ |
| `APPROVAL_REQUIRED` | No human approval recorded in state | ✓ |
| `HARD_CONSTRAINT_VIOLATION` | Cannot become the plan | ✓ |
| `PROPOSAL_ALREADY_COMMITTED` | Already real | ✗ |
| `STALE_STATE` | `expectedStateVersion` mismatch | ✓ |
| `TOOL_NOT_AVAILABLE` | Not registered in this phase | ✓ |

## State and plan versions

`stateVersion` increments on every material change and is returned in every
envelope. Tools accept an optional `expectedStateVersion` for optimistic
concurrency; a mismatch returns `STALE_STATE`.

`planVersion` increments only when the plan itself moves — people, work,
constraints, locks, operations. Simulation freshness is checked against it, so
approving a proposal or switching a tab does not invalidate a simulation, while
locking a task does.

## Operations

`modify_proposal` accepts explicit, reversible operations. There is no generic
`update_workspace(anything)`.

| Operation | Effect |
|---|---|
| `reassign_task` | Move a whole task to another person |
| `rebalance_task` | Move part of a task's effort to another person |
| `delay_task` | Reschedule; past the launch date it leaves the window |
| `reduce_scope` | Take a task out of launch scope |
| `restore_scope` | Put it back |
| `add_contractor` | Book external capacity — `days × dailyRate` |
| `change_capacity` | Adjust a person's available capacity |

Validation order, before anything is applied: schema → entity exists → entity is
not human-locked → operation is legal → apply to the proposal clone → invalidate
the prior simulation.

## Tool notes

**`get_workspace_state`** — returns only decision-relevant data, never a dump of
the client store: team with computed loads, work with scope and lock status,
constraints with pass/fail, active locks, current metrics, phase, state version.

**`create_proposal`** — `autoPlan: true` (the default) attaches operations from
the deterministic planner. `strategy: "auto"` reads the workspace: once every
non-critical launch commitment is locked, only `scope-preserving` remains.

**`lock_entity`** — exists so an agent can prepare a lock the human asked for out
loud. The demo path is the human clicking the lock, and the interface stays the
authoritative surface for intent.

**`simulate_proposal`** — the application computes the numbers. Do not estimate
deadline, load, cost, scope or constraint results yourself.

**`compare_scenarios`** — ranking is deterministic: scope loss, then cost, then
peak load. Calling it opens the comparison view, which is a visible link between
an agent action and a UI transition.

**`commit_proposal`** — the only capability that mutates canonical state. It is
unregistered before approval *and* independently validates approval, simulation
freshness, state version and hard constraints.

There is no `approve_proposal` tool, by design.

## Calling the tools

Through the standard API, in a browser with WebMCP enabled:

```js
const tools = await document.modelContext.getTools();
const read = tools.find(t => t.name === "get_workspace_state");
JSON.parse(await document.modelContext.executeTool(read, "{}"));
```

Registration uses `document.modelContext.registerTool(descriptor, { signal })`.
Each tool carries its own `AbortController`; a phase change aborts the ones that
no longer apply, which is how a capability actually leaves the host.

MUTUA's own registry is exposed too, for inspecting the call log:

```js
__MUTUA__.registry.getRegisteredTools();
__MUTUA__.registry.getLog();
await __MUTUA__.call("get_workspace_state");   // same path the built-in agent uses
```
