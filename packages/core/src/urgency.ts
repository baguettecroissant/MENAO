/**
 * Urgence d'une demande de travaux, repérée dans la description pendant la saisie (ADR 0279).
 * Repérage par mots, immédiat et sans appel réseau : il allume le bouton « Urgent » et dit
 * pourquoi. L'analyse IA (analyze-need) reste l'arbitre à l'envoi, et le choix du particulier
 * passe avant les deux.
 */
export const URGENCY_REASONS = [
  "fuite",
  "chauffage",
  "electricite",
  "serrure",
  "vitre",
  "canalisation",
  "toiture",
  "exprimee",
] as const;
export type UrgencyReason = (typeof URGENCY_REASONS)[number];

/** Sans accents ni majuscules, apostrophes et tirets ramenés à des espaces. */
function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'‘`-]/g, " ")
    .replace(/\s+/g, " ");
}

// Situations qui ne peuvent pas attendre. L'ordre compte : la première trouvée donne le motif.
const PATTERNS: readonly (readonly [UrgencyReason, RegExp])[] = [
  ["fuite", /\b(fuite|fuit|fuient|degats? des eaux|inond\w+|infiltration|eau qui coule)\b/],
  [
    "chauffage",
    /\b(plus|pas) (de |d )?(chauffage|eau chaude)\b|\b(chaudiere|chauffe eau|ballon|radiateurs?|pompe a chaleur|clim\w*) (est |sont )?(en panne|hs|ne (marche|fonctionne|chauffe|demarre)\w*)|\bpanne de (chauffage|chaudiere|chauffe eau)\b/,
  ],
  [
    "electricite",
    /\b(plus|pas) (de |d )?(courant|electricite|lumiere)\b|\b(court circuit|coupure de courant|panne (de courant|electrique|d electricite)|disjonct\w+ (sans arret|tout le temps|en permanence)|fils? denudes?|odeur de brule|prise (qui )?(brule|fume|chauffe)\w*)\b/,
  ],
  [
    "serrure",
    /\b(porte (bloquee|claquee|fracturee|forcee)|(serrure|cle|clef) (bloquee|cassee|coincee|forcee)|enferme\w* (dehors|a l exterieur)|cle (cassee|coincee) dans la serrure|cambriol\w+|effraction)\b/,
  ],
  [
    "vitre",
    /\b(vitre|vitrage|fenetre|baie vitree|carreau|velux) (est )?(cassee?|brisee?|fissuree?|explosee?)\b/,
  ],
  [
    "canalisation",
    /\b(wc|toilettes?|canalisations?|evier|lavabo|douche|egouts?|evacuation) (est |sont )?(bouchee?s?|debord\w+|refoul\w+)|\brefoulement\b/,
  ],
  [
    "toiture",
    /\b(toit|toiture|tuiles?|plafond) (qui )?(fuit|s effondre|s est effondree?|arrachee?s?|envolee?s?|menace)\w*\b/,
  ],
  [
    "exprimee",
    /\b(urgent|urgente|urgence|en urgence|au plus vite|le plus vite possible|des aujourd hui|ce soir|immediatement|tout de suite|sans attendre)\b/,
  ],
];

// Un projet, même proche, n'est pas une urgence : ces tournures annulent le repérage par « fuite ».
const PLANNED = /\b(prevenir|eviter|risque de|au cas ou|recherche de fuite preventive)\b/;

/**
 * Motif d'urgence repéré dans la description, ou null. `excerpt` : les mots du particulier qui
 * l'ont déclenché, tels qu'il les a écrits (pour les surligner).
 */
export function detectUrgency(text: string): { reason: UrgencyReason; excerpt: string } | null {
  const source = text.replace(/\s+/g, " ");
  const flat = plain(source);
  for (const [reason, pattern] of PATTERNS) {
    const match = pattern.exec(flat);
    if (!match) continue;
    if (
      reason === "fuite" &&
      PLANNED.test(flat.slice(Math.max(0, match.index - 30), match.index))
    ) {
      continue;
    }
    // `plain` garde la longueur du texte (un caractère pour un), sauf les accents décomposés :
    // l'extrait est retrouvé dans le texte d'origine par la même position, à défaut par le mot.
    const excerpt =
      plain(source.slice(match.index, match.index + match[0].length)) === match[0]
        ? source.slice(match.index, match.index + match[0].length)
        : match[0];
    return { reason, excerpt: excerpt.trim() };
  }
  return null;
}

/** Choix du particulier sur le bouton « Urgent » : rien touché, activé ou retiré. */
export type UrgencyChoice = "auto" | "oui" | "non";

/** Urgence retenue : le choix du particulier d'abord, sinon ce qui a été repéré. */
export function resolveUrgency(choice: UrgencyChoice, detected: boolean): boolean {
  return choice === "auto" ? detected : choice === "oui";
}
