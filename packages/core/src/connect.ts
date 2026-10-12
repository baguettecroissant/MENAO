/**
 * Stripe Connect (F-14 étape 6) et visibilité de l'artisan.
 * Paiements des chantiers en « direct charges » sur le compte de l'artisan (ADR 0011) : MENAO
 * ne détient aucun fonds. Fichier autonome (aucun import) : importé par l'Edge Function stripe-webhook.
 */

export type ConnectAccountSnapshot = {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  artisanId: string | null;
  /** Champs Stripe à fournir (en retard puis demandés), ex. « external_account ». */
  requirementsDue: string[];
  /** Champs transmis, en cours de vérification par Stripe. */
  requirementsPending: string[];
  /** Raison de la désactivation (« requirements.past_due », « under_review », « rejected.… »). */
  disabledReason: string | null;
  /** Date limite des informations demandées (ISO), si Stripe en fixe une. */
  requirementsDeadline: string | null;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Lit un objet « account » de Stripe (webhook account.updated ou API). Sinon null. */
export function connectAccountFromStripe(input: unknown): ConnectAccountSnapshot | null {
  if (!isObj(input) || input.object !== "account" || typeof input.id !== "string") return null;
  const metadata = isObj(input.metadata) ? input.metadata : {};
  const requirements = isObj(input.requirements) ? input.requirements : {};
  return {
    stripeAccountId: input.id,
    chargesEnabled: input.charges_enabled === true,
    payoutsEnabled: input.payouts_enabled === true,
    detailsSubmitted: input.details_submitted === true,
    artisanId: typeof metadata.artisan_id === "string" ? metadata.artisan_id : null,
    requirementsDue: [
      ...new Set([...strings(requirements.past_due), ...strings(requirements.currently_due)]),
    ],
    requirementsPending: strings(requirements.pending_verification),
    disabledReason:
      typeof requirements.disabled_reason === "string" ? requirements.disabled_reason : null,
    requirementsDeadline:
      typeof requirements.current_deadline === "number"
        ? new Date(requirements.current_deadline * 1000).toISOString()
        : null,
  };
}

export type VisibilityCondition = "validation" | "abonnement" | "paiements";

/**
 * L'artisan est visible des particuliers et reçoit des demandes s'il est validé, abonné et
 * peut encaisser (spec F-14). Miroir SQL : app.artisan_is_visible.
 */
export function artisanVisibility(a: {
  status: "brouillon" | "en_verification" | "valide" | "refuse" | "suspendu";
  subscriptionActive: boolean;
  connectChargesEnabled: boolean;
}): { visible: boolean; missing: VisibilityCondition[] } {
  const missing: VisibilityCondition[] = [];
  if (a.status !== "valide") missing.push("validation");
  if (!a.subscriptionActive) missing.push("abonnement");
  if (!a.connectChargesEnabled) missing.push("paiements");
  return { visible: missing.length === 0, missing };
}

/** Rubriques des informations demandées par Stripe, dans l'ordre d'affichage. */
export const CONNECT_REQUIREMENT_GROUPS = [
  "banque",
  "identite",
  "representant",
  "adresse",
  "entreprise",
  "justificatif_entreprise",
  "personnes",
  "activite",
  "conditions",
  "autre",
] as const;
export type ConnectRequirementGroup = (typeof CONNECT_REQUIREMENT_GROUPS)[number];

function requirementGroup(field: string): ConnectRequirementGroup {
  if (field === "external_account" || field.startsWith("external_account.")) return "banque";
  if (field.startsWith("tos_acceptance.")) return "conditions";
  if (field.startsWith("business_profile.")) return "activite";
  if (field.startsWith("company.verification.")) return "justificatif_entreprise";
  if (
    /^(owners|directors|executives|person_[A-Za-z0-9]+)\b/.test(field) ||
    /^company\.(owners|directors|executives)_provided$/.test(field)
  ) {
    return "personnes";
  }
  if (/^(individual|representative)\.(verification\.|id_number)/.test(field)) return "identite";
  if (field.includes(".address.") || field.endsWith(".address")) return "adresse";
  if (/^(individual|representative)\./.test(field)) return "representant";
  if (field.startsWith("company.") || field === "business_type") return "entreprise";
  return "autre";
}

/** Champs Stripe (ex. « individual.verification.document ») regroupés en rubriques lisibles. */
export function connectRequirementGroups(fields: readonly string[]): ConnectRequirementGroup[] {
  const groups = new Set(fields.map(requirementGroup));
  return CONNECT_REQUIREMENT_GROUPS.filter((group) => groups.has(group));
}

export type ConnectAccountStatus =
  "a_demarrer" | "actif" | "a_completer" | "verification" | "refuse";

/** État du compte de paiement, pour dire à l'artisan ce qu'il lui reste à faire (F-14). */
export function connectAccountStatus(a: {
  hasAccount: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: readonly string[];
  requirementsPending: readonly string[];
  disabledReason: string | null;
}): ConnectAccountStatus {
  if (!a.hasAccount) return "a_demarrer";
  if (a.disabledReason?.startsWith("rejected")) return "refuse";
  if (a.chargesEnabled) return "actif";
  if (a.requirementsDue.length > 0) return "a_completer";
  if (
    a.requirementsPending.length > 0 ||
    a.detailsSubmitted ||
    a.disabledReason === "under_review"
  ) {
    return "verification";
  }
  return "a_completer";
}
