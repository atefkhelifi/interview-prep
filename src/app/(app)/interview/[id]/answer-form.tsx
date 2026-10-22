"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import type { FormState } from "../actions";
import { useSpeechRecognition, useSpeechSynthesis } from "./speech";

type Props = {
  question: string;
  answerAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  finishAction: (prev: FormState) => Promise<FormState>;
  canFinish: boolean;
};

// "Read questions aloud" preference, kept in localStorage.
const AUTO_READ_KEY = "interview-auto-read";
const AUTO_READ_EVENT = "interview-auto-read-change";

function readAutoRead() {
  try {
    return localStorage.getItem(AUTO_READ_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAutoRead(on: boolean) {
  try {
    localStorage.setItem(AUTO_READ_KEY, on ? "1" : "0");
  } catch {
    // preference just isn't remembered
  }
  window.dispatchEvent(new Event(AUTO_READ_EVENT));
}

function subscribeAutoRead(onChange: () => void) {
  window.addEventListener(AUTO_READ_EVENT, onChange);
  return () => window.removeEventListener(AUTO_READ_EVENT, onChange);
}

export function AnswerForm({ question, answerAction, finishAction, canFinish }: Props) {
  const [state, answer, answering] = useActionState(answerAction, undefined);
  const [finishState, finish, finishing] = useActionState(finishAction, undefined);
  // Controlled, so the answer survives a failed submit (React only resets uncontrolled fields).
  const [text, setText] = useState("");
  const autoRead = useSyncExternalStore(subscribeAutoRead, readAutoRead, () => false);
  const busy = answering || finishing;
  const error = state?.error ?? finishState?.error;

  const mic = useSpeechRecognition((spoken) => {
    if (spoken) setText((t) => (t && !/\s$/.test(t) ? `${t} ${spoken}` : t + spoken));
  });
  const tts = useSpeechSynthesis();

  // Read each new question aloud when the candidate turned that on (this component mounts once per question).
  useEffect(() => {
    if (readAutoRead()) tts.speak(question);
    // Only on mount: re-reading on every toggle or render would be noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {(tts.supported || mic.supported) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {tts.supported && (
            <>
              <button
                type="button"
                onClick={() => (tts.speaking ? tts.cancel() : tts.speak(question))}
                className="btn-line px-3 py-1 text-sm"
              >
                {tts.speaking ? "■ Stop reading" : "🔊 Read question"}
              </button>
              <label className="flex items-center gap-2 text-ink-soft">
                <input
                  className="accent-[var(--action)]"
                  type="checkbox"
                  checked={autoRead}
                  onChange={(e) => writeAutoRead(e.target.checked)}
                />
                Read questions aloud
              </label>
            </>
          )}
        </div>
      )}

      <form
        action={answer}
        onSubmit={() => {
          mic.stop();
          tts.cancel();
        }}
        className="space-y-3"
      >
        <label htmlFor="answer" className="sr-only">
          Your answer
        </label>
        <textarea
          id="answer"
          name="answer"
          rows={7}
          required
          maxLength={5000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={busy}
          placeholder={
            mic.supported
              ? "Type your answer, or press Speak and answer out loud…"
              : "Type your answer as you would say it in the interview…"
          }
          className="ruled w-full resize-y rounded-[3px] border border-rule bg-sheet px-4 py-0 font-serif text-[1.0625rem] text-link placeholder:text-ink-soft placeholder:italic focus-visible:border-action focus-visible:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
        {mic.listening && (
          <p className="text-sm text-ink-soft" aria-live="polite">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-pen motion-safe:animate-pulse" aria-hidden />
            Listening… {mic.interim && <span className="italic">{mic.interim}</span>}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn">
            {answering ? "Grading…" : "Submit answer"}
          </button>
          {mic.supported && (
            <button
              type="button"
              onClick={() => (mic.listening ? mic.stop() : mic.start())}
              disabled={busy}
              aria-pressed={mic.listening}
              className={mic.listening ? "btn-line border-pen text-pen" : "btn-line"}
            >
              {mic.listening ? "■ Stop" : "🎤 Speak"}
            </button>
          )}
          <span className="text-xs text-ink-soft">Ctrl+Enter to submit</span>
        </div>
      </form>

      {canFinish && (
        <form action={finish}>
          <button type="submit" disabled={busy} className="link text-sm text-ink-soft disabled:opacity-50">
            {finishing ? "Writing summary…" : "Finish now and see results"}
          </button>
        </form>
      )}

      {(error || mic.error) && (
        <p role="alert" className="pen text-sm">
          {error ?? mic.error}
        </p>
      )}
    </div>
  );
}
