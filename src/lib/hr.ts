import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Locale } from "./i18n";
import { slugify } from "./slug";

// One guide per language; the locale comes from a fixed list, so no path traversal.
export async function getHrGuide(locale: Locale) {
  "use cache";
  const markdown = await readFile(path.join(process.cwd(), "content", "hr", `${locale}.md`), "utf8");
  const sections = [...markdown.matchAll(/^## (.+)$/gm)].map((m) => ({ title: m[1], id: slugify(m[1]) }));
  return { markdown, sections };
}
