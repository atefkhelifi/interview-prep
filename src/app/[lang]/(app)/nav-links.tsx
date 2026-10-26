"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useI18n } from "@/components/i18n";

const nav = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/study", key: "study" },
  { href: "/workshops", key: "workshops" },
  { href: "/interview", key: "interview" },
] as const;

function Links({ pathname }: { pathname?: string }) {
  const { t } = useI18n();
  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[0.9375rem]">
      {nav.map((n) => {
        const active = pathname !== undefined && (pathname === n.href || pathname.startsWith(`${n.href}/`));
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-semibold text-ink underline decoration-action decoration-2 underline-offset-[7px]"
                : "text-ink-soft hover:text-ink"
            }
          >
            {t.nav[n.key]}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveLinks() {
  return <Links pathname={usePathname()} />;
}

// The pathname is request data on dynamic routes, so the highlight streams in;
// the static shell shows the same links without it.
export function NavLinks() {
  return (
    <Suspense fallback={<Links />}>
      <ActiveLinks />
    </Suspense>
  );
}
