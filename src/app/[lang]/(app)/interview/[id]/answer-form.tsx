"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n";
import type { FormState } from "../actions";
import { useSpeechRecognition, useSpeechSynthesis } from "./speech";

type Props = {
  question: string;
  speechLang: string; // BCP 47 tag of the interview language, e.g. "fr-FR"
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

export function AnswerForm({ question, speechLang, answerAction, finishAction, canFinish }: Props) {
  const { t } = useI18n();
  const iv = t.interview;
  const [state, answer, answering] = useActionState(answerAction, undefined);
  const [finishState, finish, finishing] = useActionState(finishAction, undefined);
  // Controlled, so the answer survives a failed submit (React only resets uncontrolled fields).
  const [text, setText] = useState("");
  const autoRead = useSyncExternalStore(subscribeAutoRead, readAutoRead, () => false);
  const busy = answering || finishing;
  const error = state?.error ?? finishState?.error;

  const mic = useSpeechRecognition(speechLang, (spoken) => {
    if (spoken) setText((prev) => (prev && !/\s$/.test(prev) ? `${prev} ${spoken}` : prev + spoken));
  });
  const tts = useSpeechSynthesis();

  // Read each new question aloud when the candidate turned that on (this component mounts once per question).
  useEffect(() => {
    if (readAutoRead()) tts.speak(question, speechLang);
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
                onClick={() => (tts.speaking ? tts.cancel() : tts.speak(question, speechLang))}
                className="btn-line px-3 py-1 text-sm"
              >
                {tts.speaking ? iv.stopReading : iv.readQuestion}
              </button>
              <label className="flex items-center gap-2 text-ink-soft">
                <input
                  className="accent-[var(--action)]"
                  type="checkbox"
                  checked={autoRead}
                  onChange={(e) => writeAutoRead(e.target.checked)}
                />
                {iv.readAloud}
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
          {iv.yourAnswer}
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
              ? iv.placeholderMic
              : iv.placeholder
          }
          className="ruled w-full resize-y rounded-[3px] border border-rule bg-sheet px-4 py-0 font-serif text-[1.0625rem] text-link placeholder:text-ink-soft placeholder:italic focus-visible:border-action focus-visible:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
        {mic.listening && (
          <p className="text-sm text-ink-soft" aria-live="polite">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-pen motion-safe:animate-pulse" aria-hidden />
            {iv.listening} {mic.interim && <span className="italic">{mic.interim}</span>}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn">
            {answering ? iv.grading : iv.submit}
          </button>
          {mic.supported && (
            <button
              type="button"
              onClick={() => (mic.listening ? mic.stop() : mic.start())}
              disabled={busy}
              aria-pressed={mic.listening}
              className={mic.listening ? "btn-line border-pen text-pen" : "btn-line"}
            >
              {mic.listening ? iv.stop : iv.speak}
            </button>
          )}
          <span className="text-xs text-ink-soft">{iv.ctrlEnter}</span>
        </div>
      </form>

      {canFinish && (
        <form action={finish}>
          <button type="submit" disabled={busy} className="link text-sm text-ink-soft disabled:opacity-50">
            {finishing ? iv.summarizing : iv.finish}
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
