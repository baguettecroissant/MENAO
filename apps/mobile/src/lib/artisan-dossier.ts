import {
  CHARTER_VERSION,
  ENGAGEMENT_VERSION,
  canSubmitOnboarding,
  dossierItemsLeft,
  onboardingProgress,
  parisToday,
  presentationDraft,
  subscriptionGrantsAccess,
  type ArtisanOnboardingSnapshot,
  type DocumentSnapshot,
  type RequiredDocumentType,
  type SubscriptionStatus,
} from "@menao/core";
import { presentationSchema } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";
import { myArtisanKey } from "./team";

/**
 * « Faire vérifier mon entreprise » dans l'application (ADR 0113), comme sur le site (ADR 0111) :
 * mêmes règles (`onboardingProgress`, `dossierItemsLeft`, `canSubmitOnboarding`), même envoi
 * (`submit_artisan_onboarding`). Sans formule ni abonnement (règle 10).
 */

export type DossierDocument = {
  type: RequiredDocumentType;
  status: DocumentSnapshot["status"];
  refusal_reason: string | null;
  date_fin: string | null;
  /** « registre » : fiche de vérification générée par MENAO à la place du Kbis (ADR 0217). */
  source: string;
  /** AAAA-MM-JJ : date de la vérification pour une fiche du registre. */
  date_emission: string | null;
};

export type Dossier = {
  status: "brouillon" | "en_verification" | "valide" | "refuse" | "suspendu" | "radie";
  refusalReason: string | null;
  snapshot: ArtisanOnboardingSnapshot;
  /** Métiers déclarés, avec leur libellé (couverture de la décennale, ADR 0116). */
  trades: { code: string; label: string }[];
  documents: DossierDocument[];
  /** « Proposer un texte » : présentation construite avec ce que MENAO sait déjà. */
  presentationDraft: string;
  /** Dernier contrôle au registre (ADR 0217) : raison si le Kbis reste demandé. */
  registryStatus: string | null;
  presentation: string;
  avatarPath: string | null;
  /** Fiche proposée par Google (ADR 0144), cochée par défaut. */
  indexable: boolean;
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
      "id, status, refusal_reason, sirene_checked_at, sirene_active, raison_sociale, nom_commercial, forme_juridique_code, adresse_commune, date_creation_entreprise, experience_years, assujetti_tva, zone_mode, radius_km, base_location, presentation, connect_charges_enabled, decennale_non_soumis, indexable, registre_statut",
    )
    .eq("id", await myArtisanKey())
    .maybeSingle();
  if (!artisan) return null;

  const [trades, zones, territories, documents, profile, charter, subscription, rge] =
    await Promise.all([
      supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisan.id),
      supabase.from("artisan_zones").select("code_insee").eq("artisan_id", artisan.id),
      supabase
        .from("artisan_territories")
        .select("departement_code, region_code")
        .eq("artisan_id", artisan.id),
      supabase
        .from("artisan_documents")
        .select("type, source, status, date_emission, date_fin, refusal_reason")
        .eq("artisan_id", artisan.id),
      supabase.from("profiles").select("avatar_path").eq("user_id", auth.user.id).maybeSingle(),
      supabase
        .from("artisan_charter_acceptances")
        .select("id")
        .eq("artisan_id", artisan.id)
        .eq("version", CHARTER_VERSION)
        .eq("engagement_version", ENGAGEMENT_VERSION)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, past_due_since")
        .eq("artisan_id", artisan.id)
        .maybeSingle(),
      // Qualification RGE en cours, pour la présentation proposée.
      supabase
        .from("artisan_rge_qualifications")
        .select("id", { count: "exact", head: true })
        .eq("artisan_id", artisan.id)
        .gte("date_fin", parisToday()),
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

  const tradeCodes = (trades.data ?? []).map((t) => t.trade_code);
  const { data: tradeLabels } = tradeCodes.length
    ? await supabase.from("trades").select("code, label").in("code", tradeCodes).order("sort_order")
    : { data: [] };

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
    territoryCount: territories.data?.length ?? 0,
    documents: snapshots,
    presentationLength: presentation.trim().length,
    hasAvatar: avatarPath !== null,
    subscriptionActive: subscriptionGrantsAccess(
      (subscription.data?.status as SubscriptionStatus | undefined) ?? null,
      subscription.data?.past_due_since ?? null,
    ),
    connectChargesEnabled: artisan.connect_charges_enabled,
    charterAccepted: charter.data !== null,
    decennaleExempt: artisan.decennale_non_soumis,
  };
  return {
    status: artisan.status,
    refusalReason: artisan.refusal_reason,
    snapshot,
    trades: tradeLabels ?? [],
    documents: rows.map((d) => ({
      type: d.type,
      status: d.status,
      refusal_reason: d.refusal_reason,
      date_fin: d.date_fin,
      source: d.source,
      date_emission: d.date_emission,
    })),
    registryStatus: artisan.registre_statut,
    presentation,
    presentationDraft: presentationDraft(
      {
        companyName: artisan.nom_commercial ?? artisan.raison_sociale,
        legalFormCode: artisan.forme_juridique_code,
        trades: (tradeLabels ?? []).map((trade) => trade.label),
        city: artisan.adresse_commune,
        zoneMode: artisan.zone_mode,
        radiusKm: artisan.radius_km,
        territories: (territories.data ?? []).flatMap(
          (row) => row.departement_code ?? row.region_code ?? [],
        ),
        sinceYear: artisan.date_creation_entreprise
          ? Number(artisan.date_creation_entreprise.slice(0, 4))
          : null,
        experienceYears: artisan.experience_years,
        rge: (rge.count ?? 0) > 0,
      },
      Number(parisToday().slice(0, 4)),
    ),
    avatarPath,
    indexable: artisan.indexable,
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

/** « Non soumis » à la décennale (ADR 0116), tant que le dossier n'est pas envoyé. */
export async function setDecennaleExempt(value: boolean): Promise<string | null> {
  const { error } = await supabase.rpc("set_decennale_non_soumis", { p_value: value });
  return error ? fr.errors.generic : null;
}

/**
 * Fiche dans Google ou non (ADR 0144, 0171), comme sur le site : la base n'autorise que cette
 * colonne. La fiche publique est remise en cache toutes les heures. Message d'erreur, ou null.
 */
export async function saveGoogleListing(value: boolean): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fr.errors.generic;
  const { error } = await supabase
    .from("artisans")
    .update({ indexable: value })
    .eq("user_id", auth.user.id);
  return error ? fr.errors.generic : null;
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

export type ZoneDemand = {
  jours: number;
  recherches: number;
  metiers: { metier: string; recherches: number }[];
};

/**
 * Recherches des métiers de l'artisan dans sa zone ces 30 derniers jours (ADR 0182), comme sur le
 * site : des nombres seulement. null en cas d'erreur.
 */
export async function loadZoneDemand(): Promise<ZoneDemand | null> {
  const { data, error } = await supabase.rpc("my_zone_demand");
  return error || !data ? null : (data as ZoneDemand);
}
