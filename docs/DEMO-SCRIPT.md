# Three-minute demo script

English narration throughout. Target runtime **2:45**, hard ceiling 3:00.

Record at 1440 × 900 or 1920 × 1080. Keep the Decision Workspace, the Current
State panel and the Capability Inspector visible in the same frame — the
inspector must never be cropped out of the approval moment.

Open the browser directly on `/workspace`, not on the landing page. The
application appears within the first five seconds — no title card, no face
intro, no slides, no source-code walkthrough.

---

## 0:00 – 0:12 · Hook

**On screen** — the full workspace at rest.

> Most AI products give us two choices. An agent that tells us what to do, or one
> that acts for us. MUTUA explores a third: an agent that works with us, inside
> the application itself.

---

## 0:12 – 0:30 · Shared state

**On screen** — cursor moves across the left panel: September 30, five engineers,
$420,000, a fifteen percent overload ceiling. Then mark Maya unavailable.

**Result** — team 4 of 5, overload jumps to 34 %, the risk alert appears.

> This team is four weeks from launch. Maya, our QA engineer, becomes
> unavailable. I changed that directly in the interface — and through WebMCP, the
> agent now sees exactly the same reality I do.

---

## 0:30 – 0:58 · The agent proposes

**Type** — *Keep the September launch without increasing burnout.*

**On screen** — brief activity indicators, then Proposal A: on time, +$12,000,
4 % overload, Analytics deferred. Scroll the operation diff once.

> The agent doesn't edit my plan. It creates a proposal. Then MUTUA simulates the
> consequences — deterministically, in the application, not in the model.

*Pause on the left panel for a beat so the viewer sees it hasn't moved.*

---

## 0:58 – 1:20 · The human changes reality

**On screen** — click the lock icon next to Analytics dashboard.

**Result** — a lock constraint appears on the left; Proposal A is flagged
**Conflict**; the Capability Inspector refreshes.

> But Analytics is a commitment I want to keep. I lock it. That becomes part of
> our shared state immediately — so the agent can't trade it away, and the plan it
> already built is flagged rather than quietly rewritten.

---

## 1:20 – 1:45 · The agent adapts

**Type** — *Keep Analytics and find another option.*

**On screen** — Proposal B: on time, +$4,000, 9 % overload, scope unchanged, badge
"All human locks respected".

> It solves the same problem under my constraint instead of overriding it — and
> it gets there a different way: deferring work that was never a launch
> commitment, rebalancing QA, and buying four days of outside capacity.

---

## 1:45 – 2:03 · Compare

**Type** — *Compare them.*

**On screen** — the comparison table. Let it sit.

> Now we're not arguing about text an AI wrote. We're comparing structured
> alternatives, using consequences the application calculated.

*Point at the row: Proposal B, eight thousand dollars cheaper, no scope loss.*

---

## 2:03 – 2:28 · The WebMCP moment

**On screen** — move the cursor to the Capability Inspector. Hold on
`commit_proposal` under **Context locked**, reason visible.

> Here's the part that matters. Right now, the agent does not have the capability
> to commit this. It isn't hidden in the UI — it isn't registered.

**Click** — Approve Proposal B.

**On screen** — `commit_proposal` animates into **Available now**.

> My approval changed the application state, and that changed what WebMCP
> exposes.

*Pause for a full beat. This is the frame the submission is built around.*

---

## 2:28 – 2:44 · Commit

**Type** — *Use B.*

**On screen** — the plan updates: September 30, 9 % overload, $424,000, Analytics
preserved. The risk alert clears. The timeline fills.

> Only now can the agent commit. The approved proposal becomes the canonical
> plan, and every step — mine and its — stays in the timeline with its author.

---

## 2:44 – 2:58 · Close

**On screen** — the full application, then the closing card.

> MUTUA turns WebMCP tools into something more than actions. They become
> contextual capabilities inside a shared human-agent workflow.

**Card**

> **MUTUA**
> Think together. Change safely. Commit deliberately.

> The agentic web isn't just agents using websites for us. It's humans and agents
> operating applications together.

---

## Recording notes

- Run **Reset demo** immediately before recording, and rehearse the full sequence
  several times against the production build in a fresh browser profile.
- Use the suggestion chips rather than typing live — they carry the exact
  prompts and remove the risk of a typo on camera.
- Do not narrate tool names in the main flow. The Capability Inspector shows
  them; saying them aloud makes the demo sound like a walkthrough.
- Do not show `?debug=1` in the video. Keep it as backup evidence if a judge asks.
- If something desyncs mid-take, reset and start over rather than recovering on
  camera. The sequence is ninety seconds.

## What not to demo

Authentication, settings, workspace creation, editing names, generic CRUD,
installation, architecture diagrams, verbose agent conversation, secondary use
cases. Show behaviour, not breadth.
