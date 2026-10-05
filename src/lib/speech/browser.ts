import type { SpeechToTextProvider, TextToSpeechProvider, SttHandlers } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const SR = (): any => (typeof window === "undefined" ? undefined : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition);

export class BrowserSpeechToText implements SpeechToTextProvider {
  readonly name = "Browser speech recognition";
  private rec: any = null;
  isSupported() { return !!SR(); }
  start(h: SttHandlers) {
    const Ctor = SR();
    if (!Ctor) return h.onError("Voice input is not supported in this browser. Use Chrome or Edge, or type your answer.");
    const rec = new Ctor();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) h.onFinal(r[0].transcript.trim()); else interim += r[0].transcript;
      }
      h.onInterim(interim);
    };
    rec.onerror = (e: any) => {
      const map: Record<string, string> = {
        "not-allowed": "Microphone access was denied. Allow it in your browser's site settings, or type your answer.",
        "service-not-allowed": "Microphone access was denied. Allow it in your browser's site settings, or type your answer.",
        "no-speech": "We did not hear anything. Check your microphone and try again.",
        "audio-capture": "No microphone was found. Connect one, or type your answer.",
        network: "Speech recognition needs a network connection. Check it, or type your answer.",
      };
      h.onError(map[e.error] ?? "Voice input stopped unexpectedly. You can keep typing.");
    };
    rec.onend = () => h.onEnd();
    this.rec = rec;
    try { rec.start(); } catch { h.onError("Voice input could not start. Try again."); }
  }
  stop() { try { this.rec?.stop(); } catch { /* already stopped */ } }
}

export class BrowserTextToSpeech implements TextToSpeechProvider {
  readonly name = "Browser speech synthesis";
  isSupported() { return typeof window !== "undefined" && "speechSynthesis" in window; }
  speak(text: string) {
    return new Promise<void>((resolve) => {
      if (!this.isSupported()) return resolve();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.onend = () => resolve(); u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }
  cancel() { if (this.isSupported()) window.speechSynthesis.cancel(); }
}
