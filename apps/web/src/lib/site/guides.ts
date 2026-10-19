import { GUIDES, type Guide } from "@/content/guides";

/**
 * Règles d'affichage des guides (ADR 0135). Un brouillon se relit en local et sur les déploiements
 * de prévisualisation, jamais en production ; il n'est jamais listé dans le sitemap ni le llms.txt.
 */
const showDrafts = process.env.VERCEL_ENV !== "production";

/** Guides consultables sur ce déploiement (brouillons compris hors production). */
export const visibleGuides = (): readonly Guide[] => GUIDES.filter((g) => !g.draft || showDrafts);

/** Guides publiés : les seuls à figurer dans le sitemap, le llms.txt et les données structurées. */
export const publishedGuides = (): readonly Guide[] => GUIDES.filter((g) => !g.draft);

export const findGuide = (slug: string): Guide | undefined =>
  visibleGuides().find((g) => g.slug === slug);

const textOf = (g: Guide): string =>
  [
    g.title,
    ...g.essentials,
    ...g.body.flatMap((b) => {
      switch (b.type) {
        case "p":
        case "h2":
          return [b.text];
        case "list":
          return b.items;
        case "callout":
          return [b.title, b.text];
        case "table":
          return [...b.head, ...b.rows.flat()];
        case "periods":
          return [b.start, ...b.bars.flatMap((bar) => [bar.label, bar.detail])];
        case "decision":
          return [
            ...b.steps.flatMap((step) => [step.question, step.answer, step.result, step.next]),
            b.otherwise.answer,
            b.otherwise.result,
            b.otherwise.detail,
            b.note ?? "",
          ];
        case "flow":
          return b.rows.flatMap((row) => [row.label, ...row.steps]);
        case "document":
          return [b.title, ...b.zones.flatMap((zone) => [zone.title, ...zone.items])];
      }
    }),
    ...g.faq.flatMap((f) => [f.q, f.a]),
  ].join(" ");

/** Temps de lecture estimé, à 220 mots par minute. */
export const readingMinutes = (g: Guide): number =>
  Math.max(1, Math.round(textOf(g).split(/\s+/).length / 220));

/** Sommaire : les intertitres de l'article. */
export const tableOfContents = (g: Guide) =>
  g.body.flatMap((b) => (b.type === "h2" ? [{ id: b.id, text: b.text }] : []));
