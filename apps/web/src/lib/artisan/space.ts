import "server-only";
import {
  CHARTER_VERSION,
  ENGAGEMENT_VERSION,
  artisanVisibility,
  availabilityStatus,
  clientsAwaitingQuote,
  documentsToRenew as toRenew,
  homePathForRole,
  parisToday,
  parseTeamContext,
  requestsAwaitingAnswer,
  roleFromAppMetadata,
  spaceExamplesShown,
  subscriptionGrantsAccess,
  teamCan,
  type ChantierStatus,
  type SubscriptionStatus,
  type TeamContext,
  type TeamPermission,
} from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Place de l'utilisateur dans une entreprise (F-89, ADR 0240) : patron (titulaire de la fiche) ou
 * membre de son équipe, accès suspendu compris. Null : pas de fiche artisan. Mis en cache pour la
 * durée de la requête.
 */
export const teamContext = cache(async (): Promise<TeamContext | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_team_context");
  return parseTeamContext(data);
});

/**
 * Espace pro (tableau de bord, demandes, chantiers) : artisans validés (ou suspendus et radiés, qui
 * gardent l'accès à leurs chantiers). Les autres artisans finissent leur inscription. Charte qualité en
 * vigueur signée d'abord (ADR 0109). Mis en cache pour la durée de la requête, partagé entre le
 * layout et les pages.
 */
export const requireProSpace = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/pro/tableau-de-bord");
  const role = roleFromAppMetadata(auth.claims.app_metadata);
  if (role === "artisan_en_attente") redirect("/pro/onboarding");
  if (role !== "artisan") redirect(homePathForRole(role) as Route);

  // Patron (titulaire de la fiche) ou membre actif de son équipe (F-89, ADR 0240).
  const team = await teamContext();
  if (team?.suspended) redirect("/pro/acces-suspendu");
  const { data: artisan } = team?.artisanId
    ? await supabase
        .from("artisans")
        .select(
          "id, status, suspension_reason, radiation_reason, connect_charges_enabled, paused, available_from, examples_hidden_at",
        )
        .eq("id", team.artisanId)
        .single()
    : { data: null };
  // Un artisan radié garde, comme un suspendu, l'accès à ses chantiers et factures (ADR 0114).
  if (
    !team ||
    !artisan ||
    (artisan.status !== "valide" && artisan.status !== "suspendu" && artisan.status !== "radie")
  ) {
    // Un membre n'a pas d'inscription à finir : seul le patron la reprend.
    redirect(team && team.position !== "patron" ? "/pro/acces-suspendu" : "/pro/onboarding");
  }
  // Artisan inscrit avant la charte, ou nouvelle version de la charte ou de l'engagement de
  // l'artisan (ADR 0117) : signature d'abord. Engagement de l'entreprise, signé par le patron :
  // ses membres n'ont rien à signer.
  if (team.position === "patron") {
    const { data: charter } = await supabase
      .from("artisan_charter_acceptances")
      .select("id")
      .eq("artisan_id", artisan.id)
      .eq("version", CHARTER_VERSION)
      .eq("engagement_version", ENGAGEMENT_VERSION)
      .maybeSingle();
    if (!charter) redirect("/pro/charte");
  }

  const today = parisToday();
  const [{ data: profile }, { data: subscription }, { data: documents }, { data: absences }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name, avatar_path")
        .eq("user_id", auth.claims.sub)
        .single(),
      supabase
        .from("subscriptions")
        .select("status, past_due_since")
        .eq("artisan_id", artisan.id)
        .maybeSingle(),
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
  const documentsToRenew = toRenew(documents ?? []);
  // Attestation URSSAF demandée depuis le 17 octobre 2026 (ADR 0115) : un artisan validé avant
  // n'est pas suspendu, il est invité à l'ajouter.
  const urssafMissing = !documents?.some((d) => d.type === "urssaf");

  return {
    supabase,
    artisanId: artisan.id,
    /** Place dans l'entreprise : patron, chef d'équipe ou ouvrier (ADR 0240). */
    teamPosition: team.position,
    company: team.company,
    status: artisan.status,
    suspensionReason: artisan.suspension_reason,
    radiationReason: artisan.radiation_reason,
    documentsToRenew,
    urssafMissing,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    avatarUrl: profile?.avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
      : null,
    visibility: artisanVisibility({
      status: artisan.status,
      subscriptionActive: subscriptionGrantsAccess(
        (subscription?.status as SubscriptionStatus | undefined) ?? null,
        subscription?.past_due_since ?? null,
      ),
      connectChargesEnabled: artisan.connect_charges_enabled,
    }),
    today,
    examplesHiddenAt: artisan.examples_hidden_at,
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

/**
 * Page réservée à certaines places de l'équipe (ADR 0241) : demandes, argent, vitrine, export
 * comptable… Les autres reviennent à l'accueil (la base refuse de toute façon leurs données).
 */
export async function requireTeamPermission(permission: TeamPermission) {
  const space = await requireProSpace();
  if (!teamCan(space.teamPosition, permission)) redirect("/pro/tableau-de-bord");
  return space;
}

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
 * Exemples dans l'espace (ADR 0184) : tant que l'artisan n'a reçu aucune demande ni aucun chantier
 * et ne les a pas masqués.
 */
export const spaceExamples = cache(async () => {
  const [space, { inbox, chantiers }] = await Promise.all([requireProSpace(), artisanActivity()]);
  // Exemples pour le patron seulement : un ouvrier sans chantier attribué n'est pas un nouvel inscrit.
  if (space.teamPosition !== "patron") return false;
  return spaceExamplesShown({
    requests: inbox.length,
    chantiers: chantiers.length,
    hiddenAt: space.examplesHiddenAt,
  });
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
      // Rubriques du menu selon la place dans l'entreprise (ADR 0241).
      teamPosition: space.teamPosition,
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
    // Visibilité de la fiche (abonnement, paiements en ligne) : l'affaire du patron (ADR 0241).
    visibility:
      space.teamPosition === "patron"
        ? { ...space.visibility, availability: space.availability }
        : null,
  };
});
