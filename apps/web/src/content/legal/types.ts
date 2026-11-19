import type { GuideBlock } from "@/content/guides/types";

/**
 * Textes légaux du site (F-180, ADR 0377) : mêmes blocs que les guides (paragraphes, listes,
 * tableaux, liens `[libellé](/chemin)` et `**gras**`), plus un sous-titre.
 */
export type LegalBlock =
  Extract<GuideBlock, { type: "p" | "h2" | "list" | "table" }> | { type: "h3"; text: string };

export type LegalDocument = {
  title: string;
  /** Phrase d'introduction sous le titre. */
  intro?: string;
  /** Date de la version affichée, au format AAAA-MM-JJ. */
  updatedAt: string;
  blocks: readonly LegalBlock[];
};
