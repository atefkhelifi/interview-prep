import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { getDict, isLocale, LOCALE_COOKIE, pickLocale, type Locale } from ".";

// Server Components: the locale is the [lang] root segment (the proxy rewrites to it).
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

export async function getDictionary() {
  return getDict(await getLocale());
}

// Server Actions can't read root params; use the same cookie / header the proxy used.
export async function getActionLocale(): Promise<Locale> {
  return pickLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"));
}
