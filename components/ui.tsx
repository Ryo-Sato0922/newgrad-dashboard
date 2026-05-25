import { clsx, type ClassValue } from "clsx";
import type React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-lg border border-line bg-white p-4 shadow-soft", className)}>{children}</section>;
}

export function MetricCard({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "text-ink",
    good: "text-success",
    warn: "text-warning",
    bad: "text-danger"
  };

  return (
    <Card className="relative min-h-[116px] overflow-hidden transition hover:-translate-y-0.5 hover:border-yellow-300 hover:shadow-soft">
      <div className="absolute left-0 top-0 h-full w-1 bg-accent" />
      <div className="pl-2">
        <div className="text-xs font-semibold text-muted">{label}</div>
        <div className={cn("mt-2 text-2xl font-semibold tracking-normal", tones[tone])}>{value}</div>
        {sub ? <div className="mt-1 text-xs leading-5 text-muted">{sub}</div> : null}
      </div>
    </Card>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 inline-flex h-1 w-12 rounded-full bg-accent" />
        <h2 className="text-xl font-semibold tracking-normal text-ink">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>{children}</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-amber-100", className)}>
      <div className="h-full rounded-full bg-accent-strong" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
