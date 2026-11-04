/**
 * Assistant des pages Pro (F-69, ADR 0218) : répond aux artisans qui découvrent MENAO, à partir
 * des seuls contenus publiés du site (texte /assistant-pro.txt), et les oriente vers l'inscription
 * ou une demande de rappel. Limites de la conversation, nettoyage de l'historique envoyé par le
 * navigateur, schéma et nettoyage de la réponse du modèle.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function pro-assistant.
 */

/** Questions libres par conversation : au-delà, l'artisan est orienté vers un humain. */
export const PRO_ASSISTANT_MAX_QUESTIONS = 6;
export const PRO_ASSISTANT_QUESTION_MIN_LENGTH = 2;
export const PRO_ASSISTANT_QUESTION_MAX_LENGTH = 500;
/** Une réponse se lit dans une petite fenêtre : quelques phrases. */
export const PRO_ASSISTANT_ANSWER_MAX_LENGTH = 900;
/** Questions de relance proposées sous une réponse, en un toucher. */
export const PRO_ASSISTANT_MAX_SUGGESTIONS = 3;
const SUGGESTION_MAX_LENGTH = 70;
/** Échanges précédents renvoyés au modèle (questions et réponses), les plus récents. */
const HISTORY_MAX_MESSAGES = 10;

export type ProAssistantMessage = { role: "user" | "assistant"; text: string };

/**
 * Historique reçu du navigateur, rendu sûr : messages valides seulement, longueurs bornées, les
 * plus récents, commençant par une question et alternant question et réponse (forme attendue par
 * le modèle). Il n'est jamais conservé.
 */
export function normalizeProAssistantHistory(value: unknown): ProAssistantMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: ProAssistantMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") continue;
    const clean = text.trim();
    if (!clean) continue;
    const max =
      role === "user" ? PRO_ASSISTANT_QUESTION_MAX_LENGTH : PRO_ASSISTANT_ANSWER_MAX_LENGTH;
    const previous = messages[messages.length - 1];
    // Deux messages du même côté à la suite : seul le dernier est gardé.
    if (previous?.role === role) messages.pop();
    messages.push({ role, text: clean.slice(0, max) });
  }
  let recent = messages.slice(-HISTORY_MAX_MESSAGES);
  while (recent[0]?.role === "assistant") recent = recent.slice(1);
  // L'historique précède une nouvelle question : il se termine par une réponse.
  if (recent[recent.length - 1]?.role === "user") recent = recent.slice(0, -1);
  return recent;
}

/** Nombre de questions déjà posées dans l'historique. */
export function proAssistantQuestionCount(history: readonly ProAssistantMessage[]): number {
  return history.filter((m) => m.role === "user").length;
}

/** Réponse brute du modèle (sortie structurée, proAssistantJsonSchema). */
export type RawProAssistantAnswer = {
  reponse: string;
  /** La réponse ne figure pas dans les contenus fournis : proposer un échange avec l'équipe. */
  sans_reponse: boolean;
  /** Question sans rapport avec MENAO pour un artisan. */
  hors_sujet: boolean;
  /** Questions de relance que l'artisan pourrait poser ensuite. */
  suggestions: string[];
};

export type ProAssistantAnswer = {
  answer: string;
  /** Proposer le rappel ou l'écriture à l'équipe en évidence sous la réponse. */
  suggestHuman: boolean;
  /** Questions de relance (au plus 3), à poser d'un toucher. */
  suggestions: string[];
};

export function proAssistantJsonSchema() {
  return {
    type: "object",
    properties: {
      reponse: { type: "string" },
      sans_reponse: { type: "boolean" },
      hors_sujet: { type: "boolean" },
      suggestions: { type: "array", items: { type: "string" } },
    },
    required: ["reponse", "sans_reponse", "hors_sujet", "suggestions"],
    additionalProperties: false,
  } as const;
}

/**
 * Nettoyage de la réponse : texte simple (ni titres ni gras Markdown), longueur bornée à la fin
 * d'une phrase. Réponse vide : null (l'appelant affiche le message d'indisponibilité).
 */
export function normalizeProAssistantAnswer(raw: RawProAssistantAnswer): ProAssistantAnswer | null {
  let text = raw.reponse
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  if (text.length > PRO_ASSISTANT_ANSWER_MAX_LENGTH) {
    const cut = text.slice(0, PRO_ASSISTANT_ANSWER_MAX_LENGTH);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"), cut.lastIndexOf(" ?"));
    text = end > PRO_ASSISTANT_ANSWER_MAX_LENGTH / 2 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
  }
  return {
    answer: text,
    suggestHuman: raw.sans_reponse || raw.hors_sujet,
    suggestions: normalizeSuggestions(raw.suggestions),
  };
}

/**
 * Questions de relance : courtes, terminées par « ? », sans doublon (casse ignorée), au plus 3.
 * Les questions trop longues ou vides sont écartées plutôt que coupées.
 */
export function normalizeSuggestions(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    let text = value.replace(/\s+/g, " ").trim();
    if (!text || text.length > SUGGESTION_MAX_LENGTH) continue;
    if (!text.endsWith("?")) text = `${text.replace(/[.!…]+$/, "")} ?`;
    const key = text.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length === PRO_ASSISTANT_MAX_SUGGESTIONS) break;
  }
  return result;
}
