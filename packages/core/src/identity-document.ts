/**
 * Pièce d'identité du dirigeant (F-181, ADR 0378) : ce qu'il faut déposer selon la pièce choisie,
 * ce qui a été lu sur chaque côté, et ce qui peut être transmis à Stripe pour ouvrir le compte de
 * paiement.
 */
export const IDENTITY_PIECES = ["carte_identite", "passeport", "titre_sejour"] as const;
export type IdentityPiece = (typeof IDENTITY_PIECES)[number];

export const IDENTITY_SIDES = ["recto", "verso"] as const;
export type IdentitySide = (typeof IDENTITY_SIDES)[number];

export function isIdentityPiece(value: unknown): value is IdentityPiece {
  return IDENTITY_PIECES.some((piece) => piece === value);
}

/** Côtés à déposer : recto et verso pour une carte, une seule page pour un passeport. */
export function identitySides(piece: IdentityPiece): readonly IdentitySide[] {
  return piece === "passeport" ? ["recto"] : IDENTITY_SIDES;
}

/** Tous les côtés demandés par la pièce sont déposés. */
export function identityComplete(
  piece: IdentityPiece,
  deposited: Partial<Record<IdentitySide, boolean>>,
): boolean {
  return identitySides(piece).every((side) => deposited[side] === true);
}

/** Ce que la lecture automatique a trouvé sur un côté (dates au format AAAA-MM-JJ). */
export type IdentityReading = { dateFin?: string | null; birthDate?: string | null };

/**
 * Réunit ce qui a été lu sur chaque côté, dans l'ordre donné (recto, puis verso) : la première
 * valeur trouvée est gardée. La fin de validité est au recto ou au verso selon la pièce.
 */
export function mergeIdentityReadings(readings: readonly (IdentityReading | null | undefined)[]): {
  dateFin: string | null;
  birthDate: string | null;
} {
  const first = (field: keyof IdentityReading) =>
    readings.map((reading) => reading?.[field]).find((value) => Boolean(value)) ?? null;
  return { dateFin: first("dateFin"), birthDate: first("birthDate") };
}

/** Formats que Stripe accepte pour une pièce d'identité (un PDF ne lui est pas transmis). */
export const STRIPE_IDENTITY_MIME_TYPES = ["image/jpeg", "image/png"] as const;

const stripeImage = (mime: string | null | undefined) =>
  STRIPE_IDENTITY_MIME_TYPES.some((type) => type === mime);

/**
 * Côtés de la pièce déposée que MENAO peut transmettre à Stripe : aucun si l'artisan a refusé la
 * transmission ou si le recto n'est pas une image ; le verso seulement s'il existe et s'il est une
 * image. Ce qui manque sera demandé à l'artisan par Stripe.
 */
export function stripeIdentitySides(document: {
  share: boolean;
  mimeType: string | null;
  versoMimeType: string | null;
}): IdentitySide[] {
  if (!document.share || !stripeImage(document.mimeType)) return [];
  return stripeImage(document.versoMimeType) ? ["recto", "verso"] : ["recto"];
}

/** Identifiant d'un fichier déposé chez Stripe (« file_… »). */
export function isStripeFileId(value: unknown): value is string {
  return typeof value === "string" && /^file_[A-Za-z0-9]{8,250}$/.test(value);
}
