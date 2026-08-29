"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------- section */

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      {(title || action) && (
        <header className="mb-2 flex items-baseline justify-between gap-2">
          {title && <h2 className="text-eyebrow font-semibold uppercase text-slate">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- badge */

const badgeTones = {
  neutral: "bg-slate-faint text-graphite-600 ring-slate-line",
  accent: "bg-accent-soft text-accent ring-accent-line",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/25",
  solid: "bg-graphite text-soft ring-graphite",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- button */

const buttonVariants = {
  primary:
    "bg-graphite text-soft hover:bg-graphite-800 focus-visible:outline-graphite disabled:bg-slate-line disabled:text-slate",
  accent:
    "bg-accent text-white hover:bg-accent/90 focus-visible:outline-accent disabled:bg-accent/30 disabled:text-white/70",
  ghost:
    "bg-transparent text-graphite-600 hover:bg-slate-faint focus-visible:outline-graphite disabled:text-slate/60",
  outline:
    "border border-slate-line bg-white text-graphite hover:border-graphite-600 focus-visible:outline-graphite disabled:text-slate",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: "sm" | "md";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        buttonVariants[variant],
        className,
      )}
    />
  );
}

/* ----------------------------------------------------------------- meter */

export function LoadMeter({
  value,
  limit = 100,
  className,
}: {
  value: number;
  limit?: number;
  className?: string;
}) {
  const width = Math.min(100, (value / Math.max(limit * 1.6, 1)) * 100);
  const tone =
    value > limit + 15 ? "bg-danger" : value > limit ? "bg-warning" : "bg-graphite-600";
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-slate-faint", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", tone)} style={{ width: `${width}%` }} />
    </div>
  );
}

/* ---------------------------------------------------------------- metric */

export function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "danger" | "success" | "accent" | "warning";
}) {
  const toneClass = {
    neutral: "text-graphite",
    danger: "text-danger",
    success: "text-success",
    accent: "text-accent",
    warning: "text-warning",
  }[tone];
  return (
    <div className="min-w-0">
      <div className="text-eyebrow font-semibold uppercase text-slate">{label}</div>
      <div className={cn("mt-0.5 truncate text-[22px] font-semibold leading-tight tracking-tight", toneClass)}>
        {value}
      </div>
      {hint && <div className="text-meta text-slate">{hint}</div>}
    </div>
  );
}
