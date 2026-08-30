# Testing instructions

Everything below is in English, including all product copy, source comments and
documentation.

## Requirements

- Node.js 20 or later
- npm 10 or later
- A Chromium-based browser

No account, no API key, no environment variable, no backend. The golden path
runs entirely in the browser.

## 1. Run the app

```bash
npm install
npm run dev
```

Open <http://localhost:3000/workspace>. The baseline loads immediately — no
setup wizard, no login, no seeded network request.

<http://localhost:3000> is the landing page: the argument behind the product,
plus an interactive miniature of the capability unlock. **Launch demo** reaches
the workspace in one click.

For the production build:

```bash
npm run build
npm run start
```

## 2. Automated checks

```bash
npm run typecheck   # TypeScript, no emit
npm run lint        # ESLint (next/core-web-vitals)
npm run test        # Vitest — 37 tests
```

`npm run test` is the fastest way to verify the claims in this submission
without touching the interface. It covers:

| File | What it proves |
|---|---|
| `tests/calibration.test.ts` | The demo metrics are computed, not written down |
| `tests/simulation.test.ts` | The simulation is deterministic; a lock changes which recovery policy is viable |
| `tests/proposal.test.ts` | A proposal never mutates canonical state; locked entities reject mutation |
| `tests/capability.test.ts` | The registry really registers and unregisters; an unregistered tool refuses the call |
| `tests/golden-flow.test.ts` | The complete demo, human actions through the store and agent actions through the WebMCP registry |
| `tests/webmcp-host.test.ts` | MUTUA against a host implementing only what the WebMCP specification promises |

`tests/golden-flow.test.ts` is the one to read. It runs the whole submission in
about sixty milliseconds and asserts the exact final numbers.

## 3. Reproduce the golden path by hand

Takes about ninety seconds. **Reset demo** in the header returns to step 0 at any
point.

| # | Action | Expected result |
|---|---|---|
| 0 | Open `/workspace` | September 30 launch, 5 engineers, $420k, 15 % overload ceiling. Peak load 95 %, no risk. |
| 1 | Hover Maya's row in **Current State**, click **Mark unavailable** | Team 4/5. Peak load 134 %, overload **34 %**. Risk alert appears. Launch slips 2 working days. |
| 2 | Send *Keep the September launch without increasing burnout* | **Proposal A** appears: on time, **+$12,000**, **4 %** overload, Analytics deferred. The Current State panel is unchanged — this is a proposal, not a mutation. |
| 3 | Click the lock icon next to **Analytics dashboard** | A lock constraint appears in the left panel. Proposal A is flagged **Conflict**, becomes read-only, and stays available for comparison. The phase returns to `current`. |
| 4 | Send *Keep Analytics and find another option* | **Proposal B**: on time, **+$4,000**, **9 %** overload, **no scope loss**, badge "All human locks respected". |
| 5 | Send *Compare them* | The comparison table opens with Current / Proposal A / Proposal B. Proposal B is marked "Best on the numbers". Proposal A shows a lock conflict. |
| 6 | Look at the **Agent Capabilities** panel | `commit_proposal` sits under **Context locked**, with the reason "Requires your explicit approval". |
| 7 | Click **Approve Proposal B** | `commit_proposal` animates into **Available now**. This is the point of the whole submission. |
| 8 | Send *Use B* | The plan updates: launch September 30, overload 9 %, budget $424,000, Analytics preserved. The risk alert disappears. |
| 9 | Read the **Activity** strip | Every step is attributed to `human`, `agent` or `system`, in order. |

## 4. Verify the WebMCP layer directly

Append `?debug=1` to the URL for a live call log showing every tool invocation,
its outcome, the current phase, and both version counters.

Or drive the registry from the browser console:

```js
await __MUTUA__.call("get_workspace_state");
__MUTUA__.registry.getRegisteredTools();   // the live registry, not a map
__MUTUA__.registry.getLog();
```

Two checks worth running by hand:

```js
// Before approval — the capability is not registered
__MUTUA__.registry.getRegisteredTools().includes("commit_proposal");  // false
await __MUTUA__.call("commit_proposal");   // { ok: false, error: { code: "TOOL_NOT_AVAILABLE" } }

// After clicking Approve
__MUTUA__.registry.getRegisteredTools().includes("commit_proposal");  // true
```

Hiding the tool is guidance. The handler enforces the rule independently: it
re-validates approval, simulation freshness, state version and hard constraints,
so an agent that calls it out of turn is refused rather than obeyed.

## 5. With a real WebMCP agent

MUTUA registers its tools on `document.modelContext`, the WebMCP imperative API.
The header reads **Agent · WebMCP host** when a host is present and **Agent ·
Built-in** otherwise.

**ChatGPT's in-app browser** supports WebMCP out of the box — open the live URL
there and ask the agent to keep the September launch without increasing burnout.

**Google Chrome 149 or later**: set `chrome://flags/#enable-webmcp-testing` to
**Enabled** and relaunch. The
[Model Context Tool Inspector extension](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd)
lists the registered tools and calls them by hand, which is the fastest way to
watch the surface change: open it, then lock Analytics or approve a proposal and
re-read the list.

From the console, using the standard API rather than anything MUTUA-specific:

```js
(await document.modelContext.getTools()).map(t => t.name);

const tools = await document.modelContext.getTools();
const read = tools.find(t => t.name === "get_workspace_state");
JSON.parse(await document.modelContext.executeTool(read, "{}"));
```

Before approval, `commit_proposal` is absent from that list. After you click
**Approve**, it is there. That is the whole submission in two console lines.

The built-in agent exists only so the demo runs in any browser. It has no
privileges: it reaches the workspace exclusively through `registry.call`, so an
unregistered capability refuses it exactly like an external agent.

`tests/webmcp-host.test.ts` runs the same checks against a host that implements
only what the specification promises — registration, AbortSignal removal, and a
string-returning `execute`.

## 6. Known scope limits

- Desktop only. Target 1440 × 900, minimum 1280 × 720. Below `lg` the side
  panels collapse; mobile is explicitly out of scope.
- WebMCP requires an origin-isolated document. The app sends
  `Origin-Agent-Cluster: ?1` in production and in local `next start`, so tools
  register in both.
- One workspace, one scenario, three simultaneous plans (Current, Proposal A,
  Proposal B) — deliberately, per the product scope.
- State persists in LocalStorage under `mutua.workspace.v1`. **Reset demo**
  clears it.
