"use client";

// Browser speech: Web Speech API recognition (speech -> text) and speechSynthesis (text -> speech).
// Recognition is Chrome/Edge/Safari only; callers hide the mic where it's unsupported.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n";

// Minimal typings; the recognition API is not in TypeScript's DOM lib.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noSubscribe = () => () => {};

const ERROR_KEYS = {
  "not-allowed": "blocked",
  "service-not-allowed": "blocked",
  "audio-capture": "noMic",
  network: "network",
} as const;

export function useSpeechRecognition(lang: string, onFinal: (text: string) => void) {
  const errors = useI18n().t.interview.micErrors;
  const supported = useSyncExternalStore(noSubscribe, () => Boolean(getRecognitionCtor()), () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  });
  useEffect(() => () => recognition.current?.abort(), []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recognition.current) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current(r[0].transcript.trim());
        else pending += r[0].transcript;
      }
      setInterim(pending);
    };
    rec.onerror = (e) => {
      // "no-speech" and "aborted" are normal stops, not failures.
      if (e.error !== "no-speech" && e.error !== "aborted") {
        const key = ERROR_KEYS[e.error as keyof typeof ERROR_KEYS];
        setError(key ? errors[key] : errors.other(e.error));
      }
    };
    rec.onend = () => {
      recognition.current = null;
      setListening(false);
      setInterim("");
    };
    setError(null);
    recognition.current = rec;
    rec.start();
    setListening(true);
  }

  function stop() {
    recognition.current?.stop();
  }

  return { supported, listening, interim, error, start, stop };
}

// Reading markdown aloud: drop code fences, inline backticks and markup symbols.
function toSpeech(markdown: string, lang: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, lang.startsWith("fr") ? " (voir le code à l'écran) " : " (see the code on screen) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeechSynthesis() {
  const supported = useSyncExternalStore(noSubscribe, () => "speechSynthesis" in window, () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak(markdown: string, lang = "en-US") {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(toSpeech(markdown, lang));
    u.lang = lang;
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  function cancel() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  return { supported, speaking, speak, cancel };
}
