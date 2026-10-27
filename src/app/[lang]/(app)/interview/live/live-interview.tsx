"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useI18n } from "@/components/i18n";
import type { LiveLine } from "@/lib/live";
import { LEVELS } from "@/lib/techs";
import { finishLive, startLive } from "./actions";
import { LiveAudio } from "./live-audio";

const LIVE_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

type Option = { slug: string; name: string };
type Phase = "setup" | "connecting" | "live" | "ended";
type Choice = { tech: string; level: (typeof LEVELS)[number] };

type ServerMessage = {
  setupComplete?: object;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    interrupted?: boolean;
  };
};

export function LiveInterview({ techs, defaultTech }: { techs: Option[]; defaultTech?: string }) {
  const { t } = useI18n();
  const lv = t.interview.live;
  const [phase, setPhase] = useState<Phase>("setup");
  const [error, setError] = useState<string>();
  const [lines, setLines] = useState<LiveLine[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [grading, startGrading] = useTransition();

  const linesRef = useRef<LiveLine[]>([]);
  const choice = useRef<Choice>(null);
  const session = useRef<{ ws: WebSocket; audio: LiveAudio; timer: number } | null>(null);
  // The mic callback is created once; this tells it when Google is ready for audio.
  const ready = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" }); // newer browsers return a Promise here; don't return it
  }, [lines]);
  useEffect(() => () => void stopSession(), []);

  function addText(role: LiveLine["role"], text: string) {
    const cur = linesRef.current;
    const last = cur.at(-1);
    const next = last?.role === role ? [...cur.slice(0, -1), { role, text: last.text + text }] : [...cur, { role, text }];
    linesRef.current = next;
    setLines(next);
  }

  async function stopSession() {
    const s = session.current;
    session.current = null;
    ready.current = false;
    if (!s) return;
    clearInterval(s.timer);
    s.ws.onclose = null;
    if (s.ws.readyState <= WebSocket.OPEN) s.ws.close();
    await s.audio.close();
  }

  function grade() {
    const c = choice.current;
    if (!c) return;
    setError(undefined);
    startGrading(async () => {
      const result = await finishLive({ ...c, lines: linesRef.current }); // redirects to the result on success
      if (result?.error) setError(result.error);
    });
  }

  async function end() {
    await stopSession();
    setPhase("ended");
    setSpeaking(false);
    grade();
  }

  async function start(form: FormData) {
    const c: Choice = { tech: String(form.get("tech")), level: form.get("level") as Choice["level"] };
    choice.current = c;
    linesRef.current = [];
    setLines([]);
    setError(undefined);
    setElapsed(0);
    setMuted(false);
    setPhase("connecting");

    const audio = new LiveAudio(); // created during the click, so sound is allowed
    const fail = async (message: string) => {
      await stopSession();
      await audio.close();
      setError(message);
      setPhase("setup");
    };

    try {
      await audio.startMic((chunk) => {
        const ws = session.current?.ws;
        if (ws?.readyState === WebSocket.OPEN && ready.current) {
          ws.send(JSON.stringify({ realtimeInput: { audio: { data: chunk, mimeType: "audio/pcm;rate=16000" } } }));
        }
      });
    } catch {
      return fail(lv.errors.mic);
    }

    const res = await startLive({ ...c, count: Number(form.get("count")) });
    if ("error" in res) return fail(res.error);

    const ws = new WebSocket(`${LIVE_URL}?access_token=${encodeURIComponent(res.token)}`);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      setSpeaking(audio.speaking);
      if (seconds >= res.maxSeconds) void end();
    }, 250);
    session.current = { ws, audio, timer };

    ws.onopen = () => ws.send(JSON.stringify({ setup: res.setup }));
    ws.onmessage = async (e: MessageEvent<string | Blob>) => {
      const msg: ServerMessage = JSON.parse(typeof e.data === "string" ? e.data : await e.data.text());
      if (msg.setupComplete) {
        ready.current = true;
        setPhase("live");
        ws.send(JSON.stringify({ realtimeInput: { text: "The candidate has joined the call." } }));
      }
      const sc = msg.serverContent;
      if (!sc) return;
      if (sc.interrupted) audio.stopPlayback();
      for (const part of sc.modelTurn?.parts ?? []) if (part.inlineData?.data) audio.play(part.inlineData.data);
      if (sc.outputTranscription?.text) addText("ai", sc.outputTranscription.text);
      if (sc.inputTranscription?.text) addText("you", sc.inputTranscription.text);
    };
    ws.onclose = (e) => {
      // Closed by Google (time limit, error): grade what we have, or explain if nothing was said.
      if (linesRef.current.some((l) => l.role === "you")) void end();
      else void fail(`${lv.errors.connect}${e.reason ? ` (${e.reason})` : ""}`);
    };
  }

  function toggleMute() {
    const s = session.current;
    if (!s) return;
    s.audio.muted = !s.audio.muted;
    setMuted(s.audio.muted);
  }

  const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const select = "field cursor-pointer";

  return (
    <div className="mt-8 max-w-3xl">
      {phase === "setup" && (
        <form action={start} className="grid gap-x-8 gap-y-6 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="block">
            <span className="field-label">{t.interview.tech}</span>
            <select name="tech" defaultValue={defaultTech ?? techs[0].slug} className={select}>
              {techs.map((tech) => (
                <option key={tech.slug} value={tech.slug}>
                  {tech.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">{t.interview.level}</span>
            <select name="level" defaultValue="mid" className={select}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {t.levels[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">{t.interview.questions}</span>
            <select name="count" defaultValue="5" className={select}>
              {[3, 5, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-3 sm:col-span-3">
            <p className="text-sm text-ink-soft">{lv.tips}</p>
            <button type="submit" className="btn">
              {lv.start}
            </button>
          </div>
        </form>
      )}

      {phase !== "setup" && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-rule py-3">
          <p className="font-semibold" aria-live="polite">
            {phase === "connecting"
              ? lv.connecting
              : phase === "ended"
                ? grading
                  ? lv.grading
                  : lv.ended
                : muted
                  ? lv.muted
                  : speaking
                    ? lv.speaking
                    : lv.listening}
          </p>
          {phase === "live" && (
            <>
              <span className="text-sm text-ink-soft tabular-nums">{clock(elapsed)}</span>
              <button type="button" onClick={toggleMute} className="btn-line text-sm">
                {muted ? lv.unmute : lv.mute}
              </button>
              <button type="button" onClick={() => void end()} className="btn ml-auto">
                {lv.end}
              </button>
            </>
          )}
          {phase === "ended" && !grading && error && (
            <button type="button" onClick={grade} className="btn ml-auto">
              {lv.retry}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="pen mt-4 text-sm">
          {error}
        </p>
      )}

      {lines.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title">{lv.transcript}</h2>
          <ol className="mt-3 space-y-4">
            {lines.map((line, i) => (
              <li key={i}>
                <p className="field-label">{line.role === "ai" ? lv.interviewer : lv.you}</p>
                <p className={line.role === "ai" ? "font-serif" : ""}>{line.text}</p>
              </li>
            ))}
          </ol>
          <div ref={endRef} />
        </section>
      )}
    </div>
  );
}
