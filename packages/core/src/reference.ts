/** Listes de référence modifiables dans le back-office (F-57, ADR 0052) : métiers, travaux, pièces. */
export const REFERENCE_KINDS = ["metier", "travail", "piece"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

export function parseReferenceKind(value: unknown): ReferenceKind | null {
  return typeof value === "string" && (REFERENCE_KINDS as readonly string[]).includes(value)
    ? (value as ReferenceKind)
    : null;
}

/**
 * Code d'une nouvelle entrée, tiré de son libellé : minuscules sans accents, mots reliés par des
 * tirets, 60 caractères au plus (format des codes des tables trades, work_types et rooms). Vide si
 * le libellé ne contient ni lettre ni chiffre. Le code ne change plus ensuite : il est repris par
 * les artisans, les demandes et l'IA.
 */
export function referenceCode(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}
