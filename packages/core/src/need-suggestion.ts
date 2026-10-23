/**
 * Suggestions pendant la saisie du besoin (F-05, ADR 0177) : la suite de la phrase, en gris dans
 * le champ, et des idées pour préciser la demande, en pastilles sous le champ. Schéma de la réponse
 * du modèle, nettoyage, et ajout au texte du particulier.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function suggest-need.
 */

/** Pas de suggestion avant ces quelques caractères (moins d'un début de phrase). */
export const SUGGESTION_MIN_LENGTH = 12;
/** Au-delà, la description est déjà détaillée : plus de suggestion. */
export const SUGGESTION_MAX_LENGTH = 1500;
/** Pause de frappe avant de demander une suggestion. */
export const SUGGESTION_DEBOUNCE_MS = 400;
export const SUGGESTION_MAX_IDEAS = 4;
/** Endroit d'une idée que le particulier complète lui-même (chiffre, lieu, date). */
export const IDEA_PLACEHOLDER = "…";

const COMPLETION_MAX_LENGTH = 70;
const IDEA_LABEL_MAX_LENGTH = 32;
const IDEA_TEXT_MAX_LENGTH = 80;

/** Réponse brute du modèle (sortie structurée, needSuggestionJsonSchema). */
export type RawNeedSuggestion = {
  /**
   * Derniers mots du texte, recopiés, suivis de la suite (« de la cuisine, ça goutte » pour
   * « …de la cuis ») : la jonction avec le texte est calculée ici, jamais par le modèle.
   */
  reprise: string | null;
  idees: { libelle: string; texte: string }[];
};

export type NeedIdea = { label: string; insert: string };
export type NeedSuggestion = { completion: string | null; ideas: NeedIdea[] };

/** Schéma JSON de la sortie structurée du modèle. */
export function needSuggestionJsonSchema() {
  const idea = {
    type: "object" as const,
    properties: { libelle: { type: "string" }, texte: { type: "string" } },
    required: ["libelle", "texte"],
    additionalProperties: false,
  };
  return {
    type: "object" as const,
    properties: {
      reprise: { anyOf: [{ type: "string" }, { type: "null" }] },
      idees: { type: "array" as const, items: idea },
    },
    required: ["reprise", "idees"],
    additionalProperties: false,
  };
}

const squash = (value: string) => value.replace(/\s+/g, " ");
const comparable = (value: string) =>
  squash(value)
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?…]+$/u, "");

/** Au moins quelques lettres recopiées, pour une jonction sûre avec le texte. */
const MIN_OVERLAP = 3;
/** Détail inventé sur la vie du particulier (« pour mon fils ») : jamais dans une suite. */
const PERSONAL_DETAIL =
  /\b(mon|ma|mes|notre|nos)\s+(fils|fille|enfants?|bébé|femme|mari|conjoint|mère|père|parents)\b/i;

/** Mot qui ne termine pas une suite (« …, avec ») : suite coupée, écartée. */
const DANGLING =
  /\s(avec|et|de|du|des|d'|le|la|les|l'|un|une|pour|à|au|aux|en|par|sur|dans|ou|mais|qui|que|car)$/i;

/** Trois mots de suite déjà écrits dans le texte : la suite le répète. */
function repeatsText(completion: string, text: string): boolean {
  const words = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) ?? [];
  const written = ` ${words(text).join(" ")} `;
  const added = words(completion);
  return added.some(
    (_, i) => i + 3 <= added.length && written.includes(` ${added.slice(i, i + 3).join(" ")} `),
  );
}

/**
 * Suite de la phrase, prête à être ajoutée telle quelle après le texte. La reprise du modèle
 * commence par les derniers mots du texte : la plus longue partie commune (au début d'un mot du
 * texte) est retirée, le reste est la suite, espaces compris. Jamais de chiffre (une surface, un
 * prix ou une date inventés), d'endroit à compléter, de détail personnel, de répétition du texte,
 * de suite coupée (ponctuation finale retirée), ni de suite longue.
 */
