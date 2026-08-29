# Judge Q&A

Every answer comes back to one of four things: WebMCP is central rather than
decorative; application state governs capability; the human keeps explicit
authority; the pattern generalises past the demo domain.

Do not over-explain implementation unless asked.

---

**Isn't this just AI project management?**

No — project planning is the demonstration environment, not the product. The
contribution is the interaction model: humans and agents operating over one
application state, with the agent's available capabilities determined by workflow
context and human authorisation. The same architecture fits incident response,
procurement, financial planning, compliance and infrastructure operations.

**Why do you actually need WebMCP?**

Because the behaviour depends on the page exposing semantic capabilities tied to
its current state. The agent isn't scraping buttons or reaching a backend
disconnected from what I'm looking at. WebMCP lets the application say *these are
the actions that make sense right now* — and when I approve a proposal, the state
changes and the commit capability appears.

**Couldn't this just be MCP on a backend?**

A backend server could expose project operations, but it wouldn't naturally
represent the user's current page and interaction state. MUTUA is exploring the
website as the collaboration boundary: I edit the interface, that immediately
changes the state the agent sees, and the page updates its capability surface
accordingly.

**Why not let the agent commit automatically?**

Because exploration should be cheap and reversible while commitment should be
deliberate. We separate propose, simulate and compare from commit. Human approval
is a state transition, and only after it does commit exist.

**Isn't dynamic tool registration a gimmick?**

It would be if it were only visual. Here it encodes real workflow semantics: a
proposal can't be compared before it's simulated, or committed before it's
approved. The surface matches the operations that are legal in the current state,
which reduces ambiguous agent behaviour and gives the capability list product
meaning.

**What if the agent calls commit anyway?**

Two layers. It isn't registered, so the call is refused at the registry. And the
handler independently re-validates approval, simulation freshness, state version
and hard constraints — there's a test that calls it directly, bypassing the
registry, and asserts the refusal. Registration is guidance; validation is
enforcement.

**How do you prevent stale agent state?**

The interface and the WebMCP tools use one store. Every material mutation
increments a state version returned in every tool result, and tools accept an
optional expected version. Plan-changing mutations also bump a separate plan
version that simulation freshness is checked against, so an outdated simulation
is marked stale and has to be re-run. There is no long-lived AI copy of the
workspace.

**Does the AI calculate the simulation?**

No. The agent proposes structured operations. The application computes deadline
impact, workload, budget, scope and constraint satisfaction as pure functions.
That's what makes the outcomes reproducible and auditable — the tests assert the
exact numbers you saw in the video.

**How much of this is hard-coded?**

The dataset is fixed, deliberately. The behaviour isn't. The tools genuinely
mutate proposal state, locks genuinely block operations, simulations run through
the engine, and capabilities genuinely register and unregister.

The sharpest example is the planner. It runs two policies with different
trade-offs — one spends more and drops a feature to keep tasks whole, one
preserves scope by fragmenting work and buying minimum outside capacity. Which
policy applies is read from the workspace: once every non-critical launch
commitment is locked, the first has nothing left to give. The lock doesn't filter
operations, it changes which recovery is possible at all.

**Why only one use case?**

Because the prototype is proving an interaction primitive, not building a
platform. One workflow implemented deeply demonstrates WebMCP better than several
shallow integrations. The proposal, constraint, capability and commit model is
domain-general on purpose.

**What happens if the human changes something mid-task?**

That's a first-class event, not an edge case. The shared state updates, existing
simulations go stale, proposals that now break a lock are flagged, the capability
surface is recalculated, and the agent continues from the new state. The system
is designed for people to interrupt and redirect.

**Can the human edit a proposal directly?**

The architecture supports it — proposals are structured state, not generated
prose. For this prototype we kept manual editing minimal and focused on locks and
approval, which are the transitions that carry the argument.

**Why does the Capability Inspector matter?**

Dynamic availability is invisible by nature. The inspector makes the contract
between application and agent something you can watch change: what the agent can
do, what it can't, and what would unlock it. It renders the live registry, not
the capability map, so the interface and the agent can't disagree.

**Who would use this?**

Anyone making consequential decisions with an agent where trade-offs matter and
silent mutation is unacceptable — engineering leads, incident commanders,
procurement, infrastructure, finance, compliance. We chose launch recovery
because it's legible in seconds.

**What's the most important innovation?**

Application state governs agent capability. The agent doesn't just operate on
shared state; that state determines what it's allowed to do next. Tools stop
being a static integration surface and become part of the interaction model.

**What did WebMCP enable that was difficult before?**

A structured way for a page to expose semantic capabilities to an agent while
staying grounded in the user's active context. That's what let us build a loop
where a human change is immediately visible to the agent, the capability surface
adapts, and a new capability appears on approval — without brittle DOM automation
or an agent working from a separate model of the application.

**How is this different from function calling?**

Function calling gives a model callable operations. The question here is which
operations should exist for the agent right now. WebMCP ties that answer to the
current web application and its interaction state. The novelty isn't callable
functions; it's the page's state shaping the capability surface.

**Could this become a general framework?**

Yes — shared state, proposal state, constraint engine, dynamic capability
registry, human authorisation, commit lifecycle and audit are all reusable, with
domain objects and simulation logic swapped per application. We deliberately
didn't turn a hackathon prototype into a framework project.

**What's the biggest risk?**

Over-automation. If agents get unrestricted capabilities, the collaboration model
loses its value. That's why capability boundaries and human authority are visible
parts of the interface rather than implementation details.

**Why should this win?**

Because MUTUA doesn't use WebMCP to make an existing AI app agent-compatible. The
product is designed around what WebMCP makes possible: shared application
context, semantic page capabilities, dynamic exposure, and human-agent
collaboration inside the same interface. It's a candidate interaction pattern for
the agentic web, not a domain feature.
