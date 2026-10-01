/**
 * Копирует озвучку страниц букв (`/arabic-alphabet/<буква>/`) из записей приложения.
 *
 * Для каждой буквы нужны её звук, три слога и слова-примеры. Тексты берутся из
 * `src/seo/letters.ts`, а файл ищется в `mobile/src/features/fusha/recordings.ts` —
 * реестре, по которому приложение находит запись для текста. Озвучка в приложении
 * синтезированная; здесь ничего не генерируется, файлы только копируются.
 *
 * Запуск из монорепо Acrab-Expo (в отдельном репозитории сайта нет `mobile/`):
 *
 *   cd website && bun run tools/sync-letter-audio.ts
 *
 * Название буквы (`<slug>.mp3`) скрипт не трогает: в приложении буква озвучена
 * с окончанием («залюн»), а сайту нужно название в паузальной форме («заль»).
 * Эти 28 файлов записаны отдельно тем же голосом приложения
 * (`mobile/scripts/generate-fusha-audio.py generate` по `arabicName` с сукуном
 * на конце, 1 октября 2026) и лежат в git.
 *
 * Файлы лежат в `public/assets/audio/letters/`: `<slug>.mp3` — буква,
 * `<slug>-a|i|u.mp3` — слоги, `words/<слово>.mp3` — слова-примеры.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LETTERS, letterAudioFiles, letterAudioPath } from "../src/seo/letters";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const audioRoot = resolve(websiteRoot, "../mobile/assets/audio");
const registry = resolve(websiteRoot, "../mobile/src/features/fusha/recordings.ts");

if (!existsSync(registry)) {
  console.error(`Нет ${registry}: скрипт запускается только внутри монорепо Acrab-Expo.`);
  process.exit(1);
}

const recordings = new Map<string, string>();
const entry = /^\s*("(?:[^"\\]|\\.)*"):\s*require\("[^"]*\/audio\/([0-9a-f]+\.mp3)"\)/gm;
for (const match of readFileSync(registry, "utf8").matchAll(entry)) {
  recordings.set(JSON.parse(match[1]!) as string, match[2]!);
}

const jobs = new Map<string, string>();
const missing: string[] = [];
for (const letter of LETTERS) {
  for (const { path, text } of letterAudioFiles(letter)) {
    if (path === letterAudioPath(letter)) continue;
    const file = recordings.get(text);
    if (file) jobs.set(path, file);
    else missing.push(`${letter.slug}: нет записи для «${text}»`);
  }
}

if (missing.length > 0) {
  console.error(missing.join("\n"));
  process.exit(1);
}

let bytes = 0;
for (const [path, file] of jobs) {
  const target = resolve(websiteRoot, "public", path.slice(1));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve(audioRoot, file), target);
  bytes += statSync(target).size;
}
console.log(`Скопировано ${jobs.size} файлов, ${(bytes / 1024).toFixed(0)} КБ в public/assets/audio/letters/`);