function cleanCompletion(reprise: string | null, text: string): string | null {
  const written = squash(reprise ?? "").trim();
  const typed = squash(text);
  const end = typed.replace(/\s+$/, "").toLowerCase();
  if (!written || /^null$/i.test(written)) return null;
  let completion: string | null = null;
  for (let k = Math.min(written.length, end.length); k >= MIN_OVERLAP; k--) {
    const start = end.length - k;
    const atWordStart = start === 0 || /[\s'’(«"-]/.test(end.charAt(start - 1));
    if (atWordStart && end.endsWith(written.slice(0, k).toLowerCase())) {
      completion = written.slice(k);
      break;
    }
  }
  completion = completion?.replace(/[\s,;:]+$/, "") ?? null;
  if (!completion?.trim() || DANGLING.test(completion)) return null;
  if (/\s$/.test(typed)) completion = completion.trimStart();
  if (/\d|…|\.\.\./.test(completion) || PERSONAL_DETAIL.test(completion)) return null;
  if (completion.length > COMPLETION_MAX_LENGTH) return null;
  if (comparable(typed).includes(comparable(completion))) return null;
  if (repeatsText(completion, typed)) return null;
  return completion;
}

/** Une surface écrite dans le texte (« 30 m² », « 12 m2 », « 20 mètres carrés »). */
const WRITTEN_SURFACE = /\d\s*(m²|m2\b|mètres? carrés)/i;
const SURFACE_IDEA = /surface|superficie|m²|m2\b/i;
/** Une ville écrite dans le texte (« à Nice », « sur Lyon », « près de Grasse »). */
const WRITTEN_CITY = /(?:^|\s)(?:à|a|sur|près de|vers)\s+\p{Lu}[\p{L}'’-]+/u;
const CITY_IDEA = /ville|commune|localisation|code postal|adresse/i;

/**
 * Idées nettoyées : 4 au plus, libellés courts et distincts, un seul endroit à compléter, aucun
 * chiffre inventé (il se complète à la place de « … »), et aucune idée déjà écrite dans le texte
 * (ni de surface ou de ville quand elles y figurent).
 */
function cleanIdeas(raw: RawNeedSuggestion["idees"], text: string): NeedIdea[] {
  const seen = new Set<string>();
  const ideas: NeedIdea[] = [];
  for (const idea of raw) {
    const label = squash(idea.libelle)
      .replace(/^\+\s*/, "")
      .trim();
    let insert = squash(idea.texte).replace(/\.{3}/g, IDEA_PLACEHOLDER).trimEnd();
    if (insert.split(IDEA_PLACEHOLDER).length > 2) {
      const first = insert.indexOf(IDEA_PLACEHOLDER) + 1;
      insert = (insert.slice(0, first) + insert.slice(first).split(IDEA_PLACEHOLDER).join(""))
        .replace(/\s+/g, " ")
        .trimEnd();
    }
    const key = label.toLowerCase();
    if (!label || label.length > IDEA_LABEL_MAX_LENGTH || seen.has(key)) continue;
    if (!insert.trim() || insert.length > IDEA_TEXT_MAX_LENGTH || /\d/.test(insert)) continue;
    const fixed = comparable(insert.replace(IDEA_PLACEHOLDER, ""));
    if (!insert.includes(IDEA_PLACEHOLDER) && fixed && comparable(text).includes(fixed)) continue;
    if (WRITTEN_SURFACE.test(text) && (SURFACE_IDEA.test(label) || SURFACE_IDEA.test(insert))) {
      continue;
    }
    if (WRITTEN_CITY.test(text) && (CITY_IDEA.test(label) || /^à …$/.test(insert.trim()))) {
      continue;
    }
    seen.add(key);
    ideas.push({ label: label.charAt(0).toUpperCase() + label.slice(1), insert });
    if (ideas.length === SUGGESTION_MAX_IDEAS) break;
  }
  return ideas;
}

/** Suggestion prête pour le champ, d'après la réponse du modèle et le texte envoyé. */
export function normalizeNeedSuggestion(raw: RawNeedSuggestion, text: string): NeedSuggestion {
  return {
    completion: cleanCompletion(raw.reprise, text),
    ideas: cleanIdeas(raw.idees, text),
  };
}

/**
 * Suite encore valable pendant que le particulier continue d'écrire : s'il tape le début de la
 * suggestion, le reste reste proposé ; sinon elle disparaît jusqu'à la suivante.
 */
export function remainingCompletion(
  base: string,
  completion: string | null,
  current: string,
): string | null {
  if (!completion || !current.startsWith(base)) return null;
  const typed = current.slice(base.length);
  if (!typed) return completion;
  return typed.length < completion.length &&
    completion.slice(0, typed.length).toLowerCase() === typed.toLowerCase()
    ? completion.slice(typed.length)
    : null;
}

/**
 * Idée ajoutée à la fin du texte, avec l'espace qu'il faut. `select` : l'endroit à compléter
 * (« … »), sélectionné pour que la frappe le remplace ; null s'il n'y en a pas.
 */
export function appendIdea(
  text: string,
  insert: string,
): { text: string; select: [number, number] | null } {
  const base = text.replace(/\s+$/, "");
  const addition = insert.trim();
  const joined = !base
    ? addition.charAt(0).toUpperCase() + addition.slice(1)
    : /^[,.;:!?)]/.test(addition)
      ? `${base}${addition}`
      : `${base} ${addition}`;
  const at = joined.indexOf(IDEA_PLACEHOLDER, base.length);
  return { text: joined, select: at === -1 ? null : [at, at + IDEA_PLACEHOLDER.length] };
}
