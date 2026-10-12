import "server-only";
import {
  MONITORED_DOCUMENT_TYPES,
  artisanVisibility,
  availabilityStatus,
  clientsAwaitingQuote,
  expiryStatus,
  homePathForRole,
  parisToday,
  requestsAwaitingAnswer,
  roleFromAppMetadata,
  subscriptionGrantsAccess,
  type ChantierStatus,
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
    .select("id, status, suspension_reason, connect_charges_enabled, paused, available_from")
    .eq("user_id", auth.claims.sub)
    .single();
  if (!artisan || (artisan.status !== "valide" && artisan.status !== "suspendu")) {
    redirect("/pro/onboarding");
  }

  const today = parisToday();
  const [{ data: profile }, { data: subscription }, { data: documents }, { data: absences }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name, avatar_path")
        .eq("user_id", auth.claims.sub)
        .single(),
      supabase.from("subscriptions").select("status").eq("artisan_id", artisan.id).maybeSingle(),
      supabase
        .from("artisan_documents")
        .select("type, status, date_fin")
        .eq("artisan_id", artisan.id)
        .in("status", ["valide", "en_attente"]),
      // F-44 : absences en cours et à venir (statut du menu, agenda, disponibilités).
      supabase
        .from("artisan_absences")
        .select("id, starts_on, ends_on, label")
        .eq("artisan_id", artisan.id)
        .gte("ends_on", today)
        .order("starts_on"),
    ]);
  const upcomingAbsences = (absences ?? []).map((a) => ({
    id: a.id,
    startsOn: a.starts_on,
    endsOn: a.ends_on,
    label: a.label,
  }));
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
    lastName: profile?.last_name ?? null,
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
    today,
    paused: artisan.paused,
    availableFrom: artisan.available_from,
    absences: upcomingAbsences,
    availability: availabilityStatus({
      paused: artisan.paused,
      availableFrom: artisan.available_from,
      absences: upcomingAbsences,
      today,
    }),
  };
});

/** Demandes reçues et chantiers de l'artisan, partagés entre la coque et le tableau de bord. */
export const artisanActivity = cache(async () => {
  const { supabase } = await requireProSpace();
  const [{ data: inbox }, { data: chantiers }] = await Promise.all([
    supabase.rpc("artisan_inbox"),
    supabase.rpc("artisan_chantiers"),
  ]);
  return { inbox: inbox ?? [], chantiers: chantiers ?? [] };
});

/**
 * Coque de l'espace pro (ADR 0035) : compte, compteurs du menu (demandes à traiter, clients en
 * attente de devis, messages non lus, avis sans réponse), visibilité de l'artisan et statut de
 * disponibilité (F-44).
 */
export const getProShell = cache(async () => {
  const space = await requireProSpace();
  const [{ inbox, chantiers }, { data: unread }, { count: reviewsToAnswer }] = await Promise.all([
    artisanActivity(),
    space.supabase.rpc("my_unread_messages"),
    // Avis publiés sans réponse de l'artisan (F-28).
    space.supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", space.artisanId)
      .eq("status", "publie")
      .is("reply", null),
  ]);
  return {
    account: {
      firstName: space.firstName,
      lastName: space.lastName,
      avatarUrl: space.avatarUrl,
      role: "artisan" as const,
    },
    badges: {
      requests: requestsAwaitingAnswer(inbox, new Date()).length,
      quotes: clientsAwaitingQuote(
        chantiers.map((c) => ({
          status: c.status as ChantierStatus,
          particulierId: c.particulier_id,
        })),
      ),
      messages: unread ?? 0,
      reviews: reviewsToAnswer ?? 0,
    },
    visibility: { ...space.visibility, availability: space.availability },
  };
});
