import { pageUrl, ROUTES, SITEMAP_LASTMOD } from "../lib/routes";
import { LETTER_MODIFIED, LETTER_SECTION_PATH, LETTERS, letterPath } from "../seo/letters";

/** Sitemap из реестра маршрутов: страницы букв идут сразу за алфавитом. */
export function GET(): Response {
  const entries = ROUTES.filter((route) => route.indexable).flatMap((route) => {
    const own = { path: route.path, lastmod: route.lastmod ?? SITEMAP_LASTMOD };
    if (route.path !== LETTER_SECTION_PATH) return [own];
    return [own, ...LETTERS.map((letter) => ({ path: letterPath(letter.slug), lastmod: LETTER_MODIFIED }))];
  });
  const urls = entries.map(({ path, lastmod }) => `  <url><loc>${pageUrl(path)}</loc><lastmod>${lastmod}</lastmod></url>\n`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
