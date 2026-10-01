import { BUILD_ID } from "../lib/build-id";

/** Текущий номер сборки; страницы сверяются с ним в `scripts/fresh-page.ts`. */
export function GET(): Response {
  return new Response(`${BUILD_ID}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
