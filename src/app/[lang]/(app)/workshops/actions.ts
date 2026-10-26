"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { runOnServer } from "@/lib/code-runner";
import { prisma } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { getActionLocale } from "@/lib/i18n/server";
import { reviewCode, type Review } from "@/lib/review";
import { getWorkshop, isRunnable, runsOnServer, type RunResult } from "@/lib/workshops";

type Errors = ReturnType<typeof getDict>["workshops"]["errors"];
const codeSchema = (errors: Errors) => z.string().trim().min(1, errors.empty).max(20_000, errors.tooLong);

// Browser test results come from the user's own browser, so `passed` is self-reported practice data.
const runSchema = z.object({ passed: z.number().int().min(0), total: z.number().int().min(1) });

export async function saveTestRun(slug: string, code: string, run: { passed: number; total: number }) {
  const user = await requireUser();
  const workshop = getWorkshop(slug);
  const parsedCode = z.string().trim().min(1).max(20_000).safeParse(code);
  const parsedRun = runSchema.safeParse(run);
  // Server-run tasks save their own attempts in runServerTests.
  if (!workshop || !isRunnable(workshop) || runsOnServer(workshop) || !parsedCode.success || !parsedRun.success) return;

  await prisma.workshopAttempt.create({
    data: {
      userId: user.id,
      tech: workshop.tech,
      workshop: workshop.slug,
      code: parsedCode.data,
      passed: parsedRun.data.passed === parsedRun.data.total,
    },
  });
}

export async function runServerTests(slug: string, code: string): Promise<RunResult> {
  const user = await requireUser();
  const errors = getDict(await getActionLocale()).workshops.errors;
  const workshop = getWorkshop(slug);
  if (!workshop || !runsOnServer(workshop) || !isRunnable(workshop)) {
    return { results: [], logs: [], error: errors.cantRun };
  }
  const parsedCode = codeSchema(errors).safeParse(code);
  if (!parsedCode.success) return { results: [], logs: [], error: parsedCode.error.issues[0].message };

  const run = await runOnServer(workshop, parsedCode.data);
  if (run.results.length > 0) {
    await prisma.workshopAttempt.create({
      data: {
        userId: user.id,
        tech: workshop.tech,
        workshop: workshop.slug,
        code: parsedCode.data,
        passed: !run.error && run.results.every((r) => r.passed),
      },
    });
  }
  return run;
}

export async function requestReview(
  slug: string,
  code: string,
  run?: { passed: number; total: number },
): Promise<{ review?: Review; error?: string }> {
  const user = await requireUser();
  const lang = await getActionLocale();
  const errors = getDict(lang).workshops.errors;
  const workshop = getWorkshop(slug);
  if (!workshop) return { error: errors.unknown };
  const parsedCode = codeSchema(errors).safeParse(code);
  if (!parsedCode.success) return { error: parsedCode.error.issues[0].message };
  const parsedRun = run ? runSchema.safeParse(run) : undefined;
  const testRun = parsedRun?.success ? parsedRun.data : undefined;

  let review: Review;
  try {
    review = await reviewCode(
      workshop,
      parsedCode.data,
      lang,
      testRun ? `${testRun.passed} of ${testRun.total} tests passed` : undefined,
    );
  } catch (e) {
    console.error(e);
    return { error: errors.ai };
  }

  await prisma.workshopAttempt.create({
    data: {
      userId: user.id,
      tech: workshop.tech,
      workshop: workshop.slug,
      code: parsedCode.data,
      // Runnable tasks: tests decide. Review-only tasks: the AI verdict decides.
      passed: isRunnable(workshop) && testRun ? testRun.passed === testRun.total : review.verdict === "correct",
      review: review.markdown,
    },
  });
  return { review };
}
