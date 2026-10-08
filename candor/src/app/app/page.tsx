"use client";
import Link from "next/link";
import { useMemo } from "react";
import type { InterviewRecord, Profile } from "@/types";
import { clearAllCandorData, KEYS, usePersisted } from "@/lib/storage/local";
import { CRITERION_LABELS } from "@/lib/scoring";
import { DRILLS } from "@/lib/interview/plan";
import { LineChart } from "@/components/charts";
import { Notice, Skeleton, btnPrimary, btnQuiet, btnSecondary, panel } from "@/components/ui";

interface StoredResume { text: string; jdText?: string; role: string; overall: number; sample?: boolean }

const SAMPLE_HISTORY = (): InterviewRecord[] => {
  const base = { report: null, turns: [], sample: true, config: { role: "Software Engineer", experience: "fresher", difficulty: "intermediate", style: "professional", minutes: 15, type: "fresher", source: "resume" } as InterviewRecord["config"] };
  return [[61, 58, 52, 60], [68, 66, 60, 66], [74, 73, 66, 71]].map(([o, c, t, r], i) => ({
    ...base, id: `sample-${i}`, date: new Date(Date.now() - (3 - i) * 4 * 86400000).toISOString(),
    summary: { overall: o, communication: c, technical: t, roleAlignment: r },
  }));
};

function streak(history: InterviewRecord[]) {
  const days = new Set(history.filter((h) => !h.sample).map((h) => new Date(h.date).toDateString()));
  let n = 0; const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export default function Dashboard() {
  const [profile, , r1] = usePersisted<Profile | null>(KEYS.profile, null);
  const [resume, , r2] = usePersisted<StoredResume | null>(KEYS.resume, null);
  const [history, setHistory, r3] = usePersisted<InterviewRecord[]>(KEYS.history, []);
  const ready = r1 && r2 && r3;

  const ordered = useMemo(() => [...history].sort((a, b) => a.date.localeCompare(b.date)), [history]);
  const latest = ordered[ordered.length - 1];
  const real = ordered.filter((h) => !h.sample && h.report);
  const weak = real[real.length - 1]?.report?.weakAreas ?? [];

  if (!ready) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const tiles: [string, string, string][] = [
    ["Resume readiness", resume ? `${resume.overall}` : "—", resume ? "of 100, estimated" : "Analyze your resume"],
    ["Latest interview", latest ? `${latest.summary.overall}` : "—", latest ? (latest.sample ? "sample data" : "of 100") : "Take your first one"],
    ["Communication", latest?.summary.communication != null ? `${latest.summary.communication}` : "—", "latest interview"],
    ["Technical", latest?.summary.technical != null ? `${latest.summary.technical}` : "—", latest?.summary.technical == null ? "not assessed yet" : "latest interview"],
    ["Role alignment", latest?.summary.roleAlignment != null ? `${latest.summary.roleAlignment}` : "—", "latest interview"],
    ["Practice streak", `${streak(history)}`, "days in a row"],
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">{profile?.name ? `${profile.name.split(" ")[0]}, here is where you stand` : "Where you stand"}</h1>
          <p className="mt-2 text-muted">{profile?.targetRole ? `Preparing for ${profile.targetRole}.` : "Set a target role in your profile so questions fit your goal."}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/resume" className={btnSecondary}>Analyze resume</Link>
          <Link href="/app/interview" className={btnPrimary}>Start interview</Link>
        </div>
      </div>

      <section aria-label="Overview" className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([t, v, s]) => (
          <div key={t} className="bg-white p-4">
            <p className="text-sm font-semibold text-muted">{t}</p>
            <p className="mt-1 font-display text-4xl font-extrabold">{v}</p>
            <p className="mt-0.5 text-xs text-muted">{s}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className={`${panel} p-6`}>
          <h2 className="text-2xl font-bold">Progress</h2>
          {ordered.length === 0 ? (
            <div className="mt-4 space-y-4">
              <Notice>No interviews yet. Complete one and your scores will appear here. Candor never fills this chart with made-up data.</Notice>
              <button className={btnQuiet} onClick={() => setHistory(SAMPLE_HISTORY())}>Preview with sample data</button>
            </div>
          ) : (
            <>
              {ordered.some((h) => h.sample) && <div className="mt-3"><Notice kind="warn">Sample data. These three interviews are not real.</Notice></div>}
              <div className="mt-4"><LineChart label="Overall interview score over time" points={ordered.map((h, i) => ({ label: `Interview ${i + 1}`, value: h.summary.overall }))} /></div>
            </>
          )}
        </section>

        <section className={`${panel} p-6`}>
          <h2 className="text-2xl font-bold">Weakest areas</h2>
          {weak.length === 0 ? <p className="mt-3 text-muted">Finish a real interview to see which criteria need work first.</p> : (
            <>
              <ol className="mt-3 space-y-1">{weak.map((k, i) => <li key={k} className="font-semibold">{i + 1}. {CRITERION_LABELS[k] ?? k}</li>)}</ol>
              <h3 className="mt-6 text-lg font-bold">Recommended practice</h3>
              <ul className="mt-2 space-y-2 text-[15px] text-muted">{weak.slice(0, 2).map((k) => <li key={k}>{DRILLS[k]}</li>)}</ul>
            </>
          )}
        </section>
      </div>

      <section className={`${panel} p-6`}>
        <h2 className="text-2xl font-bold">Recent interviews</h2>
        {ordered.length === 0 ? <p className="mt-3 text-muted">Nothing here yet.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead><tr className="border-b border-line text-muted"><th className="py-2 pr-4 font-semibold">Date</th><th className="pr-4 font-semibold">Role</th><th className="pr-4 font-semibold">Score</th><th className="pr-4 font-semibold">Change</th><th className="sr-only">Report</th></tr></thead>
              <tbody>
                {[...ordered].reverse().map((h) => {
                  const prev = ordered[ordered.indexOf(h) - 1];
                  const d = prev ? h.summary.overall - prev.summary.overall : null;
                  return (
                    <tr key={h.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-4">{new Date(h.date).toLocaleDateString()}{h.sample && <span className="ml-2 rounded-full bg-mark/50 px-2 py-0.5 text-xs font-semibold">sample</span>}</td>
                      <td className="pr-4">{h.config.role}</td>
                      <td className="pr-4 font-bold">{h.summary.overall}</td>
                      <td className={`pr-4 font-semibold ${d == null ? "text-muted" : d >= 0 ? "text-good" : "text-bad"}`}>{d == null ? "first" : `${d >= 0 ? "+" : ""}${d}`}</td>
                      <td>{h.report ? <Link href={`/app/reports/${h.id}`} className="font-semibold text-signal underline underline-offset-4">View report</Link> : <span className="text-muted">scores only</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-muted">
        <p>Everything on this page is stored only in this browser.</p>
        <button className="font-semibold text-bad underline underline-offset-4" onClick={() => { if (confirm("Delete your profile, resume, interviews and reports from this browser?")) { clearAllCandorData(); location.reload(); } }}>Delete all my data</button>
      </div>
    </div>
  );
}
