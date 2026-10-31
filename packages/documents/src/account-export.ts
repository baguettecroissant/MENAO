/**
 * Export des données personnelles (RGPD, art. 15 et 20 ; ADR 0039) : tout ce que le compte peut
 * lire, avec sa propre session. Les droits de lecture de la base limitent chaque table à ses
 * propres données (l'équipe MENAO, qui lit tout, n'a pas accès à « Mon compte »). Les photos et
 * documents restent téléchargeables depuis l'espace ; l'export en donne les références. Partagé
 * par le site et l'application (ADR 0083), chacun avec son client Supabase.
 */
import type { Role } from "../../core/src/roles.ts";

/** Lecture d'une table : le sous-ensemble du client Supabase dont l'export a besoin. */
export type ExportQuery = PromiseLike<{
  data: unknown[] | null;
  error: { message: string } | null;
}> & {
  eq(column: string, value: string): ExportQuery;
  order(column: string): ExportQuery;
  range(from: number, to: number): ExportQuery;
  maybeSingle(): PromiseLike<{ data: unknown }>;
};
export type ExportClient = { from(table: string): { select(columns: "*"): ExportQuery } };

export type ExportAccount = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  role: Role;
};

const PAGE_SIZE = 1000;

/** Toutes les lignes d'une requête, par pages de 1 000 (limite de l'API). */
async function all(build: () => ExportQuery): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function accountExport(
  client: ExportClient,
  account: ExportAccount,
  now: Date,
): Promise<Record<string, unknown>> {
  const uid = account.id;
  /** Lignes d'une table, éventuellement filtrées sur une colonne, par date de création. */
  const rows = (table: string, filter?: readonly [column: string, value: string]) =>
    all(() => {
      const query = client.from(table).select("*");
      return (filter ? query.eq(...filter) : query).order("created_at").order("id");
    });

  const [profile, acceptances, notifications, tickets, ticketMessages] = await Promise.all([
    client.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
    rows("legal_acceptances", ["user_id", uid]),
    rows("notifications", ["user_id", uid]),
    rows("tickets", ["user_id", uid]),
    rows("ticket_messages"),
  ]);

  const common = {
    format: "MENAO — export des données personnelles (RGPD, articles 15 et 20)",
    genere_le: now.toISOString(),
    compte: {
      email: account.email,
      cree_le: account.createdAt,
      derniere_connexion: account.lastSignInAt,
      role: account.role,
      profil: profile.data,
      acceptations_des_documents_legaux: acceptances,
    },
    notifications,
    echanges_avec_menao: { demandes: tickets, messages: ticketMessages },
  };

  // Tables communes aux deux espaces : limitées par la base au compte connecté.
  const shared = () =>
    Promise.all([
      rows("appointments"),
      rows("chantier_updates"),
      rows("messages"),
      rows("payments"),
      rows("invoices"),
      rows("receptions"),
    ]);

  if (account.role === "particulier") {
    const [projects, photos, requests, chantiers, quotes, reviews, rest] = await Promise.all([
      rows("projects", ["user_id", uid]),
      rows("project_photos"),
      rows("requests", ["particulier_id", uid]),
      rows("chantiers", ["particulier_id", uid]),
      rows("quotes"),
      rows("reviews", ["particulier_id", uid]),
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

  const { data: artisan } = await client
    .from("artisans")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (!artisan) return common;
  const aid = (artisan as { id: string }).id;
  const [
    trades,
    workTypes,
    zones,
    territories,
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
    rows("artisan_trades", ["artisan_id", aid]),
    rows("artisan_work_types", ["artisan_id", aid]),
    rows("artisan_zones", ["artisan_id", aid]),
    rows("artisan_territories", ["artisan_id", aid]),
    rows("artisan_documents", ["artisan_id", aid]),
    rows("certifications", ["artisan_id", aid]),
    rows("artisan_photos", ["artisan_id", aid]),
    rows("artisan_hours", ["artisan_id", aid]),
    rows("artisan_absences", ["artisan_id", aid]),
    rows("subscriptions", ["artisan_id", aid]),
    rows("requests", ["artisan_id", aid]),
    rows("chantiers", ["artisan_id", aid]),
    rows("quotes", ["artisan_id", aid]),
    rows("quote_lines"),
    rows("reviews", ["artisan_id", aid]),
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
      territoires: territories,
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
