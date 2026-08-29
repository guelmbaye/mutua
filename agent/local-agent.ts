"use client";

import { registry } from "@/webmcp/registry";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { ToolResult } from "@/webmcp/result";

/**
 * The built-in agent.
 *
 * MUTUA's job is to expose good WebMCP capabilities, not to orchestrate a model.
 * When a judging environment brings its own agent, this file is dead weight and
 * the app still works. It exists so the demo runs anywhere, and it is deliberately
 * held to the same contract as any external agent: it can only reach the
 * workspace through `registry.call`, so an unregistered capability refuses it too.
 */

export type Intent =
  | "recover"
  | "alternative"
  | "compare"
  | "commit"
  | "discard"
  | "lock"
  | "status"
  | "unknown";

export interface AgentTurn {
  intent: Intent;
  message: string;
  calls: { tool: string; result: ToolResult }[];
}

/**
 * Intent patterns. A few French stems are tolerated because the demo may be
 * narrated in French; every string the product renders is English.
 */
const PATTERNS: { intent: Intent; test: RegExp }[] = [
  { intent: "compare", test: /\b(compare|comparison|side by side|compare them|compare a and b|compare[rz]?)\b/i },
  {
    intent: "commit",
    test: /\b(use (it|this|that|proposal [ab]|[ab])\b|commit|make it real|apply (it|the plan)|go with|go ahead|ship it|valide[rz]?)\b/i,
  },
  { intent: "discard", test: /\b(discard|drop it|forget (this|that)|throw (it )?away|abandonne)\b/i },
  {
    intent: "alternative",
    test: /\b(another (option|plan|way)|different (option|plan)|alternative|keep analytics|don'?t cut|without cutting|instead|autre option)\b/i,
  },
  {
    intent: "recover",
    test: /\b(keep .*(launch|deadline)|preserve|recover|without increasing burnout|burnout|fix (the )?plan|save the launch|rattrap)\b/i,
  },
  { intent: "lock", test: /\block\b/i },
  { intent: "status", test: /\b(status|what('s| is) (going on|the situation)|where are we|state)\b/i },
];

export function detectIntent(prompt: string): Intent {
  for (const { intent, test } of PATTERNS) {
    if (test.test(prompt)) return intent;
  }
  return "unknown";
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function store() {
  return useWorkspaceStore.getState();
}

export async function runAgentTurn(prompt: string): Promise<AgentTurn> {
  const intent = detectIntent(prompt);
  const calls: { tool: string; result: ToolResult }[] = [];

  const say = (message: string | null) => store().setAgentActivity(!!message, message);

  const call = async (tool: string, input: unknown = {}) => {
    const result = await registry.call(tool, input);
    calls.push({ tool, result });
    return result;
  };

  try {
    switch (intent) {
      case "recover":
      case "alternative": {
        say("Inspecting the workspace…");
        await call("get_workspace_state");
        await wait(260);

        say("Checking what is actually broken…");
        await call("list_conflicts");
        await wait(260);

        say("Drafting a recovery proposal…");
        const created = await call("create_proposal", {
          objective:
            intent === "alternative"
              ? "Recover the launch without touching anything locked"
              : "Keep the September launch without increasing burnout",
          autoPlan: true,
        });

        if (!created.ok) {
          say(null);
          return {
            intent,
            calls,
            message:
              created.error?.code === "PROPOSAL_ALREADY_ACTIVE"
                ? "There is already an open proposal. Approve it, or discard it and I will start again."
                : (created.error?.message ?? "I could not open a proposal."),
          };
        }

        await wait(260);
        say("Simulating consequences…");
        const simulated = await call("simulate_proposal");
        say(null);

        const data = created.data as { name?: string; strategy?: string; rationale?: string[] };
        const metrics = (simulated.data as { metrics?: { overloadPercent: number; extraCost: number; scopeLoss: number } })?.metrics;

        if (!metrics) {
          return { intent, calls, message: simulated.error?.message ?? "The simulation did not complete." };
        }

        const lead =
          data.strategy === "scope-preserving"
            ? "Everything you can trade away is locked, so this plan keeps full scope and rebalances the QA work instead."
            : "Here is a recovery plan. Nothing has changed in your plan — this is a proposal.";

        return {
          intent,
          calls,
          message: `${lead} ${data.name ?? "The proposal"} lands on time at ${metrics.overloadPercent}% peak overload for ${formatCost(metrics.extraCost)}${metrics.scopeLoss > 0 ? `, with ${metrics.scopeLoss} feature out of scope` : ", with no scope loss"}.`,
        };
      }

      case "compare": {
        say("Comparing scenarios…");
        const result = await call("compare_scenarios");
        say(null);
        if (!result.ok) {
          return {
            intent,
            calls,
            message:
              result.error?.code === "TOOL_NOT_AVAILABLE"
                ? "I can only compare simulated scenarios. Let me simulate first."
                : (result.error?.message ?? "I could not compare those."),
          };
        }
        const data = result.data as { rationale?: string | null };
        return {
          intent,
          calls,
          message: data.rationale ?? "Both plans are on the table with the numbers MUTUA computed.",
        };
      }

      case "commit": {
        say("Committing the approved plan…");
        const result = await call("commit_proposal");
        say(null);
        if (!result.ok) {
          if (result.error?.code === "TOOL_NOT_AVAILABLE" || result.error?.code === "APPROVAL_REQUIRED") {
            return {
              intent,
              calls,
              message:
                "I do not have the capability to commit right now — MUTUA only exposes it once you have approved a proposal.",
            };
          }
          return { intent, calls, message: result.error?.message ?? "Commit was refused." };
        }
        return {
          intent,
          calls,
          message: "Committed. The approved proposal is now your plan, and the whole sequence is in the timeline.",
        };
      }

      case "discard": {
        say("Discarding the proposal…");
        const result = await call("discard_proposal");
        say(null);
        return {
          intent,
          calls,
          message: result.ok
            ? "Discarded. Your plan never changed."
            : (result.error?.message ?? "There was nothing to discard."),
        };
      }

      case "lock": {
        say(null);
        return {
          intent,
          calls,
          message:
            "Locking is yours to do — click the lock next to the item in Current State so the intent is unmistakably yours.",
        };
      }

      case "status": {
        say("Reading the workspace…");
        const result = await call("get_workspace_state");
        say(null);
        const data = result.data as
          | { metrics?: { overloadPercent: number; deadlineMet: boolean }; unavailable?: { name: string }[] }
          | undefined;
        if (!data?.metrics) return { intent, calls, message: "I could not read the workspace." };
        const away = data.unavailable?.map((p) => p.name).join(", ");
        return {
          intent,
          calls,
          message: `Peak overload is ${data.metrics.overloadPercent}% and the launch ${data.metrics.deadlineMet ? "holds" : "is at risk"}${away ? `. ${away} unavailable.` : "."}`,
        };
      }

      default: {
        say(null);
        return {
          intent,
          calls,
          message:
            "I can inspect the plan, draft a recovery proposal, simulate it, compare alternatives, and commit once you approve. Try: “Keep the September launch without increasing burnout.”",
        };
      }
    }
  } finally {
    store().setAgentActivity(false, null);
  }
}

function formatCost(value: number): string {
  if (value === 0) return "no extra spend";
  return `$${Math.round(value / 1000)}k`;
}
