import type { ResumeAnalysis } from "@/types";
import { Meter, panel } from "./ui";

const List = ({ title, items, tone }: { title: string; items: string[]; tone?: "good" | "bad" }) =>
  items.length === 0 ? null : (
    <section className={`${panel} p-5`}>
      <h3 className={`text-lg font-bold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{title}</h3>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-[15px] text-muted marker:text-ink/40">{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </section>
  );

const Chips = ({ items, tone }: { items: string[]; tone: "good" | "bad" | "neutral" }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.length === 0 && <li className="text-sm text-muted">None</li>}
    {items.map((s) => <li key={s} className={`rounded-full border px-3 py-1 text-sm font-semibold ${tone === "good" ? "border-good/40 bg-good/10 text-good" : tone === "bad" ? "border-bad/40 bg-bad/5 text-bad" : "border-line bg-paper"}`}>{s}</li>)}
  </ul>
);

export function AnalysisView({ a, sample }: { a: ResumeAnalysis; sample?: boolean }) {
  return (
    <div className="space-y-6">
      {sample && <p className="margin-note px-4 py-3 text-sm">This is a <b>sample resume</b> for demonstration. Upload your own to see your results.</p>}

      <section className={`${panel} grid gap-8 p-6 lg:grid-cols-[auto_1fr]`}>
        <div>
          <p className="text-sm font-semibold text-muted">Resume readiness (estimated)</p>
          <p className="font-display text-7xl font-extrabold leading-none"><span className="mark">{a.overall}</span><span className="text-2xl text-muted">/100</span></p>
        </div>
        <div>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {a.dimensions.map((d) => (
              <li key={d.key}>
                <div className="flex justify-between text-sm font-semibold"><span>{d.label}</span><span>{d.score}/{d.max}</span></div>
                <Meter value={d.score} max={d.max} name={d.label} />
                <p className="mt-1 text-xs text-muted">{d.note}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="border-t border-line pt-4 text-sm text-muted lg:col-span-2"><b className="text-ink">Method.</b> {a.methodology} {a.disclaimer}</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <List title="What is working" items={a.working} tone="good" />
        <List title="What is hurting you" items={a.hurting} tone="bad" />
        <List title="What to remove" items={a.remove} />
        <List title="What is missing" items={a.missing} />
      </div>

      <section className={`${panel} p-5`}>
        <h3 className="text-lg font-bold">Resume structure</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {a.sections.map((s) => (
            <li key={s.name} className="flex items-center gap-2 text-sm"><span aria-hidden className={s.present ? "text-good" : "text-bad"}>{s.present ? "✓" : "✗"}</span><span className="sr-only">{s.present ? "Present: " : "Missing: "}</span>{s.name}</li>
          ))}
        </ul>
      </section>

      {a.rewrite.length > 0 && (
        <section className={`${panel} p-5`}>
          <h3 className="text-lg font-bold">Line-by-line review</h3>
          <p className="mt-1 text-sm text-muted">Candor points you in a direction; the numbers must be yours. It will not invent a result.</p>
          <ul className="mt-4 space-y-5">
            {a.rewrite.map((r) => (
              <li key={r.original} className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
                <p className="border-l-[3px] border-bad bg-bad/5 px-4 py-3 text-[15px]"><span className="mb-1 block text-xs font-semibold text-bad">Original</span>{r.original}</p>
                <div className="margin-note px-4 py-3 text-[15px]"><p><b>Problem.</b> {r.problem}</p><p className="mt-1.5"><b>Direction.</b> {r.direction}</p></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.jd && (
        <section className={`${panel} space-y-5 p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold">Match against the job description</h3>
            {a.jd.coverage != null && <p className="font-semibold">{a.jd.coverage}% of the posting&rsquo;s skills found in your resume</p>}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div><h4 className="font-semibold text-good">Matched skills</h4><Chips items={a.jd.matched} tone="good" /></div>
            <div><h4 className="font-semibold text-bad">Missing skills</h4><Chips items={a.jd.missing} tone="bad" /></div>
          </div>
          {a.jd.related.length > 0 && (
            <div><h4 className="font-semibold">Related skills you may be able to bridge from</h4>
              <ul className="mt-2 space-y-1 text-[15px] text-muted">{a.jd.related.map((r) => <li key={r.skill}><b className="text-ink">{r.skill}</b> is close to your {r.via.join(", ")}.</li>)}</ul></div>
          )}
          {a.jd.gaps.length > 0 && <div><h4 className="font-semibold">Experience gaps</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-muted">{a.jd.gaps.map((g) => <li key={g}>{g}</li>)}</ul></div>}
          {a.jd.suggestions.length > 0 && <div><h4 className="font-semibold">Keyword suggestions</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-muted">{a.jd.suggestions.map((g) => <li key={g}>{g}</li>)}</ul></div>}
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <List title="What recruiters may question" items={a.recruiterQuestions} />
        <List title="Interview questions your resume invites" items={a.interviewQuestions} />
      </div>
    </div>
  );
}
