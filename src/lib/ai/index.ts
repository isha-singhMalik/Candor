import type { AIProvider } from "./types";
import { HeuristicProvider } from "./heuristic";
import { LlmProvider } from "./llm";

let cached: AIProvider | null = null;

/** Server-side only. With no AI_API_KEY the app runs entirely in Demo Mode. */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const key = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  const provider = process.env.AI_PROVIDER === "openai" ? "openai" : "anthropic";
  cached = key && model ? new LlmProvider({ provider, apiKey: key, model }) : new HeuristicProvider();
  return cached;
}
