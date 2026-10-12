import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
type Rows = Record<string, unknown>[];

const LIMIT = 1000;
const NONE = ["00000000-0000-0000-0000-000000000000"];
const ids = (rows: Rows, key = "id") =>
  rows.map((r) => r[key]).filter((v): v is string => typeof v === "string");
/** Filtre « dans la liste », jamais vide (une liste vide ne filtrerait rien côté API). */
const inList = (values: string[]) => (values.length ? values : NONE);

/**
 * Export RGPD d'une personne par l'équipe (art. 15 et 20 ; ADR 0048). Contrairement à l'export de
 * « Mon compte » (ADR 0039), l'équipe lit toutes les lignes : chaque table est donc filtrée
 * explicitement sur la personne. Les messages entre client et artisan restent privés et ne sont
 * pas inclus (la personne les obtient par son propre export) ; photos et documents sont donnés par
 * leurs références.
 */
export async function adminUserExport(supabase: Client, userId: string) {
  const [{ data: account }, { data: profile }, acceptances, tickets] = await Promise.all([
    supabase.rpc("admin_user_account", { p_user_id: userId }),
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("legal_acceptances").select("*").eq("user_id", userId).limit(LIMIT),
    supabase.from("tickets").select("*").eq("user_id", userId).limit(LIMIT),
  ]);
  if (!account || !profile) return null;
  const ticketRows = (tickets.data ?? []) as Rows;
  const { data: ticketMessages } = await supabase
    .from("ticket_messages")
    .select("*")
    .in("ticket_id", inList(ids(ticketRows)))
    .limit(LIMIT);

  const common = {
    format: "MENAO — export des données personnelles par l'équipe (RGPD, articles 15 et 20)",
    genere_le: new Date().toISOString(),
    compte: {
      ...(account as Record<string, unknown>),
      role: profile.role,
      profil: profile,
      acceptations_des_documents_legaux: acceptances.data ?? [],
    },
    echanges_avec_menao: { demandes: ticketRows, messages: ticketMessages ?? [] },
    non_inclus:
      "Messages entre client et artisan et notifications : téléchargeables par la personne depuis « Mon compte ».",
  };

  if (profile.role === "particulier") {
    const [projects, requests, chantiers, reviews] = await Promise.all([
      supabase.from("projects").select("*").eq("user_id", userId).limit(LIMIT),
      supabase.from("requests").select("*").eq("particulier_id", userId).limit(LIMIT),
      supabase.from("chantiers").select("*").eq("particulier_id", userId).limit(LIMIT),
      supabase.from("reviews").select("*").eq("particulier_id", userId).limit(LIMIT),
    ]);
    const chantierIds = inList(ids((chantiers.data ?? []) as Rows));
    const [photos, quotes, payments, invoices, receptions] = await Promise.all([
      supabase
        .from("project_photos")
        .select("*")
        .in("project_id", inList(ids((projects.data ?? []) as Rows)))
        .limit(LIMIT),
      supabase
        .from("quotes")
        .select("*")
        .in("chantier_id", chantierIds)
        .neq("status", "brouillon")
        .limit(LIMIT),
      supabase.from("payments").select("*").in("chantier_id", chantierIds).limit(LIMIT),
      supabase.from("invoices").select("*").in("chantier_id", chantierIds).limit(LIMIT),
      supabase.from("receptions").select("*").in("chantier_id", chantierIds).limit(LIMIT),
    ]);
    return {
      ...common,
      projets: { projets: projects.data ?? [], photos: photos.data ?? [] },
      demandes: requests.data ?? [],
      chantiers: chantiers.data ?? [],
      devis: quotes.data ?? [],
      paiements: payments.data ?? [],
      factures: invoices.data ?? [],
      proces_verbaux_de_reception: receptions.data ?? [],
      avis_donnes: reviews.data ?? [],
    };
  }

  const { data: artisan } = await supabase
    .from("artisans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!artisan) return common;
  const aid = artisan.id;
  const [
    trades,
    zones,
    documents,
    certifications,
    photos,
    subscriptions,
    requests,
    chantiers,
    quotes,
    payments,
    invoices,
    receptions,
    reviews,
  ] = await Promise.all([
    supabase.from("artisan_trades").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("artisan_zones").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("artisan_documents").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("certifications").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("artisan_photos").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("subscriptions").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("requests").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("chantiers").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("quotes").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("payments").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("invoices").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("receptions").select("*").eq("artisan_id", aid).limit(LIMIT),
    supabase.from("reviews").select("*").eq("artisan_id", aid).limit(LIMIT),
  ]);
  return {
    ...common,
    entreprise: {
      fiche: artisan,
      metiers: trades.data ?? [],
      zones: zones.data ?? [],
      documents: documents.data ?? [],
      certifications: certifications.data ?? [],
      photos: photos.data ?? [],
      abonnements: subscriptions.data ?? [],
    },
    demandes_recues: requests.data ?? [],
    chantiers: chantiers.data ?? [],
    devis: quotes.data ?? [],
    paiements: payments.data ?? [],
    factures: invoices.data ?? [],
    proces_verbaux_de_reception: receptions.data ?? [],
    avis_recus: reviews.data ?? [],
  };
}
