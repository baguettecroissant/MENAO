/**
 * Signature électronique (F-13), derrière une interface : DocuSeal en V1 (décision D8, signature
 * simple, hébergement UE). Logique pure, sans réseau : aussi chargée par Deno (Edge Functions).
 * TODO(legal) : valeur probante de la signature simple avec code à usage unique (ADR 0022).
 */

/** Rôle du signataire chez le prestataire, repris dans les balises du PDF. */
export const SIGNER_ROLE = "Client";

/** Cases cochées par le client avant de signer (F-13). */
export const SIGNATURE_CONSENTS = [
  "document",
  "cgu_prestataire",
  "cgu_menao",
  "echeancier",
] as const;
export type SignatureConsent = (typeof SIGNATURE_CONSENTS)[number];

export type SigningRequestInput = {
  /** PDF du devis envoyé, encodé en base64. */
  pdfBase64: string;
  filename: string;
  signer: { name: string; email: string; phone: string | null };
  /** Identifiant MENAO repris dans les événements du prestataire (devis). */
  externalId: string;
  completedRedirectUrl: string;
  /** Fin de validité du devis : plus de signature possible ensuite. */
  expireAt: string;
};

export type SigningRequest = { submissionId: string; submitterId: string; signingUrl: string };

export type CompletedSignature = {
  completedAt: string | null;
  /** Liens temporaires : à télécharger aussitôt. */
  documentUrl: string | null;
  auditLogUrl: string | null;
};

export interface SignatureProvider {
  createSigningRequest(input: SigningRequestInput): Promise<SigningRequest>;
  getCompletedSignature(submissionId: string): Promise<CompletedSignature>;
}

/** Écart maximal accepté entre l'horodatage d'un webhook et l'heure du serveur (secondes). */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Comparaison en temps constant de deux chaînes de même longueur. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Webhook DocuSeal : en-tête `X-Docuseal-Signature: <horodatage>.<HMAC-SHA256 hexadécimal>`,
 * calculé sur `<horodatage>.<corps brut>` avec le secret du webhook (whsec_…).
 */
export async function verifyDocusealSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds: number,
): Promise<boolean> {
  if (!header || !secret) return false;
  const separator = header.indexOf(".");
  if (separator <= 0) return false;
  const timestamp = header.slice(0, separator);
  const signature = header.slice(separator + 1).toLowerCase();
  if (!/^\d{1,12}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)),
  );
  return safeEqual(expected, signature);
}
