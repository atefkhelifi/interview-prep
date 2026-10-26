import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getDictionary } from "@/lib/i18n/server";
import { getStudySheet } from "@/lib/study";
import { getTech, techs } from "@/lib/techs";

export async function generateMetadata({ params }: PageProps<"/[lang]/study/[tech]">) {
  const [{ tech }, t] = await Promise.all([params, getDictionary()]);
  const name = getTech(tech)?.name;
  return { title: name ? t.study.sheetTitle(name) : t.study.title };
}

export function generateStaticParams() {
  return techs.map((t) => ({ tech: t.slug }));
}

export default async function StudySheetPage({ params }: PageProps<"/[lang]/study/[tech]">) {
  const { tech: slug } = await params;
  const [sheet, t] = await Promise.all([getStudySheet(slug), getDictionary()]);
  if (!sheet) notFound();

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <article className="max-w-[68ch] min-w-0">
        <Link href="/study" className="link text-sm">
          {t.study.all}
        </Link>
        {t.englishOnly && <p className="mt-2 text-sm text-ink-soft">{t.englishOnly}</p>}
        <div className="mt-4" lang="en">
          <Markdown>{sheet.markdown}</Markdown>
        </div>
      </article>
      <aside className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start">
        <h2 className="field-label">{t.study.onThisSheet}</h2>
        <nav aria-label={t.study.sections} className="mt-2 border-l border-rule">
          <ul className="space-y-1.5 text-sm" lang="en">
            {sheet.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-ink-soft hover:border-ink hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Link href={`/interview?tech=${sheet.tech.slug}`} className="btn mt-6">
          {t.study.practice}
        </Link>
      </aside>
    </div>
  );
}
