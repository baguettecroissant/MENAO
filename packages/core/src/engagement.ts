/**
 * Engagement de l'artisan (ADR 0117), demandé par le cahier des charges « Inscription et
 * vérification des artisans » : travail déclaré et exactitude des documents. Signé avec la charte
 * qualité, d'une seule signature (date, heure, adresse IP, version), puis à chaque nouvelle version.
 * TODO(legal): texte provisoire, rédigé faute du texte du CEO. Le remplacer par le texte validé
 * (CEO, avocat), puis passer ENGAGEMENT_DRAFT à false et changer ENGAGEMENT_VERSION (miroir :
 * app.current_engagement_version()), ce qui redemandera la signature.
 */

/** Version signée (artisan_charter_acceptances.engagement_version). « B » : brouillon. */
export const ENGAGEMENT_VERSION = "B1";

/** Texte provisoire : la mention « Texte provisoire » reste affichée tant qu'il n'est pas validé. */
export const ENGAGEMENT_DRAFT = true;

export const ENGAGEMENT_TEXT = {
  title: "Mon engagement d'artisan",
  draft: "Texte provisoire, en cours de validation",
  why: "Les clients choisissent Menao parce que chaque entreprise est vérifiée. Cet engagement le garantit.",
  intro: "En signant, je certifie sur l'honneur, pour mon entreprise :",
  items: [
    "Mon entreprise est immatriculée, en activité, et à jour de ses déclarations et cotisations sociales.",
    "Les travaux obtenus grâce à Menao sont réalisés par du personnel déclaré. Si je sous-traite, c'est à des entreprises immatriculées et assurées.",
    "Les documents et informations que je transmets à Menao sont authentiques, exacts et à jour.",
    "Mes assurances couvrent les travaux que je propose sur Menao.",
    "Je préviens Menao sans attendre de tout changement : assurance résiliée ou suspendue, cessation ou changement d'activité, procédure collective.",
    "Je sais qu'une fausse déclaration ou un faux document peut entraîner la suspension puis la radiation de mon compte.",
  ],
  agreeTitle: "Je certifie sur l'honneur l'exactitude de ces déclarations",
} as const;
