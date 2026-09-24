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
        "img-src 'self'",
        "connect-src 'self' https://api.acrab.ru",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
