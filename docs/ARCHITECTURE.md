# Architecture

## One store, two participants

```
   Human clicks a lock                 Agent calls modify_proposal
            │                                     │
            ▼                                     ▼
   ┌──────────────────────────────────────────────────────────┐
   │                  useWorkspaceStore (Zustand)             │
   │   workspace · people · tasks · constraints · scenarios   │
   │   phase · stateVersion · planVersion · activity          │
   └──────────────────────────────────────────────────────────┘
            │                                     │
            ▼                                     ▼
      React render                     WebMCP registry sync
```

There is no agent store. `webmcp/tools/*` call the same actions the buttons
call, so the agent can never read a stale copy of the workspace.

## The mutation rule

Every material change follows the same path, in `store/workspace-store.ts`:

```
validate → apply → stateVersion++ → (planVersion++ if the plan moved)
        → re-score every scenario → recompute phase
        → refresh the WebMCP registry → append an audit event → persist
```

Re-scoring is what makes locks honest. A proposal is never rewritten behind the
human's back: it is re-measured against the new reality, and if it now breaks a
lock it becomes `conflicted`, loses its editable status, and stays available for
comparison.

## Engines

Pure functions, no React, no model calls.

| Module | Responsibility |
|---|---|
| `engines/derive.ts` | Clone the plan, apply operations, resolve owners, compute loads, scope, slip |
| `engines/constraint-engine.ts` | Evaluate constraints and detect conflicts, including lock violations |
| `engines/simulation-engine.ts` | Metrics + constraint results + conflicts for a set of operations |
| `engines/diff-engine.ts` | Operations → human-readable sentences |
| `engines/comparison-engine.ts` | Side-by-side rows and a deterministic ranking |
| `engines/proposal-engine.ts` | Domain validation, operation application, simulation freshness |
| `engines/planner.ts` | Two deterministic recovery policies |

The current plan is `derivePlan(base, [])`. A proposal is
`derivePlan(base, operations)`. Same function, so current and proposed can never
be measured differently.

## How the numbers work

Effort is measured in points: **100 points = one engineer for the whole launch
window** (20 working days, so 5 points per day).

```
loadPercent      = round(assignedEffort / capacity × 100)
overloadPercent  = max(0, peakLoad − 100)
scopeLoss        = launch commitments no longer in the window
extraCost        = Σ contractor days × daily rate
```

Deadline uses a deliberately simple rule: a person absorbs up to
**125 %** of capacity before work physically spills past the launch date, at
which point the overflow becomes slip days. That threshold is distinct from the
team's declared **15 %** overload tolerance, which is evaluated as a constraint —
so "the launch slips" and "we are burning people out" stay two different
findings.

When a person becomes unavailable, their work moves to the `fallbackOwnerId`
declared on each task. No scheduler, no heuristics, no surprises.

## Phase machine

```
current ──create_proposal──▶ draft ──simulate_proposal──▶ simulated
   ▲                          ▲   │                          │
   │                          │   └──────modify_proposal◀────┘
   │                     any plan change
   │                     invalidates the simulation
   │                                                         │
   │                                          human approval │
   │                                                         ▼
   └────────────commit_proposal────────── committed ◀──── approved
```

Human locks that conflict with the open proposal freeze it and return the phase
to `current`, which is what makes `create_proposal` available again for the
alternative.

## Rendering

Two static routes: `/` is a landing page, `/workspace` is the product. Inside
the workspace there is no routing at all — one screen, three regions, phases
swap content rather than pages:

```
┌───────────────────────────────────────────────────────────────┐
│ MUTUA   September Launch Recovery          SIMULATED   Agent ●│
├────────────────┬────────────────────────────┬─────────────────┤
│ CURRENT STATE  │ DECISION WORKSPACE         │ AGENT           │
│ metrics        │ scenario tabs              │ CAPABILITIES    │
│ risk           │ proposal summary           │                 │
│ team           │ operation diff             │ available now   │
│ work + locks   │ simulation result          │ context locked  │
│ constraints    │ comparison · approval      │ + reason        │
│                │ ─────────── ask MUTUA ─────│                 │
├────────────────┴────────────────────────────┴─────────────────┤
│ ACTIVITY  human · agent · system, in order                    │
└───────────────────────────────────────────────────────────────┘
```

Target 1440 × 900, minimum 1280 × 720. Below `lg` the side panels collapse and
the decision workspace takes the screen; mobile is explicitly out of scope.

## Determinism

`domain/rules.ts` has no `Math.random` and no `Date.now` in any computed value —
ids are a monotonic counter reset by `resetDemo()`. Given the same dataset and
the same operations, every metric in this application is reproducible, which is
why `tests/calibration.test.ts` can assert exact numbers.
