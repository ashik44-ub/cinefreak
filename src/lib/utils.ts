export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the canonical slug for a title + year. Idempotent: a slug that
 * already ends with "-<year>" (e.g. re-saved from the edit form, which
 * sends back the stored slug) is stripped back to the base first, so the
 * year is never appended twice ("game-of-thrones-2011-2011").
 */
export function titleSlug(text: string, year: number | null): string {
  let base = slugify(text);
  if (year) {
    const suffix = `-${year}`;
    while (base.endsWith(suffix)) base = base.slice(0, -suffix.length);
    return `${base}${suffix}`;
  }
  return base;
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
