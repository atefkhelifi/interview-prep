import { readFile } from "node:fs/promises";
import path from "node:path";
import { slugify } from "./slug";
import { getTech } from "./techs";

// Only known slugs reach the filesystem, so no path traversal.
export async function getStudySheet(slug: string) {
  "use cache";
  const tech = getTech(slug);
  if (!tech) return null;
  const markdown = await readFile(path.join(process.cwd(), "content", "study", `${slug}.md`), "utf8");
  const sections = [...markdown.matchAll(/^## (.+)$/gm)].map((m) => ({ title: m[1], id: slugify(m[1]) }));
  return { tech, markdown, sections };
}
