"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { LoadMeter, Section } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { DerivedPlan, Person, Workspace } from "@/domain/types";
import { cn } from "@/lib/utils";

export function TeamList({
  people,
  plan,
  workspace,
}: {
  people: Person[];
  plan: DerivedPlan;
  workspace: Workspace;
}) {
  const setPersonStatus = useWorkspaceStore((s) => s.setPersonStatus);
  /**
   * Contractors live in the derived plan until a proposal is committed, after
   * which they are canonical. Merge by id so a committed contractor is listed
   * once, not twice.
   */
  const roster = [...people];
  for (const person of plan.people) {
    if (person.contractor && !roster.some((existing) => existing.id === person.id)) {
      roster.push(person);
    }
  }

  return (
    <Section title="Team">
      <ul className="divide-y divide-slate-line/70">
        {roster.map((person) => {
          const load = plan.loads.find((l) => l.personId === person.id);
          const unavailable = person.status === "unavailable";
          const over = (load?.loadPercent ?? 0) > 100 + workspace.maxOverloadPercent;

          return (
            <li key={person.id} className="group flex items-center gap-3 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm", unavailable ? "text-slate line-through" : "text-graphite")}>
                    {person.name}
                    {person.contractor && (
                      <span className="ml-1.5 text-meta uppercase tracking-wider text-accent">contract</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "tabular shrink-0 text-xs",
                      unavailable ? "text-slate" : over ? "font-semibold text-danger" : "text-graphite-600",
                    )}
                  >
                    {unavailable ? "Unavailable" : `${load?.loadPercent ?? 0}%`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-20 shrink-0 text-meta text-slate">{person.role}</span>
                  {!unavailable && <LoadMeter value={load?.loadPercent ?? 0} limit={100} />}
                </div>
              </div>

              {!person.contractor && (
                <button
                  type="button"
                  onClick={() => setPersonStatus(person.id, unavailable ? "available" : "unavailable", "human")}
                  className="shrink-0 rounded p-1 text-slate opacity-0 transition-opacity hover:bg-slate-faint hover:text-graphite focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={unavailable ? `Mark ${person.name} available` : `Mark ${person.name} unavailable`}
                  title={unavailable ? "Mark available" : "Mark unavailable"}
                >
                  {unavailable ? <UserPlus className="h-3.5 w-3.5" /> : <UserMinus className="h-3.5 w-3.5" />}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
