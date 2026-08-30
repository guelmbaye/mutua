# Devpost submission copy

All submission materials — this document, the README, the technical docs, every
string rendered by the product, and the demonstration video narration — are in
English.

---

## Project name

**MUTUA**

## Tagline

Shared State for Humans and Agents — think together, change safely, commit
deliberately.

## Elevator pitch (one line)

MUTUA is a WebMCP-native decision workspace where humans and AI agents share the
same application state, explore changes together, simulate consequences, and
commit only after explicit human approval.

---

## Inspiration

Agents are getting good at acting on the web, but almost every agentic product
still asks you to pick one of two shapes.

An agent that **advises**: it talks about your work from a chat panel, and you
translate its advice into the application by hand.

An agent that **operates**: it acts through tools or APIs, and you find out
afterwards what changed.

Both give something up. The first leaves the agent outside the work. The second
takes the human out of the loop at exactly the moment the stakes are highest.

We wanted to know what a third shape looks like: what if the application itself
were the shared surface, where a human and an agent reason about the same
problem, and the human keeps authority over what becomes real?

That question is what made WebMCP interesting to us. Not as a way to make an
existing app agent-compatible, but as a way to let a page say *these are the
actions that make sense right now* — and to have that answer change as the human
works.

## What it does

MUTUA demonstrates the model through one focused scenario: **software launch
recovery**.

A team is four weeks from a September 30 launch. Five engineers, a $420,000
budget, a stated tolerance of 15 % workload overload. Everything is on track.

Then one QA engineer becomes unavailable. You mark it in the interface. The
workspace recomputes: peak load 134 %, overload 34 %, launch slipping two working
days.

You ask the agent to *keep the September launch without increasing burnout*.

It reads the same state you are looking at, and creates **Proposal A** — on time,
**+$12,000**, overload down to **4 %**, but the Analytics dashboard deferred out
of launch scope. Your plan has not changed. This is a proposal, sitting beside
reality, with every operation spelled out in a readable diff.

Analytics is a commitment you made, so you lock it. Proposal A immediately shows
a **conflict** — it is never rewritten behind your back, just re-measured against
your new constraint and frozen for comparison.

You ask for another option. **Proposal B** — on time, **+$4,000**, **9 %**
overload, **no scope loss**, every lock respected. It gets there differently:
instead of dropping a feature, it defers work that was never a launch commitment,
splits QA effort across whoever has the skill and the room, and books the
smallest useful block of contractor capacity.

You compare them side by side, on numbers the application computed.

Then the moment the whole project is built around. Look at the Agent
Capabilities panel: `commit_proposal` is not there. The agent does not have the
capability to make this real. You click **Approve Proposal B**, and it appears.

You say *use B*. The agent commits. The plan becomes September 30, 9 % overload,
$424,000, full scope — and every step, human and agent, is in the timeline with
its author.

## The four primitives

**Shared state.** One store backs the interface and every WebMCP tool. There is
no agent-side copy of reality that can drift out of date.

**Proposal state.** Agent changes are explicit reversible operations applied to a
cloned plan. Exactly one tool can touch canonical state, and it is gated.

**Human locks.** A locked item cannot be rescoped, delayed, reassigned or
resized. The lock is enforced when an operation is attempted *and* re-evaluated
against proposals that already exist.

**Dynamic capability surface.** The set of registered WebMCP tools is a function
of workflow phase. Comparison does not exist before simulation. Commit does not
exist before approval.

## How we used WebMCP

Twelve semantic capabilities, grouped by what they are for:

**Observe** — `get_workspace_state`, `get_active_scenario`, `inspect_constraint`,
`list_conflicts`
**Propose** — `create_proposal`, `modify_proposal`, `add_constraint`,
`lock_entity`
**Evaluate** — `simulate_proposal`, `compare_scenarios`
**Finalize** — `discard_proposal`, `commit_proposal`

They are never all registered at once. A capability map turns the current phase
into a tool set, and the registry synchronises against the WebMCP host on every
material state change — registering what became meaningful, unregistering what
did not.

The Capability Inspector in the interface renders the **live registry**, not the
map, so what a judge reads is exactly what an agent can call.

There is deliberately **no tool for approval**. That transition belongs to the
interface, and to the person using it.

## How we built it

Next.js 15, React 19, TypeScript, Zustand, Zod, Tailwind CSS. No backend, no
database, no ML, no external API on the golden path.

Every material mutation — from a click or from a tool — follows the same path:
validate, apply, bump the state version, re-score every scenario, recompute the
phase, refresh the WebMCP registry, append an audit event, persist.

The consequence engines are pure functions. The agent chooses **operations**; the
application computes **consequences**: deadline slip, per-person load, recovery
spend, scope loss, constraint results. No model calculates anything, which is why
the demo replays identically and the tests can assert exact figures.

The recovery planner is deterministic and is not a lookup table. It implements
two policies with genuinely different trade-offs — one that will spend more and
sacrifice scope to keep tasks whole, one that preserves scope by fragmenting work
and buying the minimum outside capacity. Which policy applies is read from the
state of the workspace: once every non-critical launch commitment is locked, the
first has nothing left to give. **The lock does not filter operations; it changes
which recovery is possible at all.**

## Challenges we ran into

**Designing for collaboration instead of automation.** The easy build is a bag of
tools that edit application state directly. We rejected it, and then had to
design an actual lifecycle — propose, review, simulate, constrain, adapt,
approve, commit — where each transition is legible.

**Making a lock mean something.** It is trivial to reject an operation that
targets a locked entity. It is harder to decide what happens to a proposal that
was *already valid* when the lock arrives. Rewriting it silently would have
destroyed the story we were telling, so proposals are re-scored after every
change and surface as conflicts instead.

