/**
 * Messagerie par chantier (F-40), entre le particulier et l'artisan : texte, photos et documents
 * PDF. Elle existe dès que le chantier existe (demande acceptée) et devient en lecture seule si
 * le chantier est annulé ou le devis refusé. Mêmes règles en base (migration messagerie). Sans
 * import : module aussi chargé par Deno (process-upload). ADR 0031.
 */

export const MESSAGE_MAX_LENGTH = 2000;
/** Envois de messages texte : 30 par minute et par compte au plus. */
export const MESSAGE_RATE_LIMIT = { max: 30, windowSeconds: 60 } as const;
/** Pièces jointes d'une conversation : 200 au plus. */
export const MAX_MESSAGE_ATTACHMENTS = 200;

export type MessageKind = "texte" | "photo" | "fichier";

/** Conversation en lecture seule : chantier annulé ou devis refusé (app.conversation_closed). */
export function conversationClosed(status: string): boolean {
  return status === "annule" || status === "devis_refuse";
}

/** Type de message d'une pièce jointe, selon le type réel du fichier (packages/core : files.ts). */
export function messageAttachmentKind(type: "pdf" | "jpeg" | "png"): Exclude<MessageKind, "texte"> {
  return type === "pdf" ? "fichier" : "photo";
}
