import {
  CHARTER_VERSION,
  canSubmitOnboarding,
  dossierItemsLeft,
  onboardingProgress,
  subscriptionGrantsAccess,
  type ArtisanOnboardingSnapshot,
  type DocumentSnapshot,
  type RequiredDocumentType,
  type SubscriptionStatus,
} from "@menao/core";
import { presentationSchema } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/**
 * « Faire vérifier mon entreprise » dans l'application (ADR 0113), comme sur le site (ADR 0111) :
 * mêmes règles (`onboardingProgress`, `dossierItemsLeft`, `canSubmitOnboarding`), même envoi
 * (`submit_artisan_onboarding`). Sans formule ni abonnement (règle 10).
 */

export type DossierDocument = {
  type: RequiredDocumentType;
  status: DocumentSnapshot["status"];
  refusal_reason: string | null;
};

export type Dossier = {
  status: "brouillon" | "en_verification" | "valide" | "refuse" | "suspendu";
  refusalReason: string | null;
  snapshot: ArtisanOnboardingSnapshot;
  documents: DossierDocument[];
  presentation: string;
  avatarPath: string | null;
  itemsLeft: number;
  canSubmit: boolean;
  progress: ReturnType<typeof onboardingProgress>;
};

export async function loadDossier(): Promise<Dossier | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select(
      "id, status, refusal_reason, sirene_checked_at, sirene_active, raison_sociale, assujetti_tva, zone_mode, radius_km, base_location, presentation, connect_charges_enabled",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!artisan) return null;

  const [trades, zones, documents, profile, charter, subscription] = await Promise.all([
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisan.id),
    supabase.from("artisan_zones").select("code_insee").eq("artisan_id", artisan.id),
    supabase
      .from("artisan_documents")
      .select("type, status, date_emission, date_fin, refusal_reason")
      .eq("artisan_id", artisan.id),
    supabase.from("profiles").select("avatar_path").eq("user_id", auth.user.id).maybeSingle(),
    supabase
      .from("artisan_charter_acceptances")
      .select("id")
      .eq("artisan_id", artisan.id)
      .eq("version", CHARTER_VERSION)
      .maybeSingle(),
    supabase.from("subscriptions").select("status").eq("artisan_id", artisan.id).maybeSingle(),
  ]);

  // Par type : le document validé s'il existe, sinon celui en cours d'examen (« remplace » ignoré).
  const rows = (documents.data ?? []).filter(
    (d): d is typeof d & { status: DocumentSnapshot["status"] } => d.status !== "remplace",
  );
  const rank = (status: string) => (status === "valide" ? 0 : status === "en_attente" ? 1 : 2);
  const snapshots: Partial<Record<RequiredDocumentType, DocumentSnapshot>> = {};
  for (const d of [...rows].sort((a, b) => rank(b.status) - rank(a.status))) {
    snapshots[d.type] = { status: d.status, dateEmission: d.date_emission, dateFin: d.date_fin };
  }

  const presentation = artisan.presentation ?? "";
  const avatarPath = profile.data?.avatar_path ?? null;
  const snapshot: ArtisanOnboardingSnapshot = {
    siretVerified: artisan.sirene_checked_at !== null,
    sireneActive: artisan.sirene_active === true,
    raisonSociale: artisan.raison_sociale,
    assujettiTva: artisan.assujetti_tva,
    tradeCount: trades.data?.length ?? 0,
    zoneMode: artisan.zone_mode,
    radiusKm: artisan.radius_km,
    hasBaseLocation: artisan.base_location !== null,
    communeCount: zones.data?.length ?? 0,
    documents: snapshots,
    presentationLength: presentation.trim().length,
    hasAvatar: avatarPath !== null,
    subscriptionActive: subscriptionGrantsAccess(
      (subscription.data?.status as SubscriptionStatus | undefined) ?? null,
    ),
    connectChargesEnabled: artisan.connect_charges_enabled,
    charterAccepted: charter.data !== null,
  };
  return {
    status: artisan.status,
    refusalReason: artisan.refusal_reason,
    snapshot,
    documents: rows.map((d) => ({
      type: d.type,
      status: d.status,
      refusal_reason: d.refusal_reason,
    })),
    presentation,
    avatarPath,
    itemsLeft: dossierItemsLeft(snapshot),
    canSubmit: canSubmitOnboarding(snapshot),
    progress: onboardingProgress(snapshot),
  };
}

/** Envoi du dossier en vérification (la base refait les contrôles). Message d'erreur, ou null. */
export async function submitDossier(): Promise<string | null> {
  const { error } = await supabase.rpc("submit_artisan_onboarding");
  return error ? fr.proDossier.submitError : null;
}

/** Présentation de la fiche (100 caractères au moins). Message d'erreur, ou null. */
export async function savePresentation(value: string): Promise<string | null> {
  const parsed = presentationSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? fr.errors.generic;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fr.errors.generic;
  const { error } = await supabase
    .from("artisans")
    .update({ presentation: parsed.data })
    .eq("user_id", auth.user.id);
  return error ? fr.errors.generic : null;
}
