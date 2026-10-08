import Link from "next/link";
import { Logo, ModeBadge, btnPrimary, btnSecondary, panel } from "@/components/ui";

const FEEDBACK_STEPS = [
  ["Observation", "Your answer was technically correct but difficult to follow."],
  ["Evidence", "You introduced three concepts before explaining the main decision."],
  ["Why it matters", "Interviewers need to understand your reasoning in the first few sentences."],
  ["Recommendation", "Start with the decision, then give the reasoning and the trade-off."],
  ["Practice", "Answer the same question again in under 90 seconds."],
];

const COVERS = [
  ["Resume and ATS analysis", "Six scored dimensions with a published method. The result is an estimate, never a guarantee, because every employer's system behaves differently."],
  ["Job description matching", "See matched, missing and related skills. Keyword suggestions apply only where your experience genuinely supports them."],
  ["Interviews that follow up", "The next question depends on your last answer and on the claims in your resume, the way a real interviewer probes."],
  ["Voice practice", "Answer out loud with your browser's microphone. Filler words and pace are measured from what you actually said."],
  ["A report that says it plainly", "A short list of what is holding you back, each point tied to evidence from your answers."],
  ["Practice plan and progress", "A seven-day plan built from your weakest criteria, and a record of every interview so you can see what moved."],
];

const WONT = [
  "Invent numbers or achievements for your resume. If you have no result to report, it asks you for the real one.",
  "Read your face, voice or appearance to judge honesty, personality, intelligence or employability.",
  "Claim one universal ATS score. Scores are labelled as estimates.",
  "Make hiring decisions. Candor is preparation, not selection.",
];

function AnnotatedDocument() {
  return (
    <figure className={`${panel} relative p-6 sm:p-8`} aria-label="Example of Candor feedback on a resume">
      <figcaption className="mb-5 text-sm font-semibold text-muted">Resume line review (sample)</figcaption>
      <div className="space-y-7 font-sans text-[15px] leading-relaxed">
        <div>
          <p className="font-semibold">Phishing Detection System</p>
          <p className="mt-1">Built a phishing URL detector in Python that achieved <span className="mark">94% accuracy</span> on a public dataset.</p>
          <p className="settle margin-note mt-3 px-4 py-3 text-sm" style={{ animationDelay: "0.3s" }}>
            <span className="font-semibold">An interviewer will ask:</span> how was 94% measured, what was the false positive rate, and what data did you test on?
          </p>
        </div>
        <div>
          <p><span className="pen">Worked on</span> a web application using React.</p>
          <p className="settle mt-3 border-l-[3px] border-bad bg-bad/5 px-4 py-3 text-sm" style={{ animationDelay: "0.6s" }}>
            <span className="font-semibold">Describes a duty, not an outcome.</span> What changed because of your work? Give the real result. Candor will not make one up.
          </p>
        </div>
      </div>
      <p className="mt-7 border-t border-line pt-4 text-sm text-muted">Estimated resume readiness for this sample: <span className="font-semibold text-ink">a score with six parts you can inspect</span>.</p>
    </figure>
  );
}

export default function Landing() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm font-semibold">
          <a href="#how" className="hidden hover:text-signal sm:inline">How feedback works</a>
          <a href="#principles" className="hidden hover:text-signal sm:inline">What it will not do</a>
          <Link href="/privacy" className="hidden hover:text-signal sm:inline">Privacy</Link>
          <ModeBadge />
          <Link href="/app/resume?demo=1" className={btnPrimary}>Try the demo</Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="text-5xl font-extrabold sm:text-6xl lg:text-[4.25rem]">Prepare for the interview you actually want.</h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Resume and ATS analysis, adaptive mock interviews with voice, and honest feedback that tells you what you need to hear, not what you want to hear.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/app/interview" className={btnPrimary}>Start free interview</Link>
              <Link href="/app/resume" className={btnSecondary}>Analyze my resume</Link>
              <Link href="/app/resume?demo=1" className="px-2 py-2.5 text-sm font-semibold text-signal underline underline-offset-4">Try Candor with a sample resume</Link>
            </div>
            <p className="mt-5 text-sm text-muted">No account needed. Resumes are analysed in memory and not stored on our servers.</p>
          </div>
          <AnnotatedDocument />
        </section>

        <section id="how" className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-4xl font-bold">Every judgement comes with its evidence.</h2>
              <p className="mt-4 max-w-md text-muted">Feedback like &ldquo;good answer&rdquo; teaches nothing. Candor works through the same five steps on every answer, so you know what to change and how to practise it.</p>
            </div>
            <ol className="divide-y divide-line border border-line">
              {FEEDBACK_STEPS.map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[2.25rem_1fr] gap-3 px-5 py-4">
                  <span className="font-display text-xl font-bold text-signal" aria-hidden>{i + 1}</span>
                  <div><h3 className="text-base font-bold">{title}</h3><p className="mt-0.5 text-[15px] text-muted">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl text-4xl font-bold">From resume to final report, in one place.</h2>
          <dl className="mt-10 grid border-t border-line md:grid-cols-2 md:gap-x-12">
            {COVERS.map(([t, d]) => (
              <div key={t} className="border-b border-line py-6">
                <dt className="font-display text-xl font-bold">{t}</dt>
                <dd className="mt-1.5 max-w-lg text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="principles" className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_1.1fr]">
            <h2 className="text-4xl font-bold">What Candor will not do.</h2>
            <ul className="margin-note space-y-4 px-6 py-6">
              {WONT.map((w) => <li key={w} className="text-[15px]">{w}</li>)}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <h2 className="text-3xl font-bold">For colleges and placement cells</h2>
            <p className="text-muted">Cohort dashboards, assigned mock interviews and aggregate skill-gap reports are designed into Candor&rsquo;s architecture and are the next phase of development. Today Candor is built for individual candidates.</p>
          </div>
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-14">
            <p className="font-display text-3xl font-bold">Honest practice for the interview that counts.</p>
            <Link href="/app/resume?demo=1" className="inline-flex rounded-md bg-mark px-5 py-3 text-sm font-bold text-ink hover:bg-white">Try the demo</Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted">
        <p>Candor is a preparation tool. It does not make hiring decisions.</p>
        <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">Privacy</Link>
      </footer>
    </>
  );
}
