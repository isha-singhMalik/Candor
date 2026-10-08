/**
 * Voice pipeline: Candidate speech -> SpeechToTextProvider -> interview engine -> TextToSpeechProvider.
 * The browser implementations below work with no API keys. To use a cloud service (Deepgram,
 * Whisper, ElevenLabs, Azure...) implement these same interfaces and register them in `index.ts`.
 */
export interface SttHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}
export interface SpeechToTextProvider {
  readonly name: string;
  isSupported(): boolean;
  start(h: SttHandlers): void;
  stop(): void;
}
export interface TextToSpeechProvider {
  readonly name: string;
  isSupported(): boolean;
  speak(text: string): Promise<void>;
  cancel(): void;
}
