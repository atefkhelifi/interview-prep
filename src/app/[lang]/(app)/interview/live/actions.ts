"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { getActionLocale } from "@/lib/i18n/server";
import { createLiveToken, gradeLiveInterview, liveAvailable, liveSetup, LIVE_MAX_SECONDS } from "@/lib/live";
import { LEVELS, getTech } from "@/lib/techs";

const optionsSchema = z.object({
  tech: z.string(),
  level: z.enum(LEVELS),
  count: z.coerce.number().int().min(3).max(8),
});

export type LiveStart =
  | { error: string }
  | { token: string; setup: ReturnType<typeof liveSetup>; maxSeconds: number };

export async function startLive(options: z.input<typeof optionsSchema>): Promise<LiveStart> {
  await requireUser();
  const lang = await getActionLocale();
  const t = getDict(lang).interview;
  if (!liveAvailable()) return { error: t.live.unavailable };
  const parsed = optionsSchema.safeParse(options);
  const tech = parsed.success ? getTech(parsed.data.tech) : undefined;
  if (!parsed.success || !tech) return { error: t.errors.pick };

  const setup = liveSetup(tech, parsed.data.level, lang, parsed.data.count);
  try {
    return { token: await createLiveToken(setup), setup, maxSeconds: LIVE_MAX_SECONDS };
  } catch (e) {
    console.error(e);
    return { error: t.live.errors.connect };
  }
}

const finishSchema = z.object({
  tech: z.string(),
  level: z.enum(LEVELS),
  lines: z
    .array(z.object({ role: z.enum(["ai", "you"]), text: z.string().max(5000) }))
    .max(400),
});

export async function finishLive(input: z.input<typeof finishSchema>): Promise<{ error: string }> {
  const user = await requireUser();
  const lang = await getActionLocale();
  const t = getDict(lang).interview;
  const parsed = finishSchema.safeParse(input);
  const tech = parsed.success ? getTech(parsed.data.tech) : undefined;
  if (!parsed.success || !tech) return { error: t.errors.pick };

  let result;
  try {
    result = await gradeLiveInterview(tech, parsed.data.level, lang, parsed.data.lines);
  } catch (e) {
    console.error(e);
    return { error: t.errors.ai };
  }
  if (!result) return { error: t.live.errors.noAnswers };

  const interview = await prisma.interview.create({
    data: {
      userId: user.id,
      tech: tech.slug,
      level: parsed.data.level,
      lang,
      status: "done",
      questionCount: result.questions.length,
      overallScore: result.overallScore,
      summary: result.summary,
      finishedAt: new Date(),
      questions: { create: result.questions },
    },
  });
  redirect(`/interview/${interview.id}`);
}
