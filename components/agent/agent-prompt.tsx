"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { runAgentTurn } from "@/agent/local-agent";
import { cn } from "@/lib/utils";

/**
 * Compact by design. MUTUA is a workspace with an agent, not an agent with a
 * workspace — outcomes land in the plan, not in a chat log.
 */
export function AgentPrompt() {
  const phase = useWorkspaceStore((s) => s.phase);
  const agentActivity = useWorkspaceStore((s) => s.agentActivity);
  const scenarios = useWorkspaceStore((s) => s.scenarios);
  const [value, setValue] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const approvedName = scenarios.find((s) => s.status === "approved")?.name;
  const suggestions = suggestionsFor(
    phase,
    scenarios.some((s) => s.status === "conflicted"),
    approvedName,
  );

  async function submit(prompt: string) {
    if (!prompt.trim() || agentActivity.busy) return;
    setValue("");
    setReply(null);
    const turn = await runAgentTurn(prompt);
    setReply(turn.message);
  }

  return (
    <div className="space-y-2">
      {(agentActivity.busy || reply) && (
        <div
          className={cn(
            "flex items-start gap-2 rounded border px-3 py-2 text-sm",
            agentActivity.busy ? "border-accent-line bg-accent-soft text-accent" : "border-slate-line bg-white text-graphite-600",
          )}
          aria-live="polite"
        >
          {agentActivity.busy && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
          <span>{agentActivity.busy ? agentActivity.message : reply}</span>
        </div>
      )}

      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(value);
        }}
        className="flex items-center gap-2 rounded border border-slate-line bg-white px-3 py-2 focus-within:border-graphite-600"
      >
        <label htmlFor="agent-prompt" className="text-eyebrow font-semibold uppercase text-slate">
          Ask MUTUA
        </label>
        <input
          id="agent-prompt"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={agentActivity.busy}
          placeholder="Keep the September launch without increasing burnout"
          className="min-w-0 flex-1 bg-transparent text-sm text-graphite outline-none placeholder:text-slate/70"
        />
        <button
          type="submit"
          disabled={agentActivity.busy || !value.trim()}
          className="shrink-0 rounded bg-graphite p-1.5 text-soft transition-colors hover:bg-graphite-800 disabled:bg-slate-line disabled:text-slate"
          aria-label="Send to the agent"
        >
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </form>

      {suggestions.length > 0 && !agentActivity.busy && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void submit(suggestion)}
              className="rounded-full border border-slate-line bg-white px-2.5 py-1 text-xs text-graphite-600 transition-colors hover:border-graphite-600 hover:text-graphite"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function suggestionsFor(phase: string, hasConflict: boolean, approvedName?: string): string[] {
  // Once a plan is committed the story is over; a chip here would invite a
  // recovery for a problem that no longer exists.
  if (phase === "committed") return [];
  if (phase === "current") {
    return hasConflict
      ? ["Keep Analytics and find another option"]
      : ["Keep the September launch without increasing burnout"];
  }
  if (phase === "simulated") return ["Compare them"];
  if (phase === "approved") return [`Use ${approvedName ?? "it"}`];
  return [];
}
