import Link from "next/link";
import { PenScore } from "@/components/pen";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { getDashboardStats } from "@/lib/stats";
import { ScoreTrend } from "./score-trend";

export async function generateMetadata() {
  return { title: (await getDictionary()).dashboard.title };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, t] = await Promise.all([getDashboardStats(user.id), getDictionary()]);
  const d = t.dashboard;

  if (stats.interviewCount === 0) {
    return (
      <div>
        <h1 className="page-title">{d.welcome(user.name)}</h1>
        <p className="page-intro">{d.empty}</p>
        <Link href="/interview" className="btn mt-6">
          {d.startInterview}
        </Link>
      </div>
    );
  }

  const points = stats.trend.map((p) => ({
    ...p,
    level: t.levels[p.level] ?? p.level,
    label: new Date(p.date).toLocaleDateString(t.locale, { day: "numeric", month: "short" }),
  }));

  return (
    <div className="space-y-14">
      <div>
        <h1 className="page-title">{d.title}</h1>

        <section
          aria-label={d.summary}
          className="mt-8 flex flex-wrap items-end gap-x-16 gap-y-8 border-b border-rule pb-8"
        >
          <div>
            <p className="field-label">{d.average}</p>
            <div className="mt-3 pl-1">
              {stats.averageScore === null ? (
                <span className="text-2xl font-bold">{d.noneYet}</span>
              ) : (
                <PenScore score={stats.averageScore} max={100} size="lg" />
              )}
            </div>
          </div>
          <dl className="grid min-w-0 flex-1 basis-[28rem] gap-x-10 gap-y-5 sm:grid-cols-3">
            <Stat label={d.interviewsFinished} value={String(stats.interviewCount)} />
            <Stat label={d.workshopsPassed} value={d.passedOf(stats.workshopsPassed, stats.workshopCount)} />
            <Stat
              label={d.strongest}
              value={stats.bestTech?.name ?? d.noneYet}
              sub={stats.bestTech ? d.strongestSub(stats.bestTech.average) : undefined}
            />
          </dl>
        </section>
      </div>

      {stats.weakSpots.length > 0 && (
        <section>
          <h2 className="section-title">{d.weakTitle}</h2>
          <p className="mt-1 text-sm text-ink-soft">{d.weakIntro}</p>
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {stats.weakSpots.map((w) => (
              <li key={`${w.tech}-${w.topic}`} className="relative py-4">
                <div className="in-margin top-4">
                  <PenScore score={w.average} max={10} size="sm" />
                </div>
                <p>
                  <span className="font-semibold">{w.topic}</span>{" "}
                  <span className="text-ink-soft">{d.inTech(w.techName)}</span>
                </p>
                <div
                  className="mt-2 h-1.5 max-w-md rounded-full bg-chart-track"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={w.average}
                  aria-label={d.topicAverage(w.topic)}
                >
                  <div className="h-1.5 rounded-full bg-chart-1" style={{ width: `${w.average * 10}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 text-sm">
                  <Link href={`/study/${w.tech}#${w.anchor}`} className="link">
                    {d.review}
                  </Link>
                  <Link href={`/interview?tech=${w.tech}`} className="link">
                    {d.practice}
                  </Link>
                  <span className="text-ink-soft">{d.answered(w.count)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="section-title">{d.trendTitle}</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">{d.trendIntro}</p>
        <ScoreTrend points={points} />
        <TableView summary={d.showTable}>
          <thead>
            <tr>
              <th className="text-left">{d.date}</th>
              <th className="text-left">{d.tech}</th>
              <th className="text-left">{d.level}</th>
              <th className="text-right">{d.score}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/interview/${p.id}`} className="link">
                    {p.label}
                  </Link>
                </td>
                <td>{p.tech}</td>
                <td>{p.level}</td>
                <td className="text-right tabular-nums">{p.score}</td>
              </tr>
            ))}
          </tbody>
        </TableView>
      </section>

      <section>
        <h2 className="section-title">{d.perTechTitle}</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">{d.perTechIntro}</p>
        <ul className="max-w-3xl space-y-2.5">
          {stats.perTech.map((pt) => (
            <li key={pt.slug}>
              <Link
                href={`/interview?tech=${pt.slug}`}
                className="group relative grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-4 rounded-sm"
              >
                <span className="truncate text-sm group-hover:underline">{pt.name}</span>
                {pt.average === null ? (
                  <span className="text-sm text-chart-muted">{d.noInterviews}</span>
                ) : (
                  <span className="flex items-center gap-2">
                    {/* Bar: <=24px thick, 4px rounded data end, square at the baseline. */}
                    <span className="block h-4 min-w-1 rounded-r bg-chart-1" style={{ width: `${Math.max(pt.average, 1)}%` }} />
                    <span className="text-sm font-semibold tabular-nums">{pt.average}</span>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute -top-9 left-48 z-10 hidden rounded-[3px] border border-rule bg-sheet px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block group-focus-visible:block"
                    >
                      {d.perTechTooltip(pt.name, pt.average, pt.count)}
                    </span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <TableView summary={d.showTable}>
          <thead>
            <tr>
              <th className="text-left">{d.tech}</th>
              <th className="text-right">{d.interviews}</th>
              <th className="text-right">{d.average}</th>
            </tr>
          </thead>
          <tbody>
            {stats.perTech.map((pt) => (
              <tr key={pt.slug}>
                <td>{pt.name}</td>
                <td className="text-right tabular-nums">{pt.count}</td>
                <td className="text-right tabular-nums">{pt.average ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </TableView>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="field-label">{label}</dt>
      <dd className="mt-1 text-2xl leading-tight font-bold tracking-tight">{value}</dd>
      {sub && <dd className="text-xs text-ink-soft">{sub}</dd>}
    </div>
  );
}

function TableView({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="mt-4 max-w-3xl text-sm">
      <summary className="cursor-pointer text-ink-soft hover:text-ink">{summary}</summary>
      <table className="mt-2 w-full [&_td]:border-b [&_td]:border-rule [&_td]:py-1.5 [&_th]:py-1.5 [&_th]:font-semibold [&_th]:text-ink-soft">
        {children}
      </table>
    </details>
  );
}
