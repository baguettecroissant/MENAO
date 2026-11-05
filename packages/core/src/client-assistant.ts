/**
 * Assistant des particuliers (F-71, ADR 0220) : depuis la saisie du besoin, il répond aux
 * questions d'un particulier à partir des seuls contenus publiés (/assistant-particulier.txt),
 * l'aide à décrire un symptôme et prépare sa demande. Schéma de la réponse du modèle et nettoyage
 * de la demande préparée ; historique et réponse : mêmes règles que l'assistant des pages Pro
 * (pro-assistant.ts). Fichier autonome (aucun import) : il est aussi importé par l'Edge Function
 * client-assistant.
 */

/** Une description de demande reste lisible en un coup d'œil, puis se complète dans le champ. */
export const CLIENT_DRAFT_MAX_LENGTH = 600;
const CLIENT_DRAFT_MIN_LENGTH = 15;

/** Demande préparée par le modèle : prête à reprendre dans le champ de saisie. */
export type RawClientDraft = {
  prete: boolean;
  description: string | null;
  metier: string | null;
};

export type ClientDraft = { description: string; trade: string | null };

export function clientAssistantJsonSchema() {
  const text = { anyOf: [{ type: "string" }, { type: "null" }] };
  return {
    type: "object",
    properties: {
      reponse: { type: "string" },
      sans_reponse: { type: "boolean" },
      hors_sujet: { type: "boolean" },
      suggestions: { type: "array", items: { type: "string" } },
      demande: {
        type: "object",
        properties: { prete: { type: "boolean" }, description: text, metier: text },
        required: ["prete", "description", "metier"],
        additionalProperties: false,
      },
    },
    required: ["reponse", "sans_reponse", "hors_sujet", "suggestions", "demande"],
    additionalProperties: false,
  } as const;
}

/**
 * Demande préparée, ou null : seulement si le modèle la dit prête, avec une description d'une
 * longueur raisonnable (coupée à la fin d'une phrase au-delà du maximum). Le métier n'est gardé
 * que s'il fait partie des métiers actifs ; sinon l'analyse habituelle le choisira.
 */
export function normalizeClientDraft(
  raw: RawClientDraft,
  tradeCodes: readonly string[],
): ClientDraft | null {
  if (!raw.prete || !raw.description) return null;
  let description = raw.description.replace(/\s+/g, " ").trim();
  if (description.length < CLIENT_DRAFT_MIN_LENGTH) return null;
  if (description.length > CLIENT_DRAFT_MAX_LENGTH) {
    const cut = description.slice(0, CLIENT_DRAFT_MAX_LENGTH);
    const end = cut.lastIndexOf(". ");
    description = end > CLIENT_DRAFT_MAX_LENGTH / 2 ? cut.slice(0, end + 1) : cut.trimEnd();
  }
  const trade = raw.metier && tradeCodes.includes(raw.metier) ? raw.metier : null;
  return { description, trade };
}
