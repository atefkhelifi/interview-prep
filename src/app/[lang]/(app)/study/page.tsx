import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { techs } from "@/lib/techs";

export async function generateMetadata() {
  return { title: (await getDictionary()).study.title };
}

export default async function StudyPage() {
  const t = await getDictionary();
  return (
    <div>
      <h1 className="page-title">{t.study.title}</h1>
      <p className="page-intro">{t.study.intro}</p>
      <ul className="mt-8 divide-y divide-rule border-y border-rule">
        {techs.map((tech) => (
          <li key={tech.slug}>
            <Link
              href={`/study/${tech.slug}`}
              className="group grid gap-x-8 gap-y-1 py-5 sm:grid-cols-[minmax(0,15rem)_1fr_auto] sm:items-baseline"
            >
              <h2 className="text-lg font-bold tracking-tight group-hover:underline">{tech.name}</h2>
              <p className="font-serif text-ink-soft">{t.techBlurbs[tech.slug] ?? tech.blurb}</p>
              <p className="text-sm text-ink-soft tabular-nums">{t.study.topics(tech.topics.length)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
