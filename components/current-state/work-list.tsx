"use client";

import { Lock, Unlock } from "lucide-react";
import { Badge, Section } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { DerivedPlan, Task } from "@/domain/types";
import { cn } from "@/lib/utils";

const CRITICALITY_TONE = {
  critical: "danger",
  important: "warning",
  optional: "neutral",
} as const;

export function WorkList({ tasks, plan }: { tasks: Task[]; plan: DerivedPlan }) {
  const lockEntity = useWorkspaceStore((s) => s.lockEntity);
  const unlockEntity = useWorkspaceStore((s) => s.unlockEntity);

  const visible = tasks.filter((t) => !t.parentTaskId);

  return (
    <Section title="Launch work">
      <ul className="divide-y divide-slate-line/70">
        {visible.map((task) => {
          const owner = plan.people.find((p) => p.id === plan.effectiveOwner[task.id]);
          const out = !task.inLaunchScope || task.deferred;

          return (
            <li key={task.id} className="group flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-sm",
                      out ? "text-slate line-through" : "text-graphite",
                      task.locked && "font-medium",
                    )}
                  >
                    {task.name}
                  </span>
                  {task.locked && <Lock className="h-3 w-3 shrink-0 text-graphite" aria-label="Locked" />}
                </div>
                <div className="text-meta text-slate">
                  {owner ? owner.name : "Unassigned"} · {task.effort} pts
                  {task.deferred && " · after launch"}
                </div>
              </div>

              <Badge tone={CRITICALITY_TONE[task.criticality]}>{task.criticality}</Badge>

              <button
                type="button"
                onClick={() =>
                  task.locked
                    ? unlockEntity(task.id, "human")
                    : lockEntity(
                        { entityType: "task", entityId: task.id, reason: "Must stay in the launch" },
                        "human",
                      )
                }
                className={cn(
                  "shrink-0 rounded p-1 transition-opacity",
                  task.locked
                    ? "text-graphite opacity-100 hover:bg-slate-faint"
                    : "text-slate opacity-0 hover:bg-slate-faint hover:text-graphite focus-visible:opacity-100 group-hover:opacity-100",
                )}
                aria-label={task.locked ? `Unlock ${task.name}` : `Lock ${task.name} in launch scope`}
                title={task.locked ? "Unlock" : "Lock in launch scope"}
              >
                {task.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
