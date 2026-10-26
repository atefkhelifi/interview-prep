"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDict, isLocale } from "@/lib/i18n";
import { getActionLocale } from "@/lib/i18n/server";
import { generateQuestion, gradeAnswer, nextTopic, summarizeInterview } from "@/lib/interview";
import { LEVELS, getTech } from "@/lib/techs";

export type FormState = { error?: string } | undefined;

const startSchema = z.object({
  tech: z.string(),
  level: z.enum(LEVELS),
  count: z.coerce.number().int().min(3).max(10),
});

export async function startInterview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const lang = await getActionLocale();
  const errors = getDict(lang).interview.errors;
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  const tech = parsed.success ? getTech(parsed.data.tech) : undefined;
  if (!parsed.success || !tech) return { error: errors.pick };

  const topic = nextTopic(tech, []);
  let prompt: string;
  try {
    prompt = await generateQuestion(tech, parsed.data.level, lang, topic, []);
  } catch (e) {
    console.error(e);
    return { error: errors.ai };
  }

  const interview = await prisma.interview.create({
    data: {
      userId: user.id,
      tech: tech.slug,
      level: parsed.data.level,
      lang,
      questionCount: parsed.data.count,
      questions: { create: { order: 1, topic, prompt } },
    },
  });
  redirect(`/interview/${interview.id}`);
}

async function loadActiveInterview(userId: string, interviewId: string) {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, userId, status: "active" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  const tech = interview && getTech(interview.tech);
  if (!interview || !tech) return null;
  // The whole interview stays in the language it was started in.
  return { interview, tech, lang: isLocale(interview.lang) ? interview.lang : "en" };
}

export async function answerQuestion(interviewId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const errors = getDict(await getActionLocale()).interview.errors;
  const answerSchema = z.string().trim().min(1, errors.empty).max(5000, errors.tooLong);
  const parsed = answerSchema.safeParse(String(formData.get("answer") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const loaded = await loadActiveInterview(user.id, interviewId);
  if (!loaded) redirect(`/interview/${interviewId}`);
  const { interview, tech, lang } = loaded;
  const current = interview.questions.find((q) => q.answer === null);
  if (!current) redirect(`/interview/${interviewId}`);

  const history = interview.questions.map((q) =>
    q.id === current.id ? { ...q, answer: parsed.data } : q,
  );
  const isLast = current.order >= interview.questionCount;
  const next = isLast
    ? null
    : {
        topic: nextTopic(tech, interview.questions.filter((q) => !q.isFollowUp).map((q) => q.topic)),
        allowFollowUp: !current.isFollowUp,
      };

  let grade;
  try {
    grade = await gradeAnswer(tech, interview.level, lang, history, next);
  } catch (e) {
    console.error(e);
    return { error: errors.ai };
  }

  // `answer: null` guard makes a double submit a no-op.
  const saved = await prisma.$transaction(async (tx) => {
    const { count } = await tx.question.updateMany({
      where: { id: current.id, answer: null },
      data: { answer: parsed.data, score: grade.score, feedback: grade.feedback },
    });
    if (count === 0) return false;
    if (next && grade.nextQuestion) {
      await tx.question.create({
        data: {
          interviewId,
          order: current.order + 1,
          topic: grade.followUp ? current.topic : next.topic,
          isFollowUp: grade.followUp,
          prompt: grade.nextQuestion,
        },
      });
    }
    return true;
  });

  if (saved && isLast) return finalize(user.id, interviewId);
  redirect(`/interview/${interviewId}`);
}

export async function finishInterview(interviewId: string): Promise<FormState> {
  const user = await requireUser();
  return finalize(user.id, interviewId);
}

async function finalize(userId: string, interviewId: string): Promise<FormState> {
  const loaded = await loadActiveInterview(userId, interviewId);
  if (!loaded) redirect(`/interview/${interviewId}`);
  const { interview, tech, lang } = loaded;

  const answered = interview.questions.filter((q) => q.answer !== null && q.score !== null);
  if (answered.length === 0) {
    await prisma.interview.delete({ where: { id: interviewId } });
    redirect("/interview");
  }

  let summary: string;
  try {
    summary = await summarizeInterview(tech, interview.level, lang, answered);
  } catch (e) {
    console.error(e);
    return { error: getDict(await getActionLocale()).interview.errors.ai };
  }

  const avg = answered.reduce((sum, q) => sum + (q.score ?? 0), 0) / answered.length;
  await prisma.$transaction([
    prisma.question.deleteMany({ where: { interviewId, answer: null } }),
    prisma.interview.update({
      where: { id: interviewId },
      data: { status: "done", overallScore: Math.round(avg * 10), summary, finishedAt: new Date() },
    }),
  ]);
  redirect(`/interview/${interviewId}`);
}
