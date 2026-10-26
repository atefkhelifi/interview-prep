import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { PenScore } from "@/components/pen";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/server";
import { getTech } from "@/lib/techs";
import { answerQuestion, finishInterview } from "../actions";
import { AnswerForm } from "./answer-form";

export async function generateMetadata() {
  return { title: (await getDictionary()).interview.title };
}

export default async function InterviewSessionPage({ params }: PageProps<"/[lang]/interview/[id]">) {
  const user = await requireUser();
  const [{ id }, t] = await Promise.all([params, getDictionary()]);
  const iv = t.interview;
  const interview = await prisma.interview.findFirst({
    where: { id, userId: user.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!interview) notFound();

  const tech = getTech(interview.tech);
  const done = interview.status === "done";
  const answered = interview.questions.filter((q) => q.answer !== null);
  const current = done ? undefined : interview.questions.find((q) => q.answer === null);
  // The AI writes in the language the interview was started in, whatever the UI language is now.
  const contentLang = interview.lang;

  return (
    <div className="max-w-3xl">
      <Link href="/interview" className="link text-sm">
        {iv.all}
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="page-title">
          {tech?.name ?? interview.tech}, <span className="lowercase">{t.levels[interview.level] ?? interview.level}</span>
        </h1>
        {!done && <p className="text-sm text-ink-soft">{iv.progress(answered.length + 1, interview.questionCount)}</p>}
      </div>

      {done && interview.overallScore !== null && (
        <section className="relative mt-8 border-y border-rule py-6">
          <h2 className="sr-only">{iv.result}</h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <PenScore score={interview.overallScore} max={100} size="lg" />
            <div className="flex flex-wrap gap-x-5 text-sm">
              <Link href="/dashboard" className="link">
                {iv.viewDashboard}
              </Link>
              {tech && (
                <Link href={`/study/${tech.slug}`} className="link">
                  {iv.reviewSheet}
                </Link>
              )}
            </div>
          </div>
          {interview.summary && (
            <div className="mt-5" lang={contentLang}>
              <Markdown>{interview.summary}</Markdown>
            </div>
          )}
        </section>
      )}

      <ol className="mt-8 divide-y divide-rule">
        {answered.map((q, i) => (
          <li key={q.id} className="relative py-6 first:pt-0">
            <QuestionHead number={i + 1} topic={q.topic} followUp={q.isFollowUp && iv.followUp} />
            <div lang={contentLang}>
              <Markdown>{q.prompt}</Markdown>
            </div>
            <div className="relative mt-3">
              <p className="ruled font-serif whitespace-pre-wrap text-link">{q.answer}</p>
              {q.score !== null && (
                <div className="in-margin top-0">
                  <PenScore score={q.score} max={10} size="sm" />
                </div>
              )}
            </div>
            {q.feedback && (
              <div className="mt-3 border-l-2 border-margin pl-3" lang={contentLang}>
                <Markdown tone="pen">{q.feedback}</Markdown>
              </div>
            )}
          </li>
        ))}
      </ol>

      {current && (
        <section className={`relative ${answered.length ? "mt-2 border-t-2 border-ink pt-6" : ""}`}>
          <QuestionHead number={answered.length + 1} topic={current.topic} followUp={current.isFollowUp && iv.followUp} />
          <div lang={contentLang}>
            <Markdown>{current.prompt}</Markdown>
          </div>
          <div className="mt-4">
            <AnswerForm
              key={current.id}
              question={current.prompt}
              speechLang={contentLang === "fr" ? "fr-FR" : "en-US"}
              answerAction={answerQuestion.bind(null, interview.id)}
              finishAction={finishInterview.bind(null, interview.id)}
              canFinish={answered.length > 0}
            />
          </div>
        </section>
      )}
    </div>
  );
}

// Question number sits in the margin, like on an exam paper.
function QuestionHead({ number, topic, followUp }: { number: number; topic: string; followUp: string | false }) {
  return (
    <>
      <div className="in-margin">
        <span className="text-sm font-semibold text-ink-soft">Q{number}</span>
      </div>
      <p className="mb-1 text-sm text-ink-soft">
        {topic}
        {followUp}
      </p>
    </>
  );
}
