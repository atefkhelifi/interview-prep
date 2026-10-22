import Link from "next/link";
import { techs } from "@/lib/techs";

export const metadata = { title: "Study sheets" };

export default function StudyPage() {
  return (
    <div>
      <h1 className="page-title">Study sheets</h1>
      <p className="page-intro">Key ideas, common interview questions and traps for each tech.</p>
      <ul className="mt-8 divide-y divide-rule border-y border-rule">
        {techs.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/study/${t.slug}`}
              className="group grid gap-x-8 gap-y-1 py-5 sm:grid-cols-[minmax(0,15rem)_1fr_auto] sm:items-baseline"
            >
              <h2 className="text-lg font-bold tracking-tight group-hover:underline">{t.name}</h2>
              <p className="font-serif text-ink-soft">{t.blurb}</p>
              <p className="text-sm text-ink-soft tabular-nums">{t.topics.length} topics</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
