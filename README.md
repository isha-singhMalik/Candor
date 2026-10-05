# Candor

**Honest practice for the interview that counts.**
Candor is an interview and career-readiness platform: resume and ATS analysis, job-description matching, adaptive mock interviews with voice, evidence-based reports, a personalised practice plan and progress tracking.

It runs **with no API keys** in *Demo Mode* (a deterministic, rule-based engine that analyses your real text). Connect an AI model later by setting two environment variables.

## What works today (MVP, phases 1-5 of the brief)

| Area | Status |
|---|---|
| Landing page, privacy notice, responsive + keyboard accessible UI | Working |
| Profile/onboarding (saved in the browser) | Working |
| Resume upload (PDF/DOCX, magic-byte validated, 5 MB cap) or pasted text | Working |
| Resume analysis: 6 transparent scored dimensions, line-by-line review, recruiter questions | Working (rules engine) |
| Job-description matching: matched / missing / related skills, gaps, conditional keyword advice | Working |
| Interview engine: 10 types, difficulty, style, duration, source (resume / JD / both / generic) | Working |
| Dynamic follow-ups driven by your previous answer and resume claims | Working |
| Per-answer feedback: Observation, Evidence, Why it matters, Recommendation, Practice + interviewer-expectation block | Working |
| Interview report with "What you need to hear", category scores with evidence, speech signals | Working |
| 7-day personalised practice plan | Working |
| Dashboard, history, progress chart, weakest areas, streak | Working |
| Voice: browser speech-to-text and text-to-speech behind provider interfaces | Working in Chrome/Edge |
| Camera preview (local only, not recorded, not analysed) | Working |
| Real LLM provider (Anthropic / OpenAI adapters): question generation + answer evaluation | **Implemented, not tested against a live API key** |
| Authentication (Auth.js), PostgreSQL + Prisma persistence | **Not wired yet** (schema in `prisma/schema.prisma`) |
| Institution and admin dashboards | **Not built yet** (architecture + schema only) |

Demo Mode is honest about its limits: it measures structure, evidence, filler words, reasoning cues and STAR coverage. It **cannot verify technical correctness**, so the Technical score only reflects reasoning and trade-offs until an AI model is connected.

## Quick start

```bash
npm install
cp .env.example .env     # optional: leave AI_API_KEY empty for Demo Mode
npm run dev              # http://localhost:3000
```

Click **Try the demo** on the landing page: it loads a sample resume and job description, analyses them, then lets you run a full mock interview and get a report.

Other commands: `npm test` (35 tests), `npm run typecheck`, `npm run build`.

## Architecture

```
src/
  app/                  Next.js App Router pages and API routes
    api/                resume/analyze, interview/{next,evaluate,report}, plan, health
    app/                dashboard, onboarding, resume, interview, reports/[id]
  components/           UI (design tokens live in app/globals.css)
  lib/
    ai/                 AIProvider interface, HeuristicProvider (demo), LlmProvider, prompts, zod schemas
    resume/             parser (pdf/docx), analyzer, job matcher, skills dictionary
    interview/          question bank, question engine, evaluator, report, plan
    scoring/            all score maths (published weights, computed in code)
    speech/             SpeechToTextProvider / TextToSpeechProvider + browser implementations
    storage/            FileStorageProvider (files discarded by default), browser persistence
    security/           rate limiter, audit log
    validation.ts       zod request schemas   api.ts   shared request pipeline
  types/
prisma/schema.prisma    Phase-4 data model (not yet used)
tests/                  scoring, resume, matching, AI validation, interview, report, API guards
```

**Provider abstraction.** The UI and API routes only call `AIProvider`: `generateInterviewQuestion`, `evaluateInterviewAnswer`, `analyzeResume`, `matchResumeToJob`, `generateInterviewReport`, `generatePracticePlan`. `getAIProvider()` in `src/lib/ai/index.ts` returns the rules engine without a key, or `LlmProvider` with one. `LlmProvider` extends the rules engine, so anything it does not override (and any LLM failure or malformed response) falls back to rules instead of crashing.

**Scoring.** The LLM (when used) returns per-criterion scores 0-5 as JSON, validated with zod. Category and overall scores are computed in `lib/scoring` with fixed weights. Resume score = ATS 20 + role relevance 20 + content 20 + impact 15 + structure 15 + skills 10, each measured by explicit rules.

**Honesty rules baked in.** ATS scores are labelled estimates. The resume tool never invents numbers (it tells you to supply real results) and keyword advice is conditional on genuine experience. No facial or voice-tone analysis; speech signals come from the transcript only.

## Security

Input validation (zod) on every route, content-based file-type check, 5 MB cap, in-memory file parsing (nothing written to disk), per-IP rate limiting, AI calls server-side only, keys never sent to the browser, prompt hierarchy with candidate text wrapped as untrusted data, error masking (no stack traces to users), metadata-only audit log, security headers, React-escaped rendering of uploaded content.
Known limits: the rate limiter is per-instance memory (use Upstash/Redis on Vercel for real protection), and there is no authentication yet, so there is no authorization layer to test.

## Environment variables

See `.env.example`. Only these matter for the MVP:

```
AI_PROVIDER=anthropic   # or openai
AI_API_KEY=             # empty = Demo Mode
AI_MODEL=               # model id for the chosen provider (required with a key)
```

Both `AI_API_KEY` and `AI_MODEL` must be set to leave Demo Mode. Never prefix them with `NEXT_PUBLIC_`.

## Connecting a real AI model

1. Set the three variables above in `.env` (locally) or in Vercel Project Settings.
2. Restart. The header badge changes from **Demo mode** to **AI mode**.
3. Test an interview. If the model returns something invalid or times out, Candor silently falls back to the rules engine for that step.
4. To add another vendor, add a branch in `callLLM()` in `src/lib/ai/llm.ts`, or implement `AIProvider` in a new file.

## Deploy

### GitHub
```bash
git init
git add .
git commit -m "Candor MVP"
git branch -M main
git remote add origin https://github.com/<you>/candor.git
git push -u origin main
```
`.env` is git-ignored. Do not commit keys. A CI workflow (`.github/workflows/ci.yml`) runs typecheck, tests and build on every push.

### Vercel
1. Vercel dashboard, **Add New Project**, import the GitHub repo. Framework preset: Next.js (auto-detected).
2. (Optional) add `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` under Environment Variables.
3. Deploy. No other infrastructure is needed for the MVP.
4. Later: **Settings, Domains** to attach your own domain.

Netlify also works (use the Next.js runtime plugin it installs automatically).

### Vercel limitations to know about
- Serverless functions are stateless: the in-memory rate limiter is per instance (swap for Upstash).
- Request bodies are limited to about 4.5 MB on Vercel serverless functions, so keep the 5 MB resume cap in mind; for larger files, upload directly to object storage and parse from there.
- Real-time voice conversation (streaming) needs a provider with WebSockets or WebRTC; the current browser speech APIs need no server.

## Roadmap (matches the brief's phases)
- **Phase 4:** Auth.js + Prisma/PostgreSQL persistence, password reset, Google sign-in, usage limits (Free/Pro).
- **Phase 5:** server-side STT/TTS providers, LLM-based resume analysis and report narrative.
- **Phase 6:** organisations, batches, assessments, cohort analytics, admin dashboard.

## Privacy
See `/privacy` in the app. It is a plain-language summary, not legal advice. Have it reviewed before a public launch.
