"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { runOnServer } from "@/lib/code-runner";
import { prisma } from "@/lib/db";
import { reviewCode, type Review } from "@/lib/review";
import { getWorkshop, isRunnable, runsOnServer, type RunResult } from "@/lib/workshops";

const codeSchema = z.string().trim().min(1, "Write some code first.").max(20_000, "Code is too long (20,000 characters max).");

// Browser test results come from the user's own browser, so `passed` is self-reported practice data.
const runSchema = z.object({ passed: z.number().int().min(0), total: z.number().int().min(1) });

export async function saveTestRun(slug: string, code: string, run: { passed: number; total: number }) {
  const user = await requireUser();
  const workshop = getWorkshop(slug);
  const parsedCode = codeSchema.safeParse(code);
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
  const workshop = getWorkshop(slug);
  if (!workshop || !runsOnServer(workshop) || !isRunnable(workshop)) {
    return { results: [], logs: [], error: "Tests can't run for this task." };
  }
  const parsedCode = codeSchema.safeParse(code);
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
  const workshop = getWorkshop(slug);
  if (!workshop) return { error: "Unknown workshop." };
  const parsedCode = codeSchema.safeParse(code);
  if (!parsedCode.success) return { error: parsedCode.error.issues[0].message };
  const parsedRun = run ? runSchema.safeParse(run) : undefined;
  const testRun = parsedRun?.success ? parsedRun.data : undefined;

  let review: Review;
  try {
    review = await reviewCode(
      workshop,
      parsedCode.data,
      testRun ? `${testRun.passed} of ${testRun.total} tests passed` : undefined,
    );
  } catch (e) {
    console.error(e);
    return { error: "The AI model did not respond correctly. Check that it is running, then try again." };
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
