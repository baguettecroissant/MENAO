import "server-only";
import type { Role } from "@menao/core";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Paged = {
  range(
    from: number,
    to: number,
  ): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
};

const PAGE_SIZE = 1000;

/** Toutes les lignes d'une requête, par pages de 1 000 (limite de l'API). */
async function all(build: () => Paged): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/**
 * Export des données personnelles (RGPD, art. 15 et 20 ; ADR 0039) : tout ce que le compte peut
 * lire, avec sa propre session. Les droits de lecture de la base limitent chaque table à ses
 * propres données (l'équipe MENAO, qui lit tout, n'a pas accès à « Mon compte »). Les photos et
 * documents restent téléchargeables depuis l'espace ; l'export en donne les références.
 */
export async function accountExport(
  supabase: Supabase,
  user: User,
  role: Role,
): Promise<Record<string, unknown>> {
  const uid = user.id;
  const byDate = <T extends { order: (column: string) => T }>(query: T) =>
    query.order("created_at").order("id");

  const [profile, acceptances, notifications, tickets, ticketMessages] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
    all(() => byDate(supabase.from("legal_acceptances").select("*").eq("user_id", uid))),
    all(() => byDate(supabase.from("notifications").select("*").eq("user_id", uid))),
    all(() => byDate(supabase.from("tickets").select("*").eq("user_id", uid))),
    all(() => byDate(supabase.from("ticket_messages").select("*"))),
  ]);

  const common = {
    format: "MENAO — export des données personnelles (RGPD, articles 15 et 20)",
    genere_le: new Date().toISOString(),
    compte: {
      email: user.email ?? null,
      cree_le: user.created_at,
      derniere_connexion: user.last_sign_in_at ?? null,
      role,
      profil: profile.data,
      acceptations_des_documents_legaux: acceptances,
    },
    notifications,
    echanges_avec_menao: { demandes: tickets, messages: ticketMessages },
  };

  // Tables communes aux deux espaces : limitées par la base au compte connecté.
  const shared = () =>
    Promise.all([
      all(() => byDate(supabase.from("appointments").select("*"))),
      all(() => byDate(supabase.from("chantier_updates").select("*"))),
      all(() => byDate(supabase.from("messages").select("*"))),
      all(() => byDate(supabase.from("payments").select("*"))),
      all(() => byDate(supabase.from("invoices").select("*"))),
      all(() => byDate(supabase.from("receptions").select("*"))),
    ]);

  if (role === "particulier") {
    const [projects, photos, requests, chantiers, quotes, reviews, rest] = await Promise.all([
      all(() => byDate(supabase.from("projects").select("*").eq("user_id", uid))),
      all(() => byDate(supabase.from("project_photos").select("*"))),
      all(() => byDate(supabase.from("requests").select("*").eq("particulier_id", uid))),
      all(() => byDate(supabase.from("chantiers").select("*").eq("particulier_id", uid))),
      all(() => byDate(supabase.from("quotes").select("*"))),
      all(() => byDate(supabase.from("reviews").select("*").eq("particulier_id", uid))),
      shared(),
    ]);
    const [appointments, updates, chantierMessages, payments, invoices, receptions] = rest;
    return {
      ...common,
      projets: { projets: projects, photos },
      demandes: requests,
      chantiers: {
        chantiers,
        rendez_vous: appointments,
        suivi: updates,
        messages: chantierMessages,
      },
      devis: quotes,
      paiements: payments,
      factures: invoices,
      proces_verbaux_de_reception: receptions,
      avis_donnes: reviews,
    };
  }

  const { data: artisan } = await supabase
    .from("artisans")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (!artisan) return common;
  const aid = artisan.id;
  const [
    trades,
    workTypes,
    zones,
    documents,
    certifications,
    photos,
    hours,
    absences,
    subscriptions,
    requests,
    chantiers,
    quotes,
    quoteLines,
    reviews,
    rest,
  ] = await Promise.all([
    all(() => byDate(supabase.from("artisan_trades").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("artisan_work_types").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("artisan_zones").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("artisan_documents").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("certifications").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("artisan_photos").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("artisan_hours").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("artisan_absences").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("subscriptions").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("requests").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("chantiers").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("quotes").select("*").eq("artisan_id", aid))),
    all(() => byDate(supabase.from("quote_lines").select("*"))),
    all(() => byDate(supabase.from("reviews").select("*").eq("artisan_id", aid))),
    shared(),
  ]);
  const [appointments, updates, chantierMessages, payments, invoices, receptions] = rest;
  return {
    ...common,
    entreprise: {
      fiche: artisan,
      metiers: trades,
      specialites: workTypes,
      zones,
      documents,
      certifications,
      photos_de_realisations: photos,
      horaires: hours,
      absences,
      abonnement: subscriptions,
    },
    demandes_recues: requests,
    chantiers: {
      chantiers,
      rendez_vous: appointments,
      suivi: updates,
      messages: chantierMessages,
    },
    devis: { devis: quotes, lignes: quoteLines },
    paiements: payments,
    factures: invoices,
    proces_verbaux_de_reception: receptions,
    avis_recus: reviews,
  };
}
