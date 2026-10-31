import "server-only";
import {
  CHARTER_VERSION,
  ENGAGEMENT_VERSION,
  artisanVisibility,
  canSubmitOnboarding,
  subscriptionGrantsAccess,
  type SubscriptionStatus,
  homePathForRole,
  onboardingProgress,
  roleFromAppMetadata,
  type ArtisanOnboardingSnapshot,
  type DocumentSnapshot,
  type RequiredDocumentType,
} from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Données de l'onboarding de l'artisan connecté (mises en cache pour la durée de la requête,
 * partagées entre le layout et la page). Redirige si l'utilisateur n'est pas artisan.
 */
export const getOnboardingContext = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/connexion?next=/pro/onboarding");

  const role = roleFromAppMetadata(auth.claims.app_metadata);
  if (role !== "artisan" && role !== "artisan_en_attente") redirect(homePathForRole(role) as Route);

  const { data: artisan, error } = await supabase
    .from("artisans")
    .select("*")
    .eq("user_id", auth.claims.sub)
    .single();
  if (error) throw new Error("Fiche artisan introuvable");

  const [
    trades,
    workTypes,
    zones,
    territories,
    certifications,
    documents,
    photos,
    profile,
    subscriptionRow,
    charterRow,
  ] = await Promise.all([
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisan.id),
    supabase.from("artisan_work_types").select("work_type_code").eq("artisan_id", artisan.id),
    supabase
      .from("artisan_zones")
      .select("code_insee, nom")
      .eq("artisan_id", artisan.id)
      .order("nom"),
    supabase
      .from("artisan_territories")
      .select("departement_code, region_code")
      .eq("artisan_id", artisan.id),
    supabase
      .from("certifications")
      .select("id, type, numero, date_fin, verified_at")
      .eq("artisan_id", artisan.id)
      .order("date_fin"),
    supabase
      .from("artisan_documents")
      .select(
        "id, type, storage_path, status, date_emission, date_fin, numero, assureur, couverture, refusal_reason",
      )
      .eq("artisan_id", artisan.id),
    supabase
      .from("artisan_photos")
      .select("id, storage_path")
      .eq("artisan_id", artisan.id)
      .order("sort_order"),
    supabase.from("profiles").select("avatar_path").eq("user_id", auth.claims.sub).single(),
    supabase
      .from("subscriptions")
      .select(
        "plan_code, status, periodicite, trial_end, current_period_end, cancel_at_period_end, past_due_since",
      )
      .eq("artisan_id", artisan.id)
      .maybeSingle(),
    // Charte qualité et engagement de l'artisan signés dans leur version en vigueur (ADR 0104, 0117).
    supabase
      .from("artisan_charter_acceptances")
      .select("version, signer_name, company, siret, accepted_at")
      .eq("artisan_id", artisan.id)
      .eq("version", CHARTER_VERSION)
      .eq("engagement_version", ENGAGEMENT_VERSION)
      .maybeSingle(),
  ]);
  const subscription = subscriptionRow.data;
  const charter = charterRow.data;

  // Les documents archivés (« remplace ») ne comptent plus. Par type : le document validé en
  // cours s'il existe, sinon celui en cours d'examen.
  const documentList = (documents.data ?? []).filter(
    (d): d is typeof d & { status: DocumentSnapshot["status"] } => d.status !== "remplace",
  );
  const rank = (status: string) => (status === "valide" ? 0 : status === "en_attente" ? 1 : 2);
  const documentSnapshots: Partial<Record<RequiredDocumentType, DocumentSnapshot>> = {};
  for (const d of [...documentList].sort((a, b) => rank(b.status) - rank(a.status))) {
    documentSnapshots[d.type] = {
      status: d.status,
      dateEmission: d.date_emission,
      dateFin: d.date_fin,
    };
  }
  const avatarPath = profile.data?.avatar_path ?? null;

  const tradeCodes = (trades.data ?? []).map((t) => t.trade_code);
  const zoneList = zones.data ?? [];
  const territoryCodes = (territories.data ?? []).flatMap(
    (t) => t.departement_code ?? t.region_code ?? [],
  );
  const snapshot: ArtisanOnboardingSnapshot = {
    siretVerified: artisan.sirene_checked_at !== null,
    sireneActive: artisan.sirene_active === true,
    raisonSociale: artisan.raison_sociale,
    assujettiTva: artisan.assujetti_tva,
    tradeCount: tradeCodes.length,
    zoneMode: artisan.zone_mode,
    radiusKm: artisan.radius_km,
    hasBaseLocation: artisan.base_location !== null,
    communeCount: zoneList.length,
    territoryCount: territoryCodes.length,
    documents: documentSnapshots,
    presentationLength: artisan.presentation?.trim().length ?? 0,
    hasAvatar: avatarPath !== null,
    connectChargesEnabled: artisan.connect_charges_enabled,
    charterAccepted: charter !== null,
    decennaleExempt: artisan.decennale_non_soumis,
    subscriptionActive: subscriptionGrantsAccess(
      (subscription?.status as SubscriptionStatus | undefined) ?? null,
      subscription?.past_due_since ?? null,
    ),
  };

  return {
    supabase,
    userId: auth.claims.sub,
    artisan,
    avatarPath,
    subscription,
    charter,
    documents: documentList,
    photos: photos.data ?? [],
    canSubmit: canSubmitOnboarding(snapshot),
    visibility: artisanVisibility({
      status: artisan.status,
      subscriptionActive: snapshot.subscriptionActive,
      connectChargesEnabled: snapshot.connectChargesEnabled,
    }),
    tradeCodes,
    workTypeCodes: (workTypes.data ?? []).map((w) => w.work_type_code),
    zones: zoneList,
    territoryCodes,
    certifications: certifications.data ?? [],
    snapshot,
    progress: onboardingProgress(snapshot),
  };
});

export type OnboardingContext = Awaited<ReturnType<typeof getOnboardingContext>>;
