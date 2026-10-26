import Link from "next/link";
import { LanguageSwitch } from "@/components/i18n";
import { PenScore } from "@/components/pen";
import { Wordmark } from "@/components/wordmark";
import type { Dict } from "@/lib/i18n/en";
import { getDictionary } from "@/lib/i18n/server";

export default async function Home() {
  const t = await getDictionary();
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Wordmark />
        <div className="flex items-center gap-5">
          <LanguageSwitch />
          {/* Signed-out visitors are sent to /login by the proxy. */}
          <Link href="/dashboard" className="link text-sm">
            {t.signIn}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16 md:pt-16">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <h1 className="text-[2.75rem] leading-[1.05] font-bold tracking-[-0.03em] md:text-[3.5rem]">
              {t.home.title}
            </h1>
            <p className="mt-5 max-w-[46ch] font-serif text-lg leading-relaxed text-ink-soft">{t.home.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="btn">
                {t.home.start}
              </Link>
              <span className="text-sm text-ink-soft">{t.home.model}</span>
            </div>
          </div>

          <SampleAnswer t={t.home.sample} />
        </div>

        <ul className="mt-20 grid gap-x-10 gap-y-8 border-t border-rule pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.parts.map((p) => (
            <li key={p.title}>
              <h2 className="font-bold">{p.title}</h2>
              <p className="mt-1.5 font-serif leading-relaxed text-ink-soft">{p.text}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-sm text-ink-soft">
        <Link href="/privacy" className="link">
          {t.privacy}
        </Link>
      </footer>
    </>
  );
}

// A graded interview answer, the way the app shows one.
function SampleAnswer({ t }: { t: Dict["home"]["sample"] }) {
  return (
    <figure
      className="sheet rounded-[3px] border border-rule bg-sheet py-6 pr-6 shadow-[0_1px_0_var(--rule),0_10px_30px_-18px_rgba(27,42,74,0.35)]"
      aria-label={t.label}
    >
      <div className="relative">
        <div className="in-margin top-0">
          <span className="text-sm font-semibold text-ink-soft">Q3</span>
        </div>
        <p className="text-sm text-ink-soft">{t.context}</p>
        <p className="mt-1 text-lg leading-snug font-semibold">{t.question}</p>
      </div>

      <div className="relative mt-5">
        <p className="ruled font-serif text-[1.0625rem] text-link">{t.answer}</p>
        <div className="in-margin top-1">
          <PenScore score={8} max={10} size="sm" />
        </div>
      </div>

      <div className="mt-5 border-l-2 border-margin pl-3">
        <p className="pen-hand text-xl leading-snug">{t.good}</p>
        <p className="pen-hand text-xl leading-snug">{t.missed}</p>
      </div>
    </figure>
  );
}
