/**
 * AI_PROVIDER presets. Gemini, Groq and OpenRouter all speak the OpenAI chat-completions format,
 * so they share one adapter and only differ by base URL. Model names change often: set AI_MODEL
 * to override the default (run `npm run check:ai` to list the models your key can use).
 */
export interface Preset { kind: "anthropic" | "openai"; baseUrl?: string; model: string }

export const PRESETS: Record<string, Preset> = {
  anthropic: { kind: "anthropic", model: "claude-sonnet-5-5" },
  openai: { kind: "openai", model: "" },
  gemini: { kind: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  groq: { kind: "openai", baseUrl: "https://api.groq.com/openai/v1", model: "" },
  openrouter: { kind: "openai", baseUrl: "https://openrouter.ai/api/v1", model: "" },
};
