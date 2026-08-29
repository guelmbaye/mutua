"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Badge } from "@/components/ui/primitives";
import type { Actor } from "@/domain/types";

const ACTOR_TONE: Record<Actor, "solid" | "accent" | "neutral"> = {
  human: "solid",
  agent: "accent",
  system: "neutral",
};

export function ActivityTimeline() {
  const activity = useWorkspaceStore((s) => s.activity);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: "smooth" });
  }, [activity.length]);

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 border-t border-slate-line bg-white px-5">
      <h2 className="shrink-0 text-eyebrow font-semibold uppercase text-slate">Activity</h2>
      <div ref={scroller} className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto scroll-quiet">
        {activity.length === 0 && (
          <span className="text-meta text-slate">
            Every human and agent action lands here, in order, with its author.
          </span>
        )}
        {activity.map((event) => (
          <div
            key={event.id}
            className="flex shrink-0 animate-row-in items-center gap-2 rounded border border-slate-line/80 px-2 py-1"
          >
            <span className="tabular text-meta text-slate">{formatTime(event.at)}</span>
            <Badge tone={ACTOR_TONE[event.actor]}>{event.actor}</Badge>
            <span className="whitespace-nowrap text-xs text-graphite">{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
