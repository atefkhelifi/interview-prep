"use client";

import { createContext, use } from "react";
import { getDict, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useI18n() {
  const locale = use(LocaleContext);
  return { locale, t: getDict(locale) };
}

// Saves the choice and reloads: every page exists in both languages at the same URL.
export function LanguageSwitch() {
  const { locale, t } = useI18n();
  const other: Locale = locale === "en" ? "fr" : "en";
  return (
    <button
      type="button"
      lang={other}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
        location.reload();
      }}
      className="link text-sm"
    >
      {t.otherLanguage}
    </button>
  );
}
