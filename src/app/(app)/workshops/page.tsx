import Link from "next/link";
import { PenMark } from "@/components/pen";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { techs } from "@/lib/techs";
import { isRunnable, workshops } from "@/lib/workshops";

export const metadata = { title: "Workshops" };

export default async function WorkshopsPage() {
  const user = await requireUser();
  const attempts = await prisma.workshopAttempt.groupBy({
    by: ["workshop", "passed"],
    where: { userId: user.id },
  });
  const status = (slug: string) =>
    attempts.some((a) => a.workshop === slug && a.passed)
      ? "pass"
      : attempts.some((a) => a.workshop === slug)
        ? "tried"
        : null;

  return (
    <div>
      <h1 className="page-title">Workshops</h1>
      <p className="page-intro">
        Coding tasks to solve in the editor. Most run real tests on your code, and every task can get an AI code
        review.
      </p>

      <div className="mt-10 space-y-12">
        {techs.map((tech) => {
          const list = workshops.filter((w) => w.tech === tech.slug);
          if (list.length === 0) return null;
          return (
            <section key={tech.slug}>
              <h2 className="section-title">{tech.name}</h2>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {list.map((w) => {
                  const s = status(w.slug);
                  return (
                    <li key={w.slug} className="relative">
                      {s && (
                        <div className="in-margin top-1/2 -translate-y-1/2">
                          <PenMark kind={s} />
                        </div>
                      )}
                      <Link
                        href={`/workshops/${w.slug}`}
                        className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5"
                      >
                        <span className="font-semibold group-hover:underline">{w.title}</span>
                        <span className="text-sm text-ink-soft">
                          <span className="capitalize">{w.level}</span>,{" "}
                          {w.sql ? "runs SQL + AI review" : isRunnable(w) ? "tests + AI review" : "AI review"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
