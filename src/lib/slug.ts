export function slugify(text: string) {
  // Strip accents first so French headings ("Qualités") give readable ids ("qualites").
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
