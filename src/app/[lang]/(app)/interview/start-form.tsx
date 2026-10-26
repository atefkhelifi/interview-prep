"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n";
import { LEVELS } from "@/lib/techs";
import { startInterview } from "./actions";

type Option = { slug: string; name: string };

export function StartForm({ techs, defaultTech }: { techs: Option[]; defaultTech?: string }) {
  const [state, action, pending] = useActionState(startInterview, undefined);
  const { t } = useI18n();
  const iv = t.interview;
  const select = "field cursor-pointer";

  return (
    <form action={action} className="mt-8 grid max-w-3xl gap-x-8 gap-y-6 sm:grid-cols-[2fr_1fr_1fr]">
      <label className="block">
        <span className="field-label">{iv.tech}</span>
        <select name="tech" defaultValue={defaultTech ?? techs[0].slug} className={select}>
          {techs.map((tech) => (
            <option key={tech.slug} value={tech.slug}>
              {tech.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">{iv.level}</span>
        <select name="level" defaultValue="mid" className={select}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {t.levels[l]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">{iv.questions}</span>
        <select name="count" defaultValue="5" className={select}>
          {[3, 5, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
        <button type="submit" disabled={pending} className="btn">
          {pending ? iv.preparing : iv.start}
        </button>
        {state?.error && (
          <p role="alert" className="pen text-sm">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
