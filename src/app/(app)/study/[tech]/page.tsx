import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getStudySheet } from "@/lib/study";
import { getTech, techs } from "@/lib/techs";

export async function generateMetadata({ params }: PageProps<"/study/[tech]">) {
  const { tech } = await params;
  return { title: `${getTech(tech)?.name ?? "Study"} study sheet` };
}

export function generateStaticParams() {
  return techs.map((t) => ({ tech: t.slug }));
}

export default async function StudySheetPage({ params }: PageProps<"/study/[tech]">) {
  const { tech: slug } = await params;
  const sheet = await getStudySheet(slug);
  if (!sheet) notFound();

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <article className="max-w-[68ch] min-w-0">
        <Link href="/study" className="link text-sm">
          All study sheets
        </Link>
        <div className="mt-4">
          <Markdown>{sheet.markdown}</Markdown>
        </div>
      </article>
      <aside className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start">
        <h2 className="field-label">On this sheet</h2>
        <nav aria-label="Sections" className="mt-2 border-l border-rule">
          <ul className="space-y-1.5 text-sm">
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
          Practice this tech
        </Link>
      </aside>
    </div>
  );
}
