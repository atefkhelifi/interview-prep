import Link from "next/link";
import { PenScore } from "@/components/pen";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/server";
import { getTech, techs } from "@/lib/techs";
import { StartForm } from "./start-form";

export async function generateMetadata() {
  return { title: (await getDictionary()).interview.title };
}

export default async function InterviewPage({ searchParams }: PageProps<"/[lang]/interview">) {
  const user = await requireUser();
  const [{ tech }, t] = await Promise.all([searchParams, getDictionary()]);
  const iv = t.interview;
  const defaultTech = typeof tech === "string" && getTech(tech) ? tech : undefined;

  const past = await prisma.interview.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div>
      <h1 className="page-title">{iv.title}</h1>
      <p className="page-intro">{iv.intro}</p>

      <StartForm techs={techs.map(({ slug, name }) => ({ slug, name }))} defaultTech={defaultTech} />
      <p className="mt-6 text-ink-soft">
        {iv.live.or}{" "}
        <Link href="/interview/live" className="link">
          {iv.live.link}
        </Link>
      </p>

      <section className="mt-14">
        <h2 className="section-title">{iv.yours}</h2>
        {past.length === 0 ? (
          <p className="mt-2 text-ink-soft">{iv.none}</p>
        ) : (
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {past.map((i) => (
              <li key={i.id} className="relative">
                {i.status === "done" && i.overallScore !== null && (
                  <div className="in-margin top-1/2 -translate-y-1/2">
                    <PenScore score={i.overallScore} max={100} size="sm" />
                  </div>
                )}
                <Link
                  href={`/interview/${i.id}`}
                  className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5"
                >
                  <span className="font-semibold group-hover:underline">
                    {getTech(i.tech)?.name ?? i.tech}, <span className="lowercase">{t.levels[i.level] ?? i.level}</span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    {i.status === "done" ? "" : iv.inProgress}
                    {iv.questionCount(i._count.questions)},{" "}
                    {i.createdAt.toLocaleDateString(t.locale, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
