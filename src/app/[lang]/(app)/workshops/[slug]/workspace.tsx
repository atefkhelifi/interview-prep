"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useI18n } from "@/components/i18n";
import { Markdown } from "@/components/markdown";
import type { Review } from "@/lib/review";
import type { ClientSqlSpec } from "@/lib/sql-check";
import type { RunResult } from "@/lib/workshops";
import { requestReview, runServerTests, saveTestRun } from "../actions";
import { runJsTests, runPythonTests, runSqlTests, warmUpPython } from "./sandbox";

// `tests` / `sql` run in the browser; `serverTests` means the server runs the tests (Java, C#).
type Props = { slug: string; language: string; starter: string; tests?: string; sql?: ClientSqlSpec; serverTests?: boolean };

function runInBrowser(language: string, code: string, tests?: string, sql?: ClientSqlSpec) {
  if (sql) return runSqlTests(code, sql);
  return language === "python" ? runPythonTests(code, tests!) : runJsTests(code, tests!);
}

const draftKey = (slug: string) => `workshop-draft:${slug}`;

function loadDraft(slug: string) {
  try {
    return localStorage.getItem(draftKey(slug));
  } catch {
    return null;
  }
}

function saveDraft(slug: string, code: string) {
  try {
    localStorage.setItem(draftKey(slug), code);
  } catch {
    // storage unavailable (private mode etc.): drafts just aren't kept
  }
}

const darkQuery = "(prefers-color-scheme: dark)";

function usePrefersDark() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(darkQuery);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(darkQuery).matches,
    () => false,
  );
}

export function Workspace({ slug, language, starter, tests, sql, serverTests }: Props) {
  const runnable = Boolean(tests || sql || serverTests);
  // The editor only mounts in the browser, so reading the draft here can't cause a hydration mismatch.
  const [code, setCode] = useState(() => (typeof window === "undefined" ? starter : (loadDraft(slug) ?? starter)));
  const [run, setRun] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewing, startReview] = useTransition();
  const dark = usePrefersDark();
  const { t } = useI18n();
  const ws = t.workshops;

  // Load Python while the user reads the task.
  useEffect(() => {
    if (language === "python" && tests) warmUpPython();
  }, [language, tests]);

  const passed = run?.results.filter((r) => r.passed).length ?? 0;
  const total = run?.results.length ?? 0;
  const runSummary = run && total > 0 ? { passed, total } : undefined;

  async function onRun() {
    if (!runnable) return;
    setRunning(true);
    let result: RunResult;
    try {
      // The server saves its own attempts; browser runs report theirs.
      result = serverTests ? await runServerTests(slug, code) : await runInBrowser(language, code, tests, sql);
    } catch {
      result = { results: [], logs: [], error: ws.noServer };
    }
    setRun(result);
    setRunning(false);
    const okTotal = result.results.length;
    if (!serverTests && okTotal > 0) {
      saveTestRun(slug, code, { passed: result.results.filter((r) => r.passed).length, total: okTotal });
    }
  }

  function onReview() {
    setReviewError(null);
    startReview(async () => {
      const res = await requestReview(slug, code, runSummary);
      if (res.error) setReviewError(res.error);
      else setReview(res.review ?? null);
    });
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="overflow-hidden rounded-[3px] border border-rule">
        <Editor
          height="420px"
          language={language}
          value={code}
          theme={dark ? "vs-dark" : "light"}
          onChange={(v) => {
            setCode(v ?? "");
            saveDraft(slug, v ?? "");
          }}
          options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, tabSize: 2 }}
          loading={<p className="p-4 text-sm text-ink-soft">{ws.loadingEditor}</p>}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {runnable && (
          <button type="button" onClick={onRun} disabled={running} className="btn">
            {running ? ws.running : sql ? ws.runQuery : ws.runTests}
          </button>
        )}
        <button type="button" onClick={onReview} disabled={reviewing} className={runnable ? "btn-line" : "btn"}>
          {reviewing ? ws.reviewing : ws.getReview}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm(ws.resetConfirm)) return;
            setCode(starter);
            saveDraft(slug, starter);
            setRun(null);
          }}
          className="link text-sm text-ink-soft"
        >
          {ws.reset}
        </button>
      </div>

      {run && (
        <div className="border-t border-rule pt-4" aria-live="polite">
          {run.error ? (
            <p className="pen text-sm whitespace-pre-wrap">{run.error}</p>
          ) : (
            <p className="pen-hand text-2xl leading-tight">
              {passed === total
                ? ws.allPassed(total, Boolean(sql))
                : ws.somePassed(passed, total, Boolean(sql))}
            </p>
          )}
          <ul className="mt-3 space-y-1.5 text-sm">
            {run.results.map((r) => (
              <li key={r.name} className="grid grid-cols-[1.25rem_1fr] gap-x-2">
                <span className="pen font-bold" aria-label={r.passed ? ws.passed : ws.failed}>
                  {r.passed ? "✓" : "✗"}
                </span>
                <span>
                  {r.name}
                  {r.error && <span className="pen block font-mono text-xs">{r.error}</span>}
                </span>
              </li>
            ))}
          </ul>
          {run.logs.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-ink-soft hover:text-ink">{ws.console(run.logs.length)}</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-[3px] border border-rule bg-sheet p-2 text-xs">{run.logs.join("\n")}</pre>
            </details>
          )}
        </div>
      )}

      {reviewError && (
        <p role="alert" className="pen text-sm">
          {reviewError}
        </p>
      )}

      {review && (
        <div className="border-t border-rule pt-4" aria-live="polite">
          <p className="pen-hand text-2xl leading-tight">
            {review.verdict === "correct" ? ws.correct : review.verdict === "partial" ? ws.partial : ws.incorrect}
          </p>
          <div className="mt-2 border-l-2 border-margin pl-4">
            <Markdown tone="pen">{review.markdown}</Markdown>
          </div>
        </div>
      )}
    </section>
  );
}
