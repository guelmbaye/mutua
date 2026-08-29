"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-slate-line",
  success: "border-success/40",
  warning: "border-warning/40",
  danger: "border-danger/40",
};

export function ToastHost() {
  const toast = useWorkspaceStore((s) => s.toast);
  const dismiss = useWorkspaceStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, 4200);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-row-in rounded-md border bg-white px-4 py-2.5 shadow-[0_8px_28px_-12px_rgba(23,25,28,0.35)]",
        tones[toast.tone],
      )}
    >
      <div className="text-sm font-medium text-graphite">{toast.title}</div>
      {toast.body && <div className="text-meta text-slate">{toast.body}</div>}
    </div>
  );
}
