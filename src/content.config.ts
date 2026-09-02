import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const changelog = defineCollection({
  loader: glob({ base: "./src/content/changelog", pattern: "**/*.json" }),
  schema: z.object({
    version: z.string(),
    date: z.coerce.date(),
    dateLabel: z.string(),
    emoji: z.string(),
    title: z.string(),
    description: z.array(z.string()),
    image: z.object({
      src: z.string(),
      alt: z.string(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }).nullable(),
    new: z.array(z.string()),
    improvements: z.array(z.string()),
    fixes: z.array(z.string()),
  }),
});

export const collections = { changelog };
