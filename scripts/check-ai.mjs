// Verifies your AI key works. Run:  npm run check:ai
// Reads .env.local, then .env. Works on any Node 20+.
import fs from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const v = m[2].replace(/(^|\s+)#.*$/, "").replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

// Keep in sync with src/lib/ai/presets.ts
const PRESETS = {
  anthropic: { kind: "anthropic", model: "claude-sonnet-5-5" },
  openai: { kind: "openai", baseUrl: "https://api.openai.com/v1", model: "" },
  gemini: { kind: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-flash-latest" },
  groq: { kind: "openai", baseUrl: "https://api.groq.com/openai/v1", model: "" },
  openrouter: { kind: "openai", baseUrl: "https://openrouter.ai/api/v1", model: "" },
};

const name = (process.env.AI_PROVIDER ?? "anthropic").trim().toLowerCase();
const preset = PRESETS[name];
const key = process.env.AI_API_KEY?.trim();
const envBase = process.env.AI_BASE_URL?.trim();
if (envBase && !/^https?:\/\//i.test(envBase)) {
  console.log(`✗ AI_BASE_URL in your .env file is "${envBase.slice(0, 40)}", which is not a web address. Delete that line (or leave it exactly as AI_BASE_URL=) and rerun.`);
  process.exit(1);
}
const baseUrl = (envBase || preset?.baseUrl || "").replace(/\/$/, "");
const model = process.env.AI_MODEL?.trim() || preset?.model || "";
const kind = preset?.kind ?? "openai";

if (!key) { console.log("✗ AI_API_KEY is empty, so Candor will run in Demo Mode."); process.exit(1); }
// A pasted key with spaces, quotes or line breaks makes the request fail before it is sent.
if (/[^\x21-\x7e]/.test(key) || /["']/.test(key)) {
  console.log("✗ AI_API_KEY contains spaces, quotes or hidden characters. Open .env.local and make sure the line is exactly:\n    AI_API_KEY=yourkeyhere\n  (no quotes, no spaces, nothing after it). Re-copy the key from the provider if unsure.");
  process.exit(1);
}
if (key.startsWith("paste_your") || key.includes("your_key")) {
  console.log("✗ AI_API_KEY still contains the placeholder text. Replace it with your real key.");
  process.exit(1);
}
console.log(`Using provider: ${name} | key: ${key.slice(0, 4)}… (${key.length} characters)`);
if (key.startsWith("AQ.")) console.log("Note: AQ. is Google's newer key format. That is normal.");
if (!preset && !baseUrl) { console.log(`✗ Unknown AI_PROVIDER "${name}". Use anthropic, gemini, groq, openrouter or openai (or set AI_BASE_URL).`); process.exit(1); }

const authHeaders = kind === "anthropic"
  ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
  : { authorization: `Bearer ${key}` };

async function listModels() {
  if (kind !== "openai") return;
  try {
    const r = await fetch(`${baseUrl}/models`, { headers: authHeaders });
    if (!r.ok) return;
    const ids = ((await r.json()).data ?? []).map((m) => String(m.id).replace(/^models\//, "")).slice(0, 25);
    const pick = ids.find((i) => /flash-latest$/.test(i)) ?? ids.find((i) => /flash/.test(i) && !/image|tts|preview/.test(i)) ?? ids[0];
    if (ids.length) console.log(`  Models your key can use:\n    ${ids.join("\n    ")}\n  Suggested: add this line to .env.local and rerun:\n    AI_MODEL=${pick}`);
  } catch { /* best effort */ }
}

if (!model) {
  console.log(`✗ AI_MODEL is required for ${name}. Pick one from the list below and set it in .env.local.`);
  await listModels();
  process.exit(1);
}

const url = kind === "anthropic" ? "https://api.anthropic.com/v1/messages" : `${baseUrl}/chat/completions`;
console.log(`Testing: ${url}`);
const body = kind === "anthropic"
  ? { model, max_tokens: 20, messages: [{ role: "user", content: "Reply with the single word: ok" }] }
  : { model, messages: [{ role: "user", content: "Reply with the single word: ok" }] };

try {
  const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15000), headers: { "content-type": "application/json", ...authHeaders }, body: JSON.stringify(body) });
  if (res.ok) { console.log(`✓ Key works. Provider: ${name}, model: ${model}. Candor will start in AI mode.`); process.exit(0); }
  const text = await res.text();
  const hints = {
    400: "Bad request. Often an invalid model name, or (Anthropic/OpenAI) no credits on the account.",
    401: "The key is invalid or mistyped. Create a new one and paste it with no spaces or quotes.",
    403: "The key does not have permission for this model, or the service is not available in your region.",
    404: `Model "${model}" was not found.`,
    429: "Rate limited. On free tiers wait a minute and retry; Candor falls back to Demo Mode if this happens while running.",
  };
  console.log(`✗ ${name} returned HTTP ${res.status}. ${hints[res.status] ?? ""}\n  Details: ${text.slice(0, 300)}`);
  if (name === "gemini" && key.startsWith("AQ.") && [400, 401, 403].includes(res.status)) {
    console.log("  Your key uses Google's new AQ. format, and some Gemini endpoints do not accept it yet. Options: (1) create a key in Google Cloud Console > APIs & Services > Credentials, restricted to the Generative Language API; (2) use Groq instead (AI_PROVIDER=groq).");
  }
  if ([400, 404].includes(res.status)) await listModels();
  process.exit(1);
} catch (e) {
  const why = e?.name === "TimeoutError" ? "no reply within 15 seconds" : (e?.cause?.code || e?.cause?.message || e?.message || String(e));
  console.log(`✗ The request to ${name} failed: ${why}`);
  console.log("  If this mentions a certificate, antivirus or proxy, see the README troubleshooting. If it says 'Headers' or 'ByteString', your key line has a hidden character.");
  process.exit(1);
}
