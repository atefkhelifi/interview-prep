// Locales, dictionaries and locale detection. Safe to import anywhere (server, client, proxy).

import { en, type Dict } from "./en";
import { fr } from "./fr";

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

const dictionaries: Record<Locale, Dict> = { en, fr };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}

// Cookie wins; otherwise the first supported language in Accept-Language, by weight.
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.slice(0, 2).toLowerCase(), q: q === undefined ? 1 : Number(q) || 0 };
    })
    .sort((a, b) => b.q - a.q);
  const match = wanted.find((w) => isLocale(w.lang))?.lang;
  return isLocale(match) ? match : DEFAULT_LOCALE;
}
