/**
 * Moments forts des conseillers (F-196, lot 85, ADR 0396) : primes à célébrer, artisans à relancer
 * (fin d'essai, dossier bloqué, lien préparé pas ouvert), messages prêts selon l'étape qui manque
 * et préférences des notifications sur le téléphone. Fichier autonome (aucun import).
 */

/** Ce que le conseiller a à faire pour ses artisans, du plus urgent au moins urgent. */
export const COMMERCIAL_ALERT_KINDS = ["fin_essai", "bloque", "lien"] as const;
export type CommercialAlertKind = (typeof COMMERCIAL_ALERT_KINDS)[number];

/** Délais par défaut (réglables dans le back-office). */
export const COMMERCIAL_ALERT_DEFAULTS = {
  bloqueJours: 3,
  finEssaiJours: 7,
  lienJours: 2,
} as const;
/** « Me le rappeler dans 2 jours ». */
export const COMMERCIAL_ALERT_SNOOZE_DAYS = 2;

/** Notifications des conseillers qui peuvent partir sur le téléphone, chacune désactivable. */
export const COMMERCIAL_PUSH_TYPES = [
  "conseiller_prime",
  "conseiller_relance",
  "conseiller_fin_essai",
  "conseiller_lien",
] as const;
export type CommercialPushType = (typeof COMMERCIAL_PUSH_TYPES)[number];

export const isCommercialPushType = (value: unknown): value is CommercialPushType =>
  typeof value === "string" && (COMMERCIAL_PUSH_TYPES as readonly string[]).includes(value);

/** Préférences push : tout est activé sauf refus explicite (`{ push: { type: false } }`). */
export function commercialPushPrefs(preferences: unknown): Record<CommercialPushType, boolean> {
  const push =
    preferences && typeof preferences === "object" && "push" in preferences
      ? (preferences as { push?: unknown }).push
      : null;
  const out = {} as Record<CommercialPushType, boolean>;
  for (const type of COMMERCIAL_PUSH_TYPES) {
    out[type] = !(
      push &&
      typeof push === "object" &&
      (push as Record<string, unknown>)[type] === false
    );
  }
  return out;
}

export type CommercialAlert = {
  kind: CommercialAlertKind;
  /** Date utile : fin de l'essai, dernier mouvement du dossier, préparation du lien. */
  at: string;
};

/** Fin d'essai d'abord (la plus proche), puis dossiers bloqués (les plus anciens), puis liens. */
export function sortCommercialAlerts<T extends CommercialAlert>(alerts: readonly T[]): T[] {
  return [...alerts].sort(
    (a, b) =>
      COMMERCIAL_ALERT_KINDS.indexOf(a.kind) - COMMERCIAL_ALERT_KINDS.indexOf(b.kind) ||
      a.at.localeCompare(b.at),
  );
}

/** Jours entiers entre deux instants (au moins 0). */
export function wholeDaysBetween(from: string, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000));
}

/** Jours restants jusqu'à une date (arrondi au-dessus, au moins 0). */
export function alertDaysLeft(date: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000));
}

/** Ce qu'il manque, dit à l'artisan, pour chaque étape du dossier. */
const STEP_ASKS: Readonly<Record<string, string>> = {
  entreprise: "confirmer votre entreprise",
  metiers: "choisir vos métiers",
  zone: "choisir votre zone d'intervention",
  charte: "signer la charte qualité",
  documents: "déposer votre pièce d'identité (et votre Kbis s'il est demandé)",
  profil: "ajouter votre photo et votre présentation",
  decennale: "déposer votre attestation de décennale",
  rc_pro: "déposer votre attestation de RC Pro",
  urssaf: "déposer votre attestation URSSAF ou MSA",
  paiements: "ouvrir votre compte de paiement",
  formule: "choisir votre formule",
};

/**
 * Message de relance prêt, selon la première étape qui manque. Envoyé par le conseiller lui-même,
 * depuis son téléphone ; la mention pour ne plus recevoir de messages est ajoutée à part.
 */
export function relanceMessage(input: {
  steps: readonly string[];
  artisanFirstName: string | null;
  advisor: string;
}): string {
  const hello = input.artisanFirstName ? `Bonjour ${input.artisanFirstName},` : "Bonjour,";
  const asks = input.steps.map((s) => STEP_ASKS[s]).filter((s): s is string => Boolean(s));
  const first = asks[0];
  const what = !first
    ? "il reste peu de choses pour finir votre inscription"
    : asks.length === 1
      ? `il ne vous reste qu'à ${first}`
      : `il vous reste à ${first}, puis ${asks.length - 1} autre${asks.length > 2 ? "s" : ""} étape${asks.length > 2 ? "s" : ""}`;
  return `${hello} c'est ${input.advisor}, de MENAO. Votre dossier avance : ${what}. Tout se fait depuis votre espace, rubrique « Mon dossier ». Je reste disponible si besoin.`;
}

/** Message avant la fin de l'essai : prendre des nouvelles, sans rien promettre. */
export function trialEndMessage(input: {
  artisanFirstName: string | null;
  advisor: string;
  days: number;
}): string {
  const hello = input.artisanFirstName ? `Bonjour ${input.artisanFirstName},` : "Bonjour,";
  const when = input.days <= 1 ? "demain" : `dans ${input.days} jours`;
  return `${hello} c'est ${input.advisor}, de MENAO. Votre essai se termine ${when} : comment se passent vos premières semaines ? Je peux vous aider à bien régler votre fiche et vos disponibilités.`;
}

/** Clé publique VAPID (base64url) vers les octets attendus par PushManager.subscribe. */
export function vapidKeyBytes(base64url: string): Uint8Array {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
