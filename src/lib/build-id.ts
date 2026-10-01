import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Номер сборки — хеш исходников сайта (`src/` и `public/`). Timeweb не отдаёт
 * Cache-Control, и браузер по своей эвристике показывает недавно открытую
 * страницу из кэша, не спрашивая сервер: после выкладки в шапке оставались
 * старые пункты меню. Каждая страница несёт свой номер, сервер — текущий в
 * `/build.txt`, а `scripts/fresh-page.ts` перезагружает устаревшую страницу.
 *
 * Номер зависит только от содержимого файлов, а не от времени сборки: иначе
 * каждая сборка меняла бы все страницы и `verify:published` не сходился бы.
 */
// При сборке модуль переезжает в чанк Vite, и import.meta.url указывает уже
// не сюда; Astro запускается из website/ (`bun run --cwd website build`).
const root = process.cwd();

// Скрытые файлы (.DS_Store от Finder) в git не попадают: с ними номер локальной
// сборки разошёлся бы со сборкой в CI.
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]));
}

const hash = createHash("sha256");
for (const path of [...files(join(root, "src")), ...files(join(root, "public"))]) {
  hash.update(relative(root, path));
  hash.update("\0");
  hash.update(readFileSync(path));
  hash.update("\0");
}

export const BUILD_ID = hash.digest("hex").slice(0, 12);
