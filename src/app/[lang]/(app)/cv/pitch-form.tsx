"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useI18n } from "@/components/i18n";
import type { Pitch } from "@/lib/pitch";
import { generatePitch } from "./actions";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export function PitchForm() {
  const [state, action, pending] = useActionState(generatePitch, undefined);
  const [sizeError, setSizeError] = useState<string>();
  const { t } = useI18n();
  const cv = t.cv;
  const error = sizeError ?? state?.error;

  return (
    <>
      <form
        action={action}
        onSubmit={(e) => {
          // Catch big files before upload: the server would reject the request with a generic error.
          const file = new FormData(e.currentTarget).get("file");
          const tooBig = file instanceof File && file.size > MAX_PDF_BYTES;
          setSizeError(tooBig ? cv.errors.tooBig : undefined);
          if (tooBig) e.preventDefault();
        }}
        className="mt-8 grid max-w-3xl gap-6"
      >
        <label className="block">
          <span className="field-label">{cv.file}</span>
          <input type="file" name="file" accept="application/pdf,.pdf" className="field cursor-pointer" />
          <span className="mt-1 block text-sm text-ink-soft">{cv.fileHint}</span>
        </label>
        <label className="block">
          <span className="field-label">{cv.paste}</span>
          <textarea name="text" rows={8} placeholder={cv.placeholder} className="field" />
        </label>
        <label className="block max-w-md">
          <span className="field-label">{cv.role}</span>
          <input type="text" name="role" maxLength={120} placeholder={cv.rolePlaceholder} className="field" />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending} className="btn">
            {pending ? cv.generating : cv.generate}
          </button>
          {error && !pending && (
            <p role="alert" className="pen text-sm">
              {error}
            </p>
          )}
        </div>
        <p className="text-sm text-ink-soft">{cv.privacy}</p>
      </form>

      {state?.pitch && !pending && <PitchResult pitch={state.pitch} />}
    </>
  );
}

function PitchResult({ pitch }: { pitch: Pitch }) {
  const { t } = useI18n();
  const cv = t.cv;

  return (
    <div className="mt-14 max-w-3xl space-y-12">
      <section>
        <h2 className="section-title">{cv.profile}</h2>
        <p className="mt-2 text-lg font-bold tracking-tight">
          {pitch.name && <>{pitch.name}, </>}
          {pitch.headline}
        </p>
        {pitch.skills.length > 0 && (
          <>
            <h3 className="field-label mt-5">{cv.skills}</h3>
            <ul className="mt-1 flex flex-wrap gap-2">
              {pitch.skills.map((s) => (
                <li key={s} className="rounded-[3px] border border-rule px-2 py-0.5 text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </>
        )}
        {pitch.highlights.length > 0 && (
          <>
            <h3 className="field-label mt-5">{cv.highlights}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 font-serif">
              {pitch.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <Script title={cv.short} hint={cv.shortHint} text={pitch.pitchShort} />
      <Script title={cv.long} hint={cv.longHint} text={pitch.pitchLong} />
      <Script title={cv.about} hint={cv.aboutHint} text={pitch.about} />

      <Link href="/hr" className="link">
        {cv.readHr}
      </Link>
    </div>
  );
}

function Script({ title, hint, text }: { title: string; hint: string; text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="section-title">{title}</h2>
        <button
          type="button"
          className="btn-line text-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? t.cv.copied : t.cv.copy}
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
      <p className="mt-3 font-serif text-lg leading-relaxed whitespace-pre-line">{text}</p>
    </section>
  );
}
