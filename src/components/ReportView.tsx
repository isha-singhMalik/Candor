import type { InterviewRecord } from "@/types";
import { CRITERION_LABELS } from "@/lib/scoring";
import { Meter, panel } from "./ui";

const TYPE_LABEL: Record<string, string> = { hr: "HR", behavioral: "Behavioral", technical: "Technical", role: "Role-specific", resume: "Resume-based", jd: "Job-description-based", situational: "Situational", leadership: "Leadership", communication: "Communication", fresher: "Fresher mix" };

export function ReportView({ rec, name }: { rec: InterviewRecord; name?: string }) {
  const r = rec.report!;
  const totalSec = rec.turns.reduce((a, t) => a + t.seconds, 0);
  return (
    <div className="space-y-8">
      <header className="grid gap-6 border-b border-line pb-8 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm font-semibold text-muted">Candor interview report</p>
          <h1 className="mt-1 text-4xl font-bold">{rec.config.role}</h1>
          <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex gap-2"><dt className="text-muted">Candidate</dt><dd className="font-semibold">{name || "You"}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Type</dt><dd className="font-semibold">{TYPE_LABEL[rec.config.type]}, {rec.config.difficulty}, {rec.config.style} style</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Questions</dt><dd className="font-semibold">{rec.turns.length}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Time answering</dt><dd className="font-semibold">{Math.max(1, Math.round(totalSec / 60))} min</dd></div>
          </dl>
        </div>
        <div className="text-right"><p className="text-sm font-semibold text-muted">Overall</p><p className="font-display text-7xl font-extrabold leading-none"><span className="mark">{r.overall}</span><span className="text-2xl text-muted">/100</span></p></div>
      </header>

      <section className="margin-note px-6 py-6" aria-labelledby="truth">
        <h2 id="truth" className="text-3xl font-bold">What you need to hear</h2>
        <ul className="mt-4 space-y-3 text-lg">{r.brutalTruth.map((t) => <li key={t}>{t}</li>)}</ul>
        {r.strengths.length > 0 && <p className="mt-5 border-t border-signal/20 pt-4 text-[15px]"><b>What is working:</b> {r.strengths.join(" ")}</p>}
      </section>

      <section aria-labelledby="scores">
        <h2 id="scores" className="text-2xl font-bold">Scores and the evidence behind them</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {r.categories.map((c) => (
            <li key={c.key} className={`${panel} p-5`}>
              <div className="flex items-baseline justify-between"><h3 className="text-lg font-bold">{c.label}</h3><p className="font-display text-3xl font-extrabold">{c.score ?? "—"}</p></div>
              <div className="mt-2"><Meter value={c.score} name={c.label} /></div>
              <p className="mt-3 text-sm text-muted">{c.explanation}</p>
              {c.evidence.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{c.evidence.map((e) => <li key={e}>{e}</li>)}</ul>}
            </li>
          ))}
        </ul>
      </section>

      <section className={`${panel} p-6`} aria-labelledby="speech">
        <h2 id="speech" className="text-2xl font-bold">Observable speech signals</h2>
        <p className="mt-1 text-sm text-muted">Measured from your transcript only. Nothing here is inferred from your face, voice tone or appearance.</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[["Average answer", `${r.speech.avgWords} words`], ["Filler words", `${r.speech.totalFillers} (${r.speech.fillerPer100}/100)`], ["Pace", r.speech.wpm ? `~${r.speech.wpm} wpm` : "voice answers only"], ["Most used fillers", r.speech.topFillers.join(", ") || "none detected"]].map(([k, v]) => (
            <div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="font-bold">{v}</dd></div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="qs">
        <h2 id="qs" className="text-2xl font-bold">Question by question</h2>
        <ol className="mt-4 space-y-4">
          {rec.turns.map((t, i) => (
            <li key={i}>
              <details className={`${panel} p-5`}>
                <summary className="cursor-pointer list-none">
                  <span className="flex items-start justify-between gap-4"><span className="font-semibold">{i + 1}. {t.question}</span><span className="shrink-0 font-display text-xl font-extrabold">{t.evaluation.score}</span></span>
                </summary>
                <div className="mt-4 space-y-4 text-[15px]">
                  <p className="border-l-[3px] border-line pl-4 text-muted">{t.answer}</p>
                  <FeedbackBlocks e={t.evaluation} />
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line pt-6 text-sm text-muted">{r.notes.map((n) => <p key={n} className="mt-1">{n}</p>)}</section>

      {rec.plan && (
        <section aria-labelledby="plan" className="no-print-break">
          <h2 id="plan" className="text-3xl font-bold">Your Candor preparation plan</h2>
          <p className="mt-1 text-muted">{rec.plan.title}</p>
          <ol className="mt-5 divide-y divide-line border border-line bg-white">
            {rec.plan.days.map((d) => (
              <li key={d.day} className="grid gap-2 px-5 py-4 md:grid-cols-[7rem_1fr]">
                <div><p className="font-display text-lg font-bold">Day {d.day}</p><p className="text-xs text-muted">{d.minutes} min</p></div>
                <div><p className="font-semibold">{d.focus}</p><ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-muted">{d.tasks.map((x) => <li key={x}>{x}</li>)}</ul></div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function FeedbackBlocks({ e }: { e: InterviewRecord["turns"][number]["evaluation"] }) {
  const rows: [string, string][] = [["Observation", e.feedback.observation], ["Evidence", e.feedback.evidence], ["Why it matters", e.feedback.whyItMatters], ["Recommendation", e.feedback.recommendation], ["Practice", e.feedback.practice]];
  return (
    <div className="space-y-5">
      <dl className="space-y-2">{rows.map(([k, v]) => <div key={k} className="grid gap-1 sm:grid-cols-[9rem_1fr]"><dt className="font-semibold">{k}</dt><dd className="text-muted">{v}</dd></div>)}</dl>
      <div className="margin-note px-4 py-3">
        <p className="font-semibold">What the interviewer was testing</p>
        <p className="text-muted">{e.expectation.testing}</p>
        <p className="mt-2 font-semibold">A strong answer contains</p>
        <ul className="list-disc pl-5 text-muted">{e.expectation.strongAnswerContains.map((x) => <li key={x}>{x}</li>)}</ul>
        {e.expectation.weakened.length > 0 && <><p className="mt-2 font-semibold">What weakened your answer</p><ul className="list-disc pl-5 text-muted">{e.expectation.weakened.map((x) => <li key={x}>{x}</li>)}</ul></>}
        <p className="mt-2 font-semibold">Structure to use</p><p className="text-muted">{e.expectation.structure}</p>
      </div>
      <details><summary className="cursor-pointer text-sm font-semibold text-signal">Criterion scores (0–5)</summary>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">{Object.entries(e.criteria).map(([k, v]) => <li key={k} className="flex justify-between"><span>{CRITERION_LABELS[k] ?? k}</span><b>{v.toFixed(1)}</b></li>)}</ul>
      </details>
    </div>
  );
}
