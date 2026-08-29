import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Band({
  number,
  eyebrow,
  children,
  className,
}: {
  number: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-slate-line", className)}>
      <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <p className="mb-8 flex items-baseline gap-3 font-mono text-eyebrow uppercase tracking-[0.09em] text-slate">
          <span className="text-slate/60">{number}</span>
          {eyebrow}
        </p>
        {children}
      </div>
    </section>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <h2 className="max-w-3xl text-balance text-2xl font-semibold leading-[1.2] tracking-tight text-graphite sm:text-3xl">
      {children}
    </h2>
  );
}

export function CTA({
  href,
  variant = "solid",
  children,
  external,
}: {
  href: string;
  variant?: "solid" | "outline";
  children: ReactNode;
  external?: boolean;
}) {
  const className = cn(
    "inline-flex items-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition-colors",
    variant === "solid"
      ? "bg-graphite text-soft hover:bg-graphite-800"
      : "border border-slate-line bg-white text-graphite hover:border-graphite-600",
  );

  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Three interaction models, drawn small. The third one is the product. */
export function ModelCard({
  label,
  rows,
  body,
  accent,
}: {
  label: string;
  rows: string[];
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded border p-5",
        accent ? "border-accent-line bg-accent-soft/40" : "border-slate-line bg-white",
      )}
    >
      <h3
        className={cn(
          "font-mono text-eyebrow uppercase tracking-[0.09em]",
          accent ? "text-accent" : "text-slate",
        )}
      >
        {label}
      </h3>
      <pre
        className={cn(
          "mt-4 whitespace-pre font-mono text-[11px] leading-[1.7]",
          accent ? "text-accent" : "text-slate",
        )}
      >
        {rows.join("\n")}
      </pre>
      <p className="mt-4 text-sm leading-relaxed text-graphite-600">{body}</p>
    </div>
  );
}

export function Primitive({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="border-t border-slate-line pt-4">
      <p className="font-mono text-eyebrow uppercase tracking-[0.09em] text-slate/60">{index}</p>
      <h3 className="mt-2 text-[15px] font-semibold text-graphite">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-graphite-600">{body}</p>
    </div>
  );
}
