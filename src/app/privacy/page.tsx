import Link from "next/link";
import { Logo } from "@/components/ui";

const items: [string, string][] = [
  ["What we collect", "Resume text, job descriptions you paste, your interview answers and the profile details you enter. If you use voice, your browser converts speech to text; Candor receives the text, not the audio."],
  ["Why", "To analyse your resume, generate interview questions, evaluate your answers and show your progress. Nothing is used for hiring decisions."],
  ["Where it is kept", "In this MVP, your profile, resume text, answers and reports are saved only in your own browser (local storage). Uploaded files are parsed in memory and discarded. You can delete everything from the dashboard at any time."],
  ["Recordings", "Candor does not record or upload audio or video. The camera preview is shown on your screen only and is not analysed."],
  ["How AI processing works", "In Demo mode all analysis is rule-based and runs on the server with no third party. If the operator connects an AI provider, the text of your answer, and optionally your resume and job description, is sent to that provider to generate feedback. The provider key stays on the server."],
  ["Retention", "Server logs record event names and a hashed network identifier, never your content. Browser data stays until you delete it or clear your browser storage."],
];

export default function Privacy() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 text-4xl font-bold">Privacy notice</h1>
      <p className="mt-3 text-muted">This is a plain-language summary for the prototype. It is not legal advice and makes no compliance claims; have it reviewed before a public launch.</p>
      <dl className="mt-8 divide-y divide-line border-y border-line">
        {items.map(([t, d]) => (<div key={t} className="py-5"><dt className="font-display text-lg font-bold">{t}</dt><dd className="mt-1 text-muted">{d}</dd></div>))}
      </dl>
      <Link href="/" className="mt-8 inline-block font-semibold text-signal underline underline-offset-4">Back to Candor</Link>
    </main>
  );
}
