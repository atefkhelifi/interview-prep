import Link from "next/link";
import { PenScore } from "@/components/pen";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";
import { ScoreTrend } from "./score-trend";

export const metadata = { title: "Dashboard" };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats(user.id);

  if (stats.interviewCount === 0) {
    return (
      <div>
        <h1 className="page-title">Welcome, {user.name}</h1>
        <p className="page-intro">
          Finish your first mock interview to see your scores, your progress and the topics to work on here.
        </p>
        <Link href="/interview" className="btn mt-6">
          Start a mock interview
        </Link>
      </div>
    );
  }

  const points = stats.trend.map((t) => ({ ...t, label: fmtDate(t.date) }));

  return (
    <div className="space-y-14">
      <div>
        <h1 className="page-title">Dashboard</h1>

        <section
          aria-label="Summary"
          className="mt-8 flex flex-wrap items-end gap-x-16 gap-y-8 border-b border-rule pb-8"
        >
          <div>
            <p className="field-label">Average score</p>
            <div className="mt-3 pl-1">
              {stats.averageScore === null ? (
                <span className="text-2xl font-bold">None yet</span>
              ) : (
                <PenScore score={stats.averageScore} max={100} size="lg" />
              )}
            </div>
          </div>
          <dl className="grid min-w-0 flex-1 basis-[28rem] gap-x-10 gap-y-5 sm:grid-cols-3">
            <Stat label="Interviews finished" value={String(stats.interviewCount)} />
            <Stat label="Workshops passed" value={`${stats.workshopsPassed} of ${stats.workshopCount}`} />
            <Stat
              label="Strongest tech"
              value={stats.bestTech?.name ?? "None yet"}
              sub={stats.bestTech ? `${stats.bestTech.average} out of 100 on average` : undefined}
            />
          </dl>
        </section>
      </div>

      {stats.weakSpots.length > 0 && (
        <section>
          <h2 className="section-title">Topics to work on</h2>
          <p className="mt-1 text-sm text-ink-soft">Your lowest-scoring topics, average per question out of 10.</p>
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {stats.weakSpots.map((w) => (
              <li key={`${w.tech}-${w.topic}`} className="relative py-4">
                <div className="in-margin top-4">
                  <PenScore score={w.average} max={10} size="sm" />
                </div>
                <p>
                  <span className="font-semibold">{w.topic}</span>{" "}
                  <span className="text-ink-soft">in {w.techName}</span>
                </p>
                <div
                  className="mt-2 h-1.5 max-w-md rounded-full bg-chart-track"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={w.average}
                  aria-label={`${w.topic} average`}
                >
                  <div className="h-1.5 rounded-full bg-chart-1" style={{ width: `${w.average * 10}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 text-sm">
                  <Link href={`/study/${w.tech}#${w.anchor}`} className="link">
                    Review topic
                  </Link>
                  <Link href={`/interview?tech=${w.tech}`} className="link">
                    Practice
                  </Link>
                  <span className="text-ink-soft">
                    {w.count} question{w.count === 1 ? "" : "s"} answered
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="section-title">Score over time</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          Overall score of each finished interview. Click a point to open it.
        </p>
        <ScoreTrend points={points} />
        <TableView>
          <thead>
            <tr>
              <th className="text-left">Date</th>
              <th className="text-left">Tech</th>
              <th className="text-left">Level</th>
              <th className="text-right">Score</th>
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
                <td className="capitalize">{p.level}</td>
                <td className="text-right tabular-nums">{p.score}</td>
              </tr>
            ))}
          </tbody>
        </TableView>
      </section>

      <section>
        <h2 className="section-title">Average score by tech</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">Out of 100. Pick a tech to practice it.</p>
        <ul className="max-w-3xl space-y-2.5">
          {stats.perTech.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/interview?tech=${t.slug}`}
                className="group relative grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-4 rounded-sm"
              >
                <span className="truncate text-sm group-hover:underline">{t.name}</span>
                {t.average === null ? (
                  <span className="text-sm text-chart-muted">No interviews yet</span>
                ) : (
                  <span className="flex items-center gap-2">
                    {/* Bar: <=24px thick, 4px rounded data end, square at the baseline. */}
                    <span className="block h-4 min-w-1 rounded-r bg-chart-1" style={{ width: `${Math.max(t.average, 1)}%` }} />
                    <span className="text-sm font-semibold tabular-nums">{t.average}</span>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute -top-9 left-48 z-10 hidden rounded-[3px] border border-rule bg-sheet px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block group-focus-visible:block"
                    >
                      {t.name}: {t.average}/100 over {t.count} interview{t.count === 1 ? "" : "s"}
                    </span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <TableView>
          <thead>
            <tr>
              <th className="text-left">Tech</th>
              <th className="text-right">Interviews</th>
              <th className="text-right">Average</th>
            </tr>
          </thead>
          <tbody>
            {stats.perTech.map((t) => (
              <tr key={t.slug}>
                <td>{t.name}</td>
                <td className="text-right tabular-nums">{t.count}</td>
                <td className="text-right tabular-nums">{t.average ?? "—"}</td>
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

function TableView({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-4 max-w-3xl text-sm">
      <summary className="cursor-pointer text-ink-soft hover:text-ink">Show as table</summary>
      <table className="mt-2 w-full [&_td]:border-b [&_td]:border-rule [&_td]:py-1.5 [&_th]:py-1.5 [&_th]:font-semibold [&_th]:text-ink-soft">
        {children}
      </table>
    </details>
  );
}
