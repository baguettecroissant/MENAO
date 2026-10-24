/**
 * Photo → description (F-05, ADR 0180) : le particulier joint une photo de son problème ou de la
 * pièce à refaire, l'IA rédige le début de sa demande, qu'il vérifie et complète. Schéma de la
 * réponse du modèle, nettoyage et ajout au texte déjà saisi.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function describe-photo.
 */

/** Côté le plus long de la copie envoyée au modèle (assez pour lire une fissure ou un joint). */
export const PHOTO_DESCRIPTION_MAX_SIDE = 1024;
/** Image envoyée en base64 : environ 1,5 Mo au plus une fois décodée. */
export const PHOTO_DESCRIPTION_MAX_BASE64 = 2_000_000;
const DESCRIPTION_MAX_LENGTH = 280;

/** Réponse brute du modèle (sortie structurée, photoDescriptionJsonSchema). */
export type RawPhotoDescription = { description: string | null; lisible: boolean };

/** Schéma JSON de la sortie structurée du modèle. */
export function photoDescriptionJsonSchema() {
  return {
    type: "object" as const,
    properties: {
      description: { anyOf: [{ type: "string" }, { type: "null" }] },
      lisible: { type: "boolean" },
    },
    required: ["description", "lisible"],
    additionalProperties: false,
  };
}

/**
 * Description prête pour le champ : une ou deux phrases, sans chiffre (aucune surface ni quantité
 * devinée sur une photo), terminées par un point. null si la photo est illisible ou hors sujet.
 */
export function normalizePhotoDescription(raw: RawPhotoDescription): string | null {
  if (!raw.lisible) return null;
  const text = (raw.description ?? "").replace(/\s+/g, " ").trim();
  if (!text || /^null$/i.test(text) || text.length > DESCRIPTION_MAX_LENGTH || /\d/.test(text)) {
    return null;
  }
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?…]$/.test(sentence) ? sentence : `${sentence}.`;
}

/** Description ajoutée après le texte déjà saisi, en nouvelle phrase. */
export function appendDescription(text: string, description: string): string {
  const base = text.trimEnd();
  if (!base) return description;
  return `${base}${/[.!?…]$/.test(base) ? " " : ". "}${description}`;
}
