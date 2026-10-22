import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { toClientSqlSpec } from "@/lib/sql-check";
import { getTech } from "@/lib/techs";
import { getWorkshop, isRunnable, runsOnServer, workshops } from "@/lib/workshops";
import { Workspace } from "./workspace";

export async function generateMetadata({ params }: PageProps<"/workshops/[slug]">) {
  const { slug } = await params;
  return { title: getWorkshop(slug)?.title ?? "Workshop" };
}

export function generateStaticParams() {
  return workshops.map((w) => ({ slug: w.slug }));
}

export default async function WorkshopPage({ params }: PageProps<"/workshops/[slug]">) {
  const { slug } = await params;
  const workshop = getWorkshop(slug);
  if (!workshop) notFound();
  const onServer = runsOnServer(workshop);
  const runnable = isRunnable(workshop);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/workshops" className="link text-sm">
          All workshops
        </Link>
        <h1 className="page-title mt-3">{workshop.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {getTech(workshop.tech)?.name}, <span className="lowercase">{workshop.level}</span>.{" "}
          {workshop.sql
            ? "Your query runs on a SQLite database in your browser, then gets an AI review."
            : !runnable
              ? "No automatic tests for this task: you get an AI review."
              : onServer
                ? "Tests run in a sandbox on the server, then you can get an AI review."
                : "Tests run in your browser, then you can get an AI review."}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="min-w-0">
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
