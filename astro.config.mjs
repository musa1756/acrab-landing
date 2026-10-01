import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://acrab.ru",
  output: "static",
  // Timeweb раздаёт каталог site/ как есть (static-nobuild, index_dir = /site),
  // поэтому сборка пишется прямо туда и коммитится вместе с исходниками.
  outDir: "./site",
  trailingSlash: "always",
  build: {
    format: "directory",
    inlineStylesheets: "never",
  },
  integrations: [react()],
  markdown: {
    syntaxHighlight: false,
  },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        // Яндекс.Метрика: пиксели, отправка данных и Вебвизор (blob-фрейм).
        "img-src 'self' https://mc.yandex.ru https://mc.yandex.com",
        "connect-src 'self' https://api.acrab.ru https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.ru",
        "frame-src blob: https://mc.yandex.ru https://mc.yandex.com",
        "child-src blob: https://mc.yandex.ru https://mc.yandex.com",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", "https://mc.yandex.ru", "https://yastatic.net"],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
