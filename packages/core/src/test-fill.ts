/**
 * Comptes d'essai de l'inscription artisan (F-192, ADR 0392) : ce que « Remplir » écrit pour une
 * ligne du parcours, et ce que « Tout remplir » écrit jusqu'à une étape choisie. Les noms sont ceux
 * de `fill_test_onboarding` (base). La formule et les paiements ne se remplissent pas (Stripe).
 */
import type { GuideStepKey } from "./onboarding-guide";

export const TEST_FILL_STEPS = [
  "entreprise",
  "metiers",
  "zone",
  "charte",
  "identite",
  "profil",
  "attestations",
] as const;
export type TestFillStep = (typeof TEST_FILL_STEPS)[number];

/** Une ligne du parcours : « Votre entreprise » remplit aussi les métiers et la zone. */
export type TestFillRow = GuideStepKey;

const BY_ROW: Record<TestFillRow, TestFillStep[]> = {
  entreprise: ["entreprise", "metiers", "zone"],
  metiers: ["metiers"],
  zone: ["zone"],
  charte: ["charte"],
  // Kbis et pièce d'identité : documents d'exemple écrits ensemble.
  kbis: ["identite"],
  identite: ["identite"],
  profil: ["profil"],
  formule: [],
  attestations: ["attestations"],
  paiements: [],
};

/** Ordre des lignes, comme sur « Mon inscription ». */
export const TEST_FILL_ROWS: TestFillRow[] = [
  "entreprise",
  "metiers",
  "zone",
  "charte",
  "kbis",
  "identite",
  "profil",
  "formule",
  "attestations",
  "paiements",
];

export function testFillRowSteps(row: TestFillRow): TestFillStep[] {
  return BY_ROW[row];
}

/** « Tout remplir » jusqu'à la ligne choisie, elle comprise. */
export function testFillUntil(row: TestFillRow): TestFillStep[] {
  const end = TEST_FILL_ROWS.indexOf(row);
  return [...new Set(TEST_FILL_ROWS.slice(0, end + 1).flatMap((r) => BY_ROW[r]))];
}

/** Lignes qui ont quelque chose à remplir. */
export function testFillable(row: TestFillRow): boolean {
  return BY_ROW[row].length > 0;
}
