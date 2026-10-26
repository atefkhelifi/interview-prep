import Link from "next/link";
import { Suspense } from "react";
import { LanguageSwitch } from "@/components/i18n";
import { Wordmark } from "@/components/wordmark";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

// The shell stays static; only the user menu waits on the session.
export default async function AppLayout({ children }: LayoutProps<"/[lang]">) {
  const t = await getDictionary();
  return (
    <>
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <Link href="/dashboard" aria-label={t.nav.home}>
            <Wordmark />
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-4 text-sm">
            <LanguageSwitch />
            <Suspense fallback={<span className="text-ink-soft">…</span>}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
        <div className="sheet flex-1">{children}</div>
      </main>
    </>
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <>
      <span className="text-ink-soft">{user.name}</span>
      <SignOutButton />
    </>
  );
}
