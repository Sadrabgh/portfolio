import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    english: z.string(),
    summary: z.string(),
    category: z.enum(["business", "commerce", "interactive", "healthcare"]),
    label: z.string(),
    cover: z.string(),
    previewDesktop: z.string().optional(),
    previewMobile: z.string().optional(),
    color: z.string(),
    order: z.number(),
    year: z.string(),
    role: z.string(),
    stack: z.array(z.string()),
    demo: z.string(),
    locale: z.literal("fa"),
    projectType: z.literal("concept"),
  }),
});
export const collections = { projects };
