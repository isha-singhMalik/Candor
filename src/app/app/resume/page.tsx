"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Experience, Profile, ResumeAnalysis } from "@/types";
import { KEYS, usePersisted } from "@/lib/storage/local";
import { SAMPLE_JD, SAMPLE_PROFILE, SAMPLE_RESUME } from "@/lib/data/sample";
import { AnalysisView } from "@/components/AnalysisView";
import { Notice, Skeleton, btnPrimary, btnQuiet, btnSecondary, input, label, panel } from "@/components/ui";

interface StoredResume { text: string; jdText?: string; role: string; overall: number; sample?: boolean; analysis: ResumeAnalysis; fileName?: string }

function ResumeTool() {
  const params = useSearchParams();
  const [profile, setProfile, pReady] = usePersisted<Profile | null>(KEYS.profile, null);
  const [stored, setStored, sReady] = usePersisted<StoredResume | null>(KEYS.resume, null);
  const [text, setText] = useState("");
  const [jd, setJd] = useState("");
  const [role, setRole] = useState("");
  const [exp, setExp] = useState<Experience>("fresher");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isSample, setIsSample] = useState(false);
  const started = useRef(false);

  async function run(opts: { text: string; jd: string; role: string; exp: Experience; file: File | null; sample?: boolean }) {
    setBusy(true); setError("");
    try {
      let res: Response;
      if (opts.file) {
        const fd = new FormData();
        fd.set("file", opts.file); fd.set("role", opts.role); fd.set("experience", opts.exp);
        if (opts.jd.trim()) fd.set("jdText", opts.jd);
        res = await fetch("/api/resume/analyze", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/resume/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: opts.text, role: opts.role, experience: opts.exp, jdText: opts.jd || undefined }) });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We could not analyse that resume.");
      setAnalysis(data.analysis); setText(data.text); setIsSample(!!opts.sample);
      setStored({ text: data.text, jdText: opts.jd || undefined, role: opts.role, overall: data.analysis.overall, analysis: data.analysis, sample: opts.sample, fileName: opts.file?.name });
    } catch (e) {
      setError(e instanceof TypeError ? "Network problem. Check your connection and try again." : (e as Error).message);
    } finally { setBusy(false); }
  }

  // Hydrate from storage / profile once, and auto-run the demo when ?demo=1.
  useEffect(() => {
    if (!pReady || !sReady || started.current) return;
    started.current = true;
    if (params.get("demo") === "1") {
      if (!profile) setProfile(SAMPLE_PROFILE);
      setText(SAMPLE_RESUME); setJd(SAMPLE_JD); setRole(SAMPLE_PROFILE.targetRole); setExp("fresher");
      void run({ text: SAMPLE_RESUME, jd: SAMPLE_JD, role: SAMPLE_PROFILE.targetRole, exp: "fresher", file: null, sample: true });
      return;
    }
    setRole(stored?.role ?? profile?.targetRole ?? "Software Engineer");
    setExp(profile?.experience ?? "fresher");
    if (stored) { setText(stored.text); setJd(stored.jdText ?? ""); setAnalysis(stored.analysis); setIsSample(!!stored.sample); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pReady, sReady]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && text.trim().length < 50) return setError("Upload a PDF or DOCX, or paste at least a few lines of resume text.");
    if (role.trim().length < 2) return setError("Enter the role you are targeting.");
    void run({ text, jd, role: role.trim(), exp, file });
  }

  if (!pReady || !sReady) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold">Resume analyzer</h1>
        <p className="mt-2 max-w-2xl text-muted">Upload a PDF or DOCX, or paste the text. Add a job description to see how well you match it. Files are read in memory and not stored.</p>
      </div>

      <form onSubmit={submit} className={`${panel} grid gap-5 p-6 lg:grid-cols-2`} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="file" className={label}>Resume file (PDF or DOCX, up to 5 MB)</label>
            <input id="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && f.size > 5 * 1024 * 1024) { setError("That file is larger than 5 MB."); e.target.value = ""; setFile(null); } else { setFile(f); setError(""); } }}
              className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-signal" />
          </div>
          <div>
            <label htmlFor="text" className={label}>…or paste resume text</label>
            <textarea id="text" value={text} onChange={(e) => { setText(e.target.value); setIsSample(false); }} rows={9} className={input} placeholder="Paste your resume here" disabled={!!file} />
            {file && <p className="mt-1 text-xs text-muted">Using {file.name}. <button type="button" className="font-semibold text-signal underline" onClick={() => setFile(null)}>Remove file</button></p>}
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="role" className={label}>Target role</label><input id="role" value={role} onChange={(e) => setRole(e.target.value)} className={input} /></div>
            <div><label htmlFor="exp" className={label}>Experience</label>
              <select id="exp" value={exp} onChange={(e) => setExp(e.target.value as Experience)} className={input}><option value="fresher">Fresher</option><option value="0-2">0–2 years</option><option value="2-5">2–5 years</option><option value="5+">5+ years</option></select></div>
          </div>
          <div><label htmlFor="jd" className={label}>Job description (optional)</label><textarea id="jd" value={jd} onChange={(e) => setJd(e.target.value)} rows={7} className={input} placeholder="Paste the job posting to compare skills" /></div>
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary} disabled={busy}>{busy ? "Analyzing…" : "Analyze resume"}</button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => { setFile(null); setText(SAMPLE_RESUME); setJd(SAMPLE_JD); setRole(SAMPLE_PROFILE.targetRole); void run({ text: SAMPLE_RESUME, jd: SAMPLE_JD, role: SAMPLE_PROFILE.targetRole, exp: "fresher", file: null, sample: true }); }}>Use sample resume</button>
          </div>
        </div>
        {error && <div className="lg:col-span-2"><Notice kind="error">{error}</Notice></div>}
      </form>

      {busy && <div className="space-y-3" aria-live="polite"><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /></div>}
      {!busy && !analysis && !error && <Notice>No analysis yet. Upload your resume or try the sample to see a scored report with line-by-line feedback.</Notice>}

      {!busy && analysis && (
        <>
          <AnalysisView a={analysis} sample={isSample} />
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <Link href="/app/interview" className={btnPrimary}>Practice an interview from this resume</Link>
            <Link href="/app" className={btnQuiet}>Go to dashboard</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResumePage() {
  return <Suspense fallback={<Skeleton className="h-64 w-full" />}><ResumeTool /></Suspense>;
}
