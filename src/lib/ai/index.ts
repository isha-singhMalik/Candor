import type { AIProvider } from "./types";
import { HeuristicProvider } from "./heuristic";
import { LlmProvider } from "./llm";
import { PRESETS } from "./presets";

let cached: AIProvider | null = null;

/** Server-side only. With no AI_API_KEY (or no usable model) the app runs entirely in Demo Mode. */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const key = process.env.AI_API_KEY?.trim();
  const name = (process.env.AI_PROVIDER ?? "anthropic").trim().toLowerCase();
  const preset = PRESETS[name];
  const envBase = process.env.AI_BASE_URL?.trim();
  const baseUrl = envBase && /^https?:\/\//i.test(envBase) ? envBase : preset?.baseUrl; // ignore junk such as a pasted comment
  const model = process.env.AI_MODEL?.trim() || preset?.model || "";
  const kind = preset?.kind ?? "openai"; // unknown names are treated as a custom OpenAI-compatible host
  const usable = !!key && !!model && (!!preset || !!baseUrl);
  cached = usable ? new LlmProvider({ provider: kind, apiKey: key!, model, baseUrl, label: name }) : new HeuristicProvider();
  return cached;
}