**Calibrating the dataset.** The demo numbers had to fall out of the engine, not
be typed into a component. Getting a dataset where the baseline is healthy, one
absence produces 34 % overload, and the two policies land on 4 % / +$12k and 9 % /
+$4k took real iteration — and it is guarded by tests that assert the exact
values.

**Making capability changes visible.** Dynamic registration is invisible by
nature. The Capability Inspector exists so that the contract between the
application and the agent is something you can watch change.

## Accomplishments we're proud of

MUTUA reaches what we think of as the third level of WebMCP use.

Level one, the agent can **understand** the application — it reads structured
state.

Level two, the agent can **participate** — it creates and modifies visible,
reversible proposals.

Level three, the application **governs** the agent — its current state determines
which capabilities exist at all.

The third level is the submission. And it is not decorative: `commit_proposal` is
unregistered before approval *and* independently re-validates approval,
simulation freshness, state version and hard constraints in its handler. A test
calls it directly, bypassing the registry, and asserts the refusal.

## What we learned

Agent capabilities can be part of the user experience.

We stopped asking *which tools should this agent have* and started asking *which
actions make sense in this exact application state*. That turns tool design from
an API problem into an interaction design problem — and WebMCP is what makes the
question answerable, because the page's own state is right there to answer it
with.

## What's next

Extract the shared-state and capability lifecycle into reusable primitives, and
prove them in a second domain — incident response is the obvious one, because it
has the same shape: observe, investigate, propose mitigation, human
authorisation, execution capability unlocked.

The same model fits procurement, staffing, infrastructure operations, financial
planning and compliance. We deliberately did not build any of them. One workflow
implemented deeply demonstrates WebMCP better than five implemented shallowly.

## Built with

`next.js` `react` `typescript` `webmcp` `zustand` `zod` `tailwindcss` `vitest`
`vercel`

---

## Screenshots

Eight frames are checked in at [`docs/screenshots/`](screenshots/), captured at
1440 × 900 (2×) from the production build. Submit these five:

1. **`01-incident.png`** — Maya unavailable, 34 % overload, launch at risk.
   *Human and agent begin from the same visible application state.*
2. **`02-proposal-a.png`** — +$12k, 4 % overload, Analytics deferred, operations
   spelled out.
   *Agent changes stay isolated as a reversible, simulated proposal.*
3. **`03-human-lock.png`** — Analytics locked, Proposal A flagged Conflict,
   Capability Inspector visible.
   *A human action immediately reshapes the shared state and the agent's context.*
4. **`05-comparison.png`** — Current / A / B side by side.
   *Alternatives compared on outcomes the application computed, not text the model wrote.*
5. **`06-capability-unlocked.png`** — `commit_proposal` in Available now, right
   after approval.
   *Human approval changes the WebMCP capability surface.*

## Devpost submission form

Everything the form asks for, mapped to what exists in this repository.

**Project name** — MUTUA (specific, not generic; the rules call this out).

**Live URL** — the deployed `/workspace` route. Must open in ChatGPT's in-app
browser or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled. No
authentication, so no credentials to supply.

**Text description** — must cover four points. Use these sections above:

| Required point | Where |
|---|---|
| Why the use case fits WebMCP | *Inspiration* and *How we used WebMCP* |
| How it creates a better user experience | *What it does* |
| What people and agents can do together that was hard or impossible before | *The four primitives* and *Accomplishments* |
| How WebMCP was implemented | *How we used WebMCP* and *How we built it* |

**Demo video** — under three minutes, public on YouTube, **with audio** covering
what was built and how WebMCP was used. Script and timings in
[`DEMO-SCRIPT.md`](DEMO-SCRIPT.md).

**Public repository** — <https://github.com/guelmbaye/mutua>, with an
open-source licence that GitHub detects and shows in the About panel. `LICENSE`
is MIT at the repository root, which satisfies this.

**Built with** — next.js, react, typescript, webmcp, zustand, zod, tailwindcss,
vitest, vercel.

## Pre-submission checklist

**Product**
- [ ] Golden demo runs end to end from a fresh reset
- [ ] Proposal A deterministic (+$12k · 4 % · 1 feature)
- [ ] Lock produces a visible conflict on Proposal A
- [ ] Proposal B deterministic (+$4k · 9 % · full scope)
- [ ] Comparison, approval, commit and reset all work

**WebMCP**
- [ ] Live URL opens and registers tools in ChatGPT's in-app browser
- [ ] Live URL opens and registers tools in Chrome 149+ with the testing flag
- [ ] `document.modelContext.getTools()` lists the phase's capabilities
- [ ] `commit_proposal` absent from `getTools()` before approval, present after
- [ ] `Origin-Agent-Cluster: ?1` present on the deployed response headers
- [ ] Handler guardrails verified independently of registration
- [ ] Tool schemas valid

**UX**
- [ ] Current versus Proposal never ambiguous
- [ ] Lock affordance obvious on video
- [ ] Capability Inspector readable at recording resolution
- [ ] No raw JSON in the main experience

**Submission**
- [ ] Project URL → `/` · Try-it URL → `/workspace`
- [ ] Public repository — <https://github.com/guelmbaye/mutua>
- [ ] README, architecture doc, WebMCP tool reference, testing instructions
- [ ] Five screenshots with captions
- [ ] Video under three minutes, public on YouTube, audio covering what was built and how WebMCP was used
- [ ] Technologies listed accurately
- [ ] All materials in English
- [ ] `LICENSE` visible in the GitHub About panel
- [ ] Nothing touched after the deadline — not the submission, not the repo, not the live site
