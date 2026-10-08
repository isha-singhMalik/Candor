"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnswerEvaluation, GeneratedQuestion, InterviewConfig, InterviewRecord, InterviewReport, PracticePlan, Profile, Turn } from "@/types";
import { KEYS, postJSON, usePersisted } from "@/lib/storage/local";
import { BrowserSpeechToText, BrowserTextToSpeech } from "@/lib/speech/browser";
import { FeedbackBlocks } from "@/components/ReportView";
import { Notice, Skeleton, btnPrimary, btnQuiet, btnSecondary, input, label, panel } from "@/components/ui";

interface StoredResume { text: string; jdText?: string }
type Phase = "setup" | "asking" | "evaluating" | "feedback" | "finishing";

const TYPES: [InterviewConfig["type"], string][] = [["fresher", "Fresher mix"], ["hr", "HR"], ["behavioral", "Behavioral"], ["technical", "Technical"], ["role", "Role-specific"], ["resume", "Resume-based"], ["jd", "Job-description-based"], ["situational", "Situational"], ["leadership", "Leadership"], ["communication", "Communication"]];

export default function InterviewPage() {
  const router = useRouter();
  const [profile, , pReady] = usePersisted<Profile | null>(KEYS.profile, null);
  const [resume, , rReady] = usePersisted<StoredResume | null>(KEYS.resume, null);
  const [, setHistory] = usePersisted<InterviewRecord[]>(KEYS.history, []);

  const [cfg, setCfg] = useState<InterviewConfig>({ role: "Software Engineer", experience: "fresher", difficulty: "intermediate", style: "professional", minutes: 15, type: "fresher", source: "generic" });
  const [custom, setCustom] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [q, setQ] = useState<GeneratedQuestion | null>(null);
  const [total, setTotal] = useState(6);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [interim, setInterim] = useState("");
  const [lastEval, setLastEval] = useState<AnswerEvaluation | null>(null);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");

  const stt = useRef(new BrowserSpeechToText());
  const tts = useRef(new BrowserTextToSpeech());
  const shownAt = useRef(0);
  const micStart = useRef(0);
  const micSeconds = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const hasResume = !!resume?.text;
  const hasJd = !!resume?.jdText;

  useEffect(() => {
    if (!pReady) return;
    setCfg((c) => ({ ...c, role: profile?.targetRole || c.role, experience: profile?.experience ?? c.experience, type: profile?.interviewType ?? c.type, source: hasResume ? "resume" : "generic" }));
  }, [pReady, rReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stt.current.stop(); tts.current.cancel(); stream.current?.getTracks().forEach((t) => t.stop()); }, []);

  const body = useCallback((history: Turn[]) => ({
    config: cfg, resumeText: cfg.source === "resume" || cfg.source === "both" ? resume?.text : undefined,
    jdText: cfg.source === "jd" || cfg.source === "both" ? resume?.jdText : undefined,
    history: history.map((t) => ({ question: t.question, category: t.category, answer: t.answer, evaluation: t.evaluation })),
  }), [cfg, resume]);

  async function fetchQuestion(history: Turn[]) {
    setError("");
    try {
      const data = await postJSON<{ question: GeneratedQuestion; total: number }>("/api/interview/next", body(history));
      setQ(data.question); setTotal(data.total); setAnswer(""); setInterim(""); setLastEval(null); setUsedVoice(false);
      micSeconds.current = 0; shownAt.current = Date.now(); setPhase("asking");
    } catch (e) { setError((e as Error).message); setPhase(history.length ? "feedback" : "setup"); }
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (cfg.role.trim().length < 2) return setError("Enter the role you are interviewing for.");
    setTurns([]); setPhase("evaluating"); await fetchQuestion([]);
  }

  function toggleMic() {
    if (listening) { stt.current.stop(); return; }
    setError(""); setUsedVoice(true); micStart.current = Date.now(); setListening(true);
    stt.current.start({
      onInterim: setInterim,
      onFinal: (t) => { setAnswer((a) => (a ? `${a} ${t}` : t)); setInterim(""); },
      onError: (m) => { setError(m); setListening(false); },
      onEnd: () => { micSeconds.current += (Date.now() - micStart.current) / 1000; setListening(false); setInterim(""); },
    });
  }

  async function submit() {
    if (!q) return;
    if (listening) stt.current.stop();
    if (answer.trim().length < 2) return setError("Write or record an answer first.");
    setPhase("evaluating"); setError("");
    const elapsed = (Date.now() - shownAt.current) / 1000;
    const seconds = Math.round(usedVoice && micSeconds.current > 0 ? micSeconds.current : elapsed);
    try {
      const data = await postJSON<{ evaluation: AnswerEvaluation }>("/api/interview/evaluate", { config: cfg, question: q.question, category: q.category, answer: answer.trim(), seconds, viaVoice: usedVoice, resumeText: resume?.text });
      const turn: Turn = { question: q.question, category: q.category, answer: answer.trim(), seconds, viaVoice: usedVoice, evaluation: data.evaluation };
      setTurns((t) => [...t, turn]); setLastEval(data.evaluation); setPhase("feedback");
    } catch (e) { setError((e as Error).message); setPhase("asking"); }
  }

  async function finish(all: Turn[]) {
    setPhase("finishing"); setError("");
    try {
      const { report } = await postJSON<{ report: InterviewReport }>("/api/interview/report", { config: cfg, turns: all });
      let plan: PracticePlan | undefined;
      try { plan = (await postJSON<{ plan: PracticePlan }>("/api/plan", { role: cfg.role, weakAreas: report.weakAreas, resumeScore: null, speech: report.speech })).plan; } catch { /* the report is still useful without a plan */ }
      const cat = (k: string) => report.categories.find((c) => c.key === k)?.score ?? null;
      const rec: InterviewRecord = { id: crypto.randomUUID(), date: new Date().toISOString(), config: cfg, report, turns: all, plan, summary: { overall: report.overall, communication: cat("communication"), technical: cat("technical"), roleAlignment: cat("roleAlignment") } };
      setHistory((h) => [...h, rec]);
      router.push(`/app/reports/${rec.id}`);
    } catch (e) { setError((e as Error).message); setPhase("feedback"); }
  }

  async function toggleCam() {
    if (camOn) { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCamOn(false); return; }
    setCamError("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamOn(true);
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream.current; });
    } catch { setCamError("Camera access was denied or no camera was found. The interview works fine without it."); }
  }

  if (!pReady || !rReady) return <Skeleton className="h-96 w-full" />;
  const n = turns.length;
  const isLast = n >= total;

  // ---------- SETUP ----------
  if (phase === "setup") {
    const set = <K extends keyof InterviewConfig>(k: K, v: InterviewConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
    return (
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold">Set up your interview</h1>
        <p className="mt-2 text-muted">Questions adapt to your answers as you go. Pick a source so they are about you, not generic.</p>
        <form onSubmit={start} className="mt-8 grid gap-5 sm:grid-cols-2" noValidate>
          <div><label className={label} htmlFor="role">Target role</label><input id="role" value={cfg.role} onChange={(e) => set("role", e.target.value)} className={input} /></div>
          <div><label className={label} htmlFor="type">Interview type</label>
            <select id="type" value={cfg.type} onChange={(e) => set("type", e.target.value as InterviewConfig["type"])} className={input}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className={label} htmlFor="exp">Experience</label>
            <select id="exp" value={cfg.experience} onChange={(e) => set("experience", e.target.value as InterviewConfig["experience"])} className={input}><option value="fresher">Fresher</option><option value="0-2">0–2 years</option><option value="2-5">2–5 years</option><option value="5+">5+ years</option></select></div>
          <div><label className={label} htmlFor="diff">Difficulty</label>
            <select id="diff" value={cfg.difficulty} onChange={(e) => set("difficulty", e.target.value as InterviewConfig["difficulty"])} className={input}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          <div><label className={label} htmlFor="style">Interviewer style</label>
            <select id="style" value={cfg.style} onChange={(e) => set("style", e.target.value as InterviewConfig["style"])} className={input}><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="challenging">Challenging</option><option value="stress">Stress interview</option></select></div>
          <div><label className={label} htmlFor="dur">Duration</label>
            <select id="dur" value={custom ? "custom" : cfg.minutes} onChange={(e) => { if (e.target.value === "custom") { setCustom(true); } else { setCustom(false); set("minutes", Number(e.target.value)); } }} className={input}>
              <option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value="custom">Custom</option></select>
            {custom && <input aria-label="Custom minutes" type="number" min={3} max={60} value={cfg.minutes} onChange={(e) => set("minutes", Math.max(3, Math.min(60, Number(e.target.value) || 3)))} className={input} />}</div>
          <fieldset className="sm:col-span-2">
            <legend className={label}>Build questions from</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {([["generic", "Generic role", true], ["resume", "My resume", hasResume], ["jd", "Job description", hasJd], ["both", "Resume and job description", hasResume && hasJd]] as const).map(([v, l, ok]) => (
                <label key={v} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${cfg.source === v ? "border-ink bg-ink text-white" : "border-line bg-white"} ${!ok ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                  <input type="radio" name="source" className="sr-only" disabled={!ok} checked={cfg.source === v} onChange={() => set("source", v)} />{l}
                </label>
              ))}
            </div>
            {!hasResume && <p className="mt-2 text-sm text-muted"><a className="font-semibold text-signal underline" href="/app/resume?demo=1">Analyze a resume (or the sample)</a> to unlock resume-based questions.</p>}
          </fieldset>
          {error && <div className="sm:col-span-2"><Notice kind="error">{error}</Notice></div>}
          <div className="sm:col-span-2"><button className={btnPrimary}>Start interview</button></div>
        </form>
      </div>
    );
  }

  // ---------- RUNNING ----------
  const busy = phase === "evaluating" || phase === "finishing";
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <aside className="space-y-4">
        <div className={`${panel} p-6`}>
          <p className="text-sm font-semibold text-muted">Question {Math.min(n + (phase === "feedback" ? 0 : 1), total)} of about {total} · {q?.category === "followup" ? "follow-up" : q?.category}</p>
          <p aria-live="polite" className="mt-3 font-display text-2xl font-bold leading-snug">{q ? q.question : <Skeleton className="h-16 w-full" />}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tts.current.isSupported() && q && <button className={btnQuiet} onClick={() => void tts.current.speak(q.question)}>Hear question</button>}
            <button className={btnQuiet} onClick={() => void toggleCam()} aria-pressed={camOn}>{camOn ? "Turn camera off" : "Camera preview"}</button>
          </div>
        </div>
        {camOn && <div className={`${panel} p-3`}><video ref={videoRef} autoPlay muted playsInline className="w-full rounded-sm bg-ink" aria-label="Your camera preview" /><p className="mt-2 text-xs text-muted">Preview only. Nothing is recorded or uploaded, and Candor does not analyse your face.</p></div>}
        {camError && <Notice kind="warn">{camError}</Notice>}
      </aside>

      <section className="space-y-5">
        {(phase === "asking" || phase === "evaluating") && (
          <div className={`${panel} p-6`}>
            <label htmlFor="answer" className={label}>Your answer</label>
            <textarea id="answer" rows={9} value={answer + (interim ? ` ${interim}` : "")} onChange={(e) => setAnswer(e.target.value)} disabled={busy} className={input} placeholder="Type your answer, or use the microphone and speak." />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={toggleMic} disabled={busy} aria-pressed={listening} className={listening ? "inline-flex items-center gap-2 rounded-md bg-bad px-4 py-2.5 text-sm font-semibold text-white" : btnSecondary}>{listening ? "● Stop recording" : "Answer with microphone"}</button>
              <button onClick={() => void submit()} disabled={busy} className={btnPrimary}>{phase === "evaluating" ? "Evaluating…" : "Submit answer"}</button>
              <span className="text-sm text-muted">{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</span>
            </div>
            {listening && <p className="mt-2 text-sm text-muted" aria-live="polite">Listening… your browser converts speech to text. Audio is not saved by Candor.</p>}
          </div>
        )}

        {phase === "feedback" && lastEval && (
          <div className={`${panel} space-y-5 p-6`}>
            <div className="flex items-baseline justify-between"><h2 className="text-2xl font-bold">Feedback on this answer</h2><p className="font-display text-4xl font-extrabold">{lastEval.score}<span className="text-base text-muted">/100</span></p></div>
            {lastEval.engine === "rules" && <p className="text-xs text-muted">Rule-based analysis of your actual words. It measures structure, evidence, filler words and reasoning; it cannot verify factual correctness. Connect an AI model for that.</p>}
            <FeedbackBlocks e={lastEval} />
            {lastEval.followUp && <p className="margin-note px-4 py-3 text-sm"><b>Likely follow-up:</b> {lastEval.followUp}</p>}
            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              {!isLast && <button className={btnPrimary} onClick={() => { setPhase("evaluating"); void fetchQuestion(turns); }}>Next question</button>}
              <button className={isLast ? btnPrimary : btnSecondary} onClick={() => void finish(turns)}>{isLast ? "Finish and see report" : "End here and see report"}</button>
            </div>
          </div>
        )}

        {phase === "finishing" && <div aria-live="polite" className="space-y-3"><p className="font-semibold">Building your report and practice plan…</p><Skeleton className="h-32 w-full" /></div>}
        {error && <Notice kind="error">{error}</Notice>}
      </section>
    </div>
  );
}
