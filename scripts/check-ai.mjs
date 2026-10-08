// Verifies your AI key works. Run:  npm run check:ai
// Reads .env.local, then .env. Works on any Node 20+.
import fs from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const v = m[2].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

// Keep in sync with src/lib/ai/presets.ts
const PRESETS = {
  anthropic: { kind: "anthropic", model: "claude-sonnet-5-5" },
  openai: { kind: "openai", baseUrl: "https://api.openai.com/v1", model: "" },
  gemini: { kind: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  groq: { kind: "openai", baseUrl: "https://api.groq.com/openai/v1", model: "" },
  openrouter: { kind: "openai", baseUrl: "https://openrouter.ai/api/v1", model: "" },
};

const name = (process.env.AI_PROVIDER ?? "anthropic").trim().toLowerCase();
const preset = PRESETS[name];
const key = process.env.AI_API_KEY?.trim();
const baseUrl = (process.env.AI_BASE_URL?.trim() || preset?.baseUrl || "").replace(/\/$/, "");
const model = process.env.AI_MODEL?.trim() || preset?.model || "";
const kind = preset?.kind ?? "openai";

if (!key) { console.log("✗ AI_API_KEY is empty, so Candor will run in Demo Mode."); process.exit(1); }
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
    if (ids.length) console.log(`  Models your key can use (copy one into AI_MODEL):\n    ${ids.join("\n    ")}`);
  } catch { /* best effort */ }
}

if (!model) {
  console.log(`✗ AI_MODEL is required for ${name}. Pick one from the list below and set it in .env.local.`);
  await listModels();
  process.exit(1);
}

const url = kind === "anthropic" ? "https://api.anthropic.com/v1/messages" : `${baseUrl}/chat/completions`;
const body = kind === "anthropic"
  ? { model, max_tokens: 20, messages: [{ role: "user", content: "Reply with the single word: ok" }] }
  : { model, messages: [{ role: "user", content: "Reply with the single word: ok" }] };

try {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...authHeaders }, body: JSON.stringify(body) });
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
  if ([400, 404].includes(res.status)) await listModels();
  process.exit(1);
} catch (e) {
  console.log(`✗ Could not reach ${name}: ${e.message}. Check your internet connection or firewall.`);
  process.exit(1);
}
