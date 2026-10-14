/**
 * Illustrations des états vides (ADR 0095), dessinées une seule fois et rendues par le site (SVG)
 * et par l'application (react-native-svg) : trait bleu MENAO sur un disque bleu clair.
 * Chaque forme a un ton, traduit en couleurs par chaque plateforme :
 * - `soft` : aplat bleu clair (disque de fond) ;
 * - `card` : fond blanc et trait bleu ;
 * - `line` : trait bleu seul ;
 * - `accent` : aplat bleu ;
 * - `inverse` : trait blanc, posé sur un aplat bleu.
 */
export type IllustrationTone = "soft" | "card" | "line" | "accent" | "inverse";
export type IllustrationShape = { d: string; tone: IllustrationTone };

export const ILLUSTRATION_VIEWBOX = { width: 120, height: 96 } as const;
/** Épaisseur du trait, en unités du viewBox. */
export const ILLUSTRATION_STROKE = 2.5;

const disc: IllustrationShape = { d: "M20 50a40 40 0 1 0 80 0a40 40 0 1 0-80 0Z", tone: "soft" };

export const ILLUSTRATIONS = {
  /** Maison au toit en chevron (celui du logo) : chantiers. */
  chantiers: [
    disc,
    { d: "M38 50v26h44V50", tone: "card" },
    { d: "M32 54 60 30l28 24", tone: "line" },
    { d: "M54 76V62h12v14", tone: "line" },
    { d: "M70 56h7v7h-7Z", tone: "accent" },
    { d: "M26 76h68", tone: "line" },
  ],
  /** Feuille, loupe : demandes envoyées aux artisans. */
  demandes: [
    disc,
    { d: "M40 22h26l12 12v40a4 4 0 0 1-4 4H40a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4Z", tone: "card" },
    { d: "M66 22v8a4 4 0 0 0 4 4h8", tone: "line" },
    { d: "M44 44h22M44 52h16M44 60h12", tone: "line" },
    { d: "M64 62a12 12 0 1 0 24 0a12 12 0 1 0-24 0Z", tone: "card" },
    { d: "M85 71l9 9", tone: "line" },
  ],
  /** Deux bulles de discussion : messages. */
  messages: [
    disc,
    {
      d: "M30 30h40a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H46l-10 8v-8h-6a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8Z",
      tone: "card",
    },
    { d: "M38 47a3 3 0 1 0 6 0a3 3 0 1 0-6 0Z", tone: "accent" },
    { d: "M47 47a3 3 0 1 0 6 0a3 3 0 1 0-6 0Z", tone: "accent" },
    { d: "M56 47a3 3 0 1 0 6 0a3 3 0 1 0-6 0Z", tone: "accent" },
    {
      d: "M70 52h18a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-2v6l-8-6h-8a6 6 0 0 1-6-6V58a6 6 0 0 1 6-6Z",
      tone: "card",
    },
  ],
  /** Feuille cornée validée : documents et factures. */
  documents: [
    disc,
    { d: "M42 20h28l14 14v42a4 4 0 0 1-4 4H42a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4Z", tone: "card" },
    { d: "M70 20v10a4 4 0 0 0 4 4h10", tone: "line" },
    { d: "M46 44h26M46 52h26M46 60h16", tone: "line" },
    { d: "M74 72a10 10 0 1 0 20 0a10 10 0 1 0-20 0Z", tone: "accent" },
    { d: "M79 72l3.5 3.5L89 69", tone: "inverse" },
  ],
  /** Porte-bloc coché : devis. */
  devis: [
    disc,
    {
      d: "M38 26h44a4 4 0 0 1 4 4v48a4 4 0 0 1-4 4H38a4 4 0 0 1-4-4V30a4 4 0 0 1 4-4Z",
      tone: "card",
    },
    {
      d: "M51 21h18a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H51a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z",
      tone: "accent",
    },
    { d: "M42 46l3 3 6-6M56 46h20M42 60l3 3 6-6M56 60h20M56 72h12", tone: "line" },
  ],
  /** Cloche : notifications. */
  notifications: [
    disc,
    {
      d: "M60 22a4 4 0 0 1 4 4v1.5c9 2 15 10 15 19.5v12l6 8H35l6-8V47c0-9.5 6-17.5 15-19.5V26a4 4 0 0 1 4-4Z",
      tone: "card",
    },
    { d: "M53 70a7 7 0 0 0 14 0", tone: "line" },
    { d: "M73 32a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z", tone: "accent" },
    { d: "M27 40c-2 4-2 10 0 14M93 40c2 4 2 10 0 14", tone: "line" },
  ],
  /** Bulle d'avis et trois étoiles : avis. */
  avis: [
    disc,
    {
      d: "M30 28h60a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H52l-10 8v-8H30a6 6 0 0 1-6-6V34a6 6 0 0 1 6-6Z",
      tone: "card",
    },
    {
      d: "M44 41.5L45.9 46.3L51.1 46.7L47.1 50L48.4 55.1L44 52.3L39.6 55.1L40.9 50L36.9 46.7L42.1 46.3Z",
      tone: "accent",
    },
    {
      d: "M60 38L62.4 43.8L68.6 44.2L63.8 48.2L65.3 54.3L60 51L54.7 54.3L56.2 48.2L51.4 44.2L57.6 43.8Z",
      tone: "accent",
    },
    {
      d: "M76 41.5L77.9 46.3L83.1 46.7L79.1 50L80.4 55.1L76 52.3L71.6 55.1L72.9 50L68.9 46.7L74.1 46.3Z",
      tone: "accent",
    },
  ],
  /** Calendrier : agenda et échanges avec l'équipe. */
  agenda: [
    disc,
    {
      d: "M32 30h56a4 4 0 0 1 4 4v42a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V34a4 4 0 0 1 4-4Z",
      tone: "card",
    },
    { d: "M28 34a4 4 0 0 1 4-4h56a4 4 0 0 1 4 4v8H28Z", tone: "accent" },
    { d: "M44 24v10M76 24v10", tone: "line" },
    { d: "M38 52h8v7h-8ZM56 52h8v7h-8ZM74 52h8v7h-8ZM38 66h8v7h-8Z", tone: "line" },
    { d: "M56 66h8v7h-8Z", tone: "accent" },
  ],
} satisfies Record<string, readonly IllustrationShape[]>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;
