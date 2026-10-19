/**
 * Guides du site (ADR 0135) : articles rédigés à la main, relus avant publication, avec leurs
 * sources officielles. Dans les textes, `[libellé](/chemin)` crée un lien et `**texte**` du gras.
 */
export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "list"; items: readonly string[]; ordered?: boolean }
  | { type: "callout"; tone: "menao" | "warning"; title: string; text: string }
  | {
      type: "table";
      caption: string;
      head: readonly string[];
      rows: readonly (readonly string[])[];
    }
  /*
   * Schémas (ADR 0150), dessinés en HTML à partir de ces données : lisibles par les lecteurs
   * d'écran et traduisibles. Ils reprennent ce que dit le guide, sans rien y ajouter.
   */
  | {
      /** Frise : des durées comptées depuis un même point de départ (en années). */
      type: "periods";
      caption: string;
      start: string;
      ticks: readonly { at: number; label: string }[];
      bars: readonly {
        label: string;
        from: number;
        to: number;
        detail: string;
        tone: "strong" | "soft";
      }[];
    }
  | {
      /**
       * Arbre de décision : des questions successives. `answer` mène à `result`, `next` passe à la
       * question suivante (ou à `otherwise` après la dernière).
       */
      type: "decision";
      caption: string;
      steps: readonly { question: string; answer: string; result: string; next: string }[];
      otherwise: { answer: string; result: string; detail: string };
      note?: string;
    }
  | {
      /** Circuit : des chaînes d'étapes reliées par des flèches, une par cas. */
      type: "flow";
      caption: string;
      rows: readonly { label: string; steps: readonly string[] }[];
    }
  | {
      /** Document annoté : les zones d'un document et ce qu'elles doivent contenir. */
      type: "document";
      caption: string;
      title: string;
      /** `shape` : allure de la zone sur la feuille (lignes de texte par défaut). */
      zones: readonly {
        title: string;
        items: readonly string[];
        shape?: "header" | "table" | "totals" | "signature";
      }[];
    };

export type Guide = {
  slug: string;
  audience: "particuliers" | "artisans";
  /** Titre affiché (H1). */
  title: string;
  /** Titre pour Google (sans « — MENAO », ajouté par la page). */
  metaTitle: string;
  description: string;
  /** Dates au format AAAA-MM-JJ. */
  publishedAt: string;
  updatedAt: string;
  /** Brouillon : visible hors production pour la relecture, jamais indexé ni listé en production. */
  draft: boolean;
  /**
   * Couverture (ADR 0149) : `public/images/guides/<slug>.webp` (1 536 × 1 024, versions -960 et -640)
   * et l'image de partage `public/images/og/guides/<slug>.jpg`. Photos générées par IA, personnes
   * fictives (docs/images/photos-generees.md). `position` : cadrage (object-position) quand l'image
   * est recadrée.
   */
  cover?: { alt: string; position: string };
  /** « L'essentiel » : les réponses clés, en tête d'article. */
  essentials: readonly string[];
  body: readonly GuideBlock[];
  faq: readonly { q: string; a: string }[];
  sources: readonly { label: string; publisher: string; url: string }[];
  related: readonly { href: string; label: string }[];
};
