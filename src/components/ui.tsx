import Link from "next/link";
import { getAIProvider } from "@/lib/ai";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

const base = "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${base} bg-ink text-white hover:bg-signal`;
export const btnSecondary = `${base} border border-ink text-ink hover:bg-ink hover:text-white`;
export const btnQuiet = `${base} text-signal hover:bg-signal-soft`;
export const panel = "rounded-sm border border-line bg-white";
export const label = "block text-sm font-semibold text-ink";
export const input = "mt-1.5 block w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-signal";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("font-display text-2xl font-extrabold tracking-tight", className)} aria-label="Candor home">
      <span className="relative isolate">
        Candor
        <span aria-hidden className="absolute -bottom-0.5 left-0 right-0 -z-10 h-[6px] bg-mark" />
      </span>
    </Link>
  );
}

/** Server component: tells the user whether they are on the offline rules engine or a connected AI model. */
export function ModeBadge() {
  const p = getAIProvider();
  const demo = p.mode === "demo";
  return (
    <span
      title={demo ? "Rule-based analysis runs on this server with no AI key. Add AI_API_KEY and AI_MODEL to enable model-based evaluation." : `Connected to ${p.name}`}
      className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", demo ? "border-mark bg-mark/40 text-ink" : "border-good/40 bg-good/10 text-good")}
    >
      {demo ? "Demo mode" : "AI mode"}
    </span>
  );
}

export function Meter({ value, max = 100, name }: { value: number | null; max?: number; name: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value ?? undefined} className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "warn"; children: React.ReactNode }) {
  const styles = { info: "margin-note", error: "border-l-[3px] border-bad bg-bad/5", warn: "border-l-[3px] border-mark bg-mark/25" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={cx("px-4 py-3 text-sm", styles)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-sm bg-line/70", className)} />;
}
