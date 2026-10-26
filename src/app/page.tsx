import Link from "next/link";
import { PenScore } from "@/components/pen";
import { Wordmark } from "@/components/wordmark";

const parts = [
  { title: "Study sheets", text: "Key ideas, common questions and traps for 8 stacks, from JavaScript to Docker." },
  { title: "Workshops", text: "27 coding tasks with real tests, plus an AI code review of your solution." },
  { title: "Mock interviews", text: "Typed or spoken answers, follow-up questions, a score and feedback for each." },
  { title: "Dashboard", text: "Your scores over time and the topics that keep costing you points." },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Wordmark />
        {/* Signed-out visitors are sent to /login by the proxy. */}
        <Link href="/dashboard" className="link text-sm">
          Sign in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16 md:pt-16">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <h1 className="text-[2.75rem] leading-[1.05] font-bold tracking-[-0.03em] md:text-[3.5rem]">
              Get graded before the real interview.
            </h1>
            <p className="mt-5 max-w-[46ch] font-serif text-lg leading-relaxed text-ink-soft">
              An AI interviewer asks the questions, follows up, and marks every answer against the key points a
              strong candidate would cover, quoting your own words as proof.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="btn">
                Start practicing
              </Link>
              <span className="text-sm text-ink-soft">Graded by Gemma, Google&apos;s open model.</span>
            </div>
          </div>

          <SampleAnswer />
        </div>

        <ul className="mt-20 grid gap-x-10 gap-y-8 border-t border-rule pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {parts.map((p) => (
            <li key={p.title}>
              <h2 className="font-bold">{p.title}</h2>
              <p className="mt-1.5 font-serif leading-relaxed text-ink-soft">{p.text}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-sm text-ink-soft">
        <Link href="/privacy" className="link">
          Privacy policy
        </Link>
      </footer>
    </>
  );
}

// A graded interview answer, the way the app shows one.
function SampleAnswer() {
  return (
    <figure
      className="sheet rounded-[3px] border border-rule bg-sheet py-6 pr-6 shadow-[0_1px_0_var(--rule),0_10px_30px_-18px_rgba(27,42,74,0.35)]"
      aria-label="Example of a graded answer"
    >
      <div className="relative">
        <div className="in-margin top-0">
          <span className="text-sm font-semibold text-ink-soft">Q3</span>
        </div>
        <p className="text-sm text-ink-soft">React, mid level</p>
        <p className="mt-1 text-lg leading-snug font-semibold">What does the dependency array of useEffect control?</p>
      </div>

      <div className="relative mt-5">
        <p className="ruled font-serif text-[1.0625rem] text-link">
          It tells React when to run the effect again. With an empty array it runs once after the first render, and
          the cleanup runs on unmount. If you leave a value out, the effect keeps a stale copy of it.
        </p>
        <div className="in-margin top-1">
          <PenScore score={8} max={10} size="sm" />
        </div>
      </div>

      <div className="mt-5 border-l-2 border-margin pl-3">
        <p className="pen-hand text-xl leading-snug">Good: cleanup and stale values.</p>
        <p className="pen-hand text-xl leading-snug">Missed: with no array, it runs after every render.</p>
      </div>
    </figure>
  );
}
