import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { getHrGuide } from "@/lib/hr";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getDictionary()).hr.title };
}

export default async function HrGuidePage() {
  const locale = await getLocale();
  const [guide, t] = await Promise.all([getHrGuide(locale), getDictionary()]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <article className="max-w-[68ch] min-w-0">
        <Markdown>{guide.markdown}</Markdown>
      </article>
      <aside className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start">
        <h2 className="field-label">{t.hr.onThisPage}</h2>
        <nav aria-label={t.hr.sections} className="mt-2 border-l border-rule">
          <ul className="space-y-1.5 text-sm">
            {guide.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-ink-soft hover:border-ink hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Link href="/cv" className="btn mt-6">
          {t.hr.toPitch}
        </Link>
      </aside>
    </div>
  );
}
