import "server-only";
import {
  MONITORED_DOCUMENT_TYPES,
  artisanVisibility,
  expiryStatus,
  homePathForRole,
  roleFromAppMetadata,
  subscriptionGrantsAccess,
  type SubscriptionStatus,
} from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Espace pro (tableau de bord, demandes, chantiers) : artisans validés (ou suspendus, qui gardent
 * l'accès à leurs chantiers). Les autres artisans finissent leur inscription. Mis en cache pour la
 * durée de la requête, partagé entre le layout et les pages.
 */
export const requireProSpace = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/pro/tableau-de-bord");
  const role = roleFromAppMetadata(auth.claims.app_metadata);
  if (role === "artisan_en_attente") redirect("/pro/onboarding");
  if (role !== "artisan") redirect(homePathForRole(role) as Route);

  const { data: artisan } = await supabase
    .from("artisans")
    .select("id, status, suspension_reason, connect_charges_enabled")
    .eq("user_id", auth.claims.sub)
    .single();
  if (!artisan || (artisan.status !== "valide" && artisan.status !== "suspendu")) {
    redirect("/pro/onboarding");
  }

  const [{ data: profile }, { data: subscription }, { data: documents }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, avatar_path")
      .eq("user_id", auth.claims.sub)
      .single(),
    supabase.from("subscriptions").select("status").eq("artisan_id", artisan.id).maybeSingle(),
    supabase
      .from("artisan_documents")
      .select("type, status, date_fin")
      .eq("artisan_id", artisan.id)
      .in("status", ["valide", "en_attente"]),
  ]);
  // F-51 : documents surveillés arrivant à échéance (ou expirés) sans renouvellement déposé.
  const documentsToRenew = MONITORED_DOCUMENT_TYPES.filter((type) => {
    const current = documents?.find((d) => d.type === type && d.status === "valide");
    const pending = documents?.some((d) => d.type === type && d.status === "en_attente");
    return current && !pending && expiryStatus(current.date_fin) !== "ok";
  });

  return {
    supabase,
    artisanId: artisan.id,
    status: artisan.status,
    suspensionReason: artisan.suspension_reason,
    documentsToRenew,
    firstName: profile?.first_name ?? null,
    avatarUrl: profile?.avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
      : null,
    visibility: artisanVisibility({
      status: artisan.status,
      subscriptionActive: subscriptionGrantsAccess(
        (subscription?.status as SubscriptionStatus | undefined) ?? null,
      ),
      connectChargesEnabled: artisan.connect_charges_enabled,
    }),
  };
});
