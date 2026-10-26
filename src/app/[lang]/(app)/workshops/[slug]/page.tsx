import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getDictionary } from "@/lib/i18n/server";
import { toClientSqlSpec } from "@/lib/sql-check";
import { getTech } from "@/lib/techs";
import { getWorkshop, isRunnable, runsOnServer, workshops } from "@/lib/workshops";
import { Workspace } from "./workspace";

export async function generateMetadata({ params }: PageProps<"/[lang]/workshops/[slug]">) {
  const [{ slug }, t] = await Promise.all([params, getDictionary()]);
  return { title: getWorkshop(slug)?.title ?? t.workshops.fallbackTitle };
}

export function generateStaticParams() {
  return workshops.map((w) => ({ slug: w.slug }));
}

export default async function WorkshopPage({ params }: PageProps<"/[lang]/workshops/[slug]">) {
  const [{ slug }, t] = await Promise.all([params, getDictionary()]);
  const ws = t.workshops;
  const workshop = getWorkshop(slug);
  if (!workshop) notFound();
  const onServer = runsOnServer(workshop);
  const runnable = isRunnable(workshop);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/workshops" className="link text-sm">
          {ws.all}
        </Link>
        <h1 className="page-title mt-3" lang="en">
          {workshop.title}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {getTech(workshop.tech)?.name}, <span className="lowercase">{t.levels[workshop.level] ?? workshop.level}</span>.{" "}
          {workshop.sql ? ws.howSql : !runnable ? ws.howReview : onServer ? ws.howServer : ws.howBrowser}{" "}
          {t.englishOnly}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="min-w-0" lang="en">
          <Markdown>{workshop.description}</Markdown>
        </section>
        <Workspace
          slug={workshop.slug}
          language={workshop.language}
          starter={workshop.starter}
          tests={onServer ? undefined : workshop.tests}
          sql={workshop.sql && toClientSqlSpec(workshop.sql)}
          serverTests={onServer && runnable}
        />
      </div>
    </div>
  );
}
