import { decennaleInsurer, journalSummary, type JournalSummary } from "@menao/core";
import type { Database } from "@menao/db";
import { fr } from "@/i18n/fr";
import { publicUrl } from "./project";
import { supabase } from "./supabase";

type Fn = Database["public"]["Functions"];
export type ClientChantier = Fn["particulier_chantiers"]["Returns"][number];
export type RequestRow = Fn["particulier_requests"]["Returns"][number];
export type CancelReason = Fn["particulier_cancel_request"]["Args"]["p_reason"];
export type Draft = {
  id: string;
  title: string | null;
  city: string | null;
  createdAt: string;
};

/** Liens signés (1 h) des fichiers d'un espace privé, par chemin ; les droits RLS s'appliquent. */
async function signedUrls(bucket: string, paths: readonly (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map<string, string>();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, 3600);
  return new Map(
    (data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
  );
}

const avatarOf = (path: string | null) => (path ? publicUrl("avatars", path) : null);

export type MyChantiers = {
  chantiers: ClientChantier[];
  requests: RequestRow[];
  drafts: Draft[];
  cancelledByClient: Set<string>;
  /** Photo de couverture : par chemin (chantiers) et par projet (demandes en attente). */
  photoByPath: Map<string, string>;
  photoByProject: Map<string, string>;
};

/**
 * « Mes chantiers » (F-12), comme sur le site : chantiers, demandes encore sans chantier,
 * recherches non envoyées. Lecture avec les droits du compte (RLS).
 */
export async function loadMyChantiers(): Promise<MyChantiers | null> {
  const [chantiers, requests, drafts, cancelled] = await Promise.all([
    supabase.rpc("particulier_chantiers"),
    supabase.rpc("particulier_requests"),
    supabase
      .from("projects")
      .select("id, summary, description, ville_nom, created_at")
      .in("status", ["brouillon", "criteres_valides"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("requests").select("id").not("cancellation_reason", "is", null),
  ]);
  if (chantiers.error || requests.error) return null;
  const pendingProjects = [
    ...new Set((requests.data ?? []).filter((r) => !r.chantier_id).map((r) => r.project_id)),
  ];
  const { data: projectPhotos } = pendingProjects.length
    ? await supabase
        .from("project_photos")
        .select("project_id, storage_path")
        .in("project_id", pendingProjects)
        .order("sort_order")
    : { data: [] };
  const firstPhoto = new Map<string, string>();
  for (const p of projectPhotos ?? []) {
    if (!firstPhoto.has(p.project_id)) firstPhoto.set(p.project_id, p.storage_path);
  }
  const photoByPath = await signedUrls("project-photos", [
    ...(chantiers.data ?? []).map((c) => c.photo_path),
    ...firstPhoto.values(),
  ]);
  const photoByProject = new Map(
    [...firstPhoto].flatMap(([project, path]) => {
      const url = photoByPath.get(path);
      return url ? [[project, url] as const] : [];
    }),
  );
  return {
    chantiers: chantiers.data ?? [],
    requests: requests.data ?? [],
    drafts: (drafts.data ?? []).map((d) => ({
      id: d.id,
      title: d.summary ?? d.description ?? null,
      city: d.ville_nom,
      createdAt: d.created_at,
    })),
    cancelledByClient: new Set((cancelled.data ?? []).map((r) => r.id)),
    photoByPath,
    photoByProject,
  };
}

export const artisanAvatar = avatarOf;

export type ChantierDocument = {
  kind: "devis" | "acompte" | "solde" | "pv";
  numero: string;
  date: string;
  id: string;
  /** Devis signé (PDF signé chez le prestataire). */
  signed: boolean;
};

/** PV de réception (F-25, F-26) : réserves, levée signalée par l'artisan. */
export type ChantierReception = {
  id: string;
  numero: string;
  status: string;
  reserves: string | null;
  signedAt: string | null;
  liftSignaledAt: string | null;
  liftMessage: string | null;
};

export type ChantierDetail = {
  c: ClientChantier;
  coverUrl: string | null;
  avatarUrl: string | null;
  journal: JournalSummary;
  photoUrls: string[];
  payments: { status: Database["public"]["Enums"]["payment_status"]; amountCents: number }[];
  documents: ChantierDocument[];
  reception: ChantierReception | null;
  /** Signalement encore ouvert sur ce chantier (F-42). */
  openTicketId: string | null;
  /** Assureur décennal repris du devis figé (garanties après la réception). */
  insurer: { name: string; policy: string | null } | null;
};

/** Vue d'un chantier (F-12) : avancement, journal de l'artisan, paiements, documents et PV. */
export async function loadChantier(id: string): Promise<ChantierDetail | null> {
  const { data: rows } = await supabase.rpc("particulier_chantiers", { p_chantier_id: id });
  const c = rows?.[0];
  if (!c) return null;
  const [
    { data: updates },
    { data: quotes },
    { data: payments },
    { data: invoices },
    { data: reception },
    { data: openTicket },
  ] = await Promise.all([
    supabase
      .from("chantier_updates")
      .select("id, kind, message, storage_path, created_at")
      .eq("chantier_id", id),
    supabase
      .from("quotes")
      .select("id, status, numero, signed_at, sent_at, decennale:document->issuer->decennale")
      .eq("chantier_id", id)
      .neq("status", "brouillon")
      .order("version", { ascending: false })
      .limit(1),
    supabase.from("payments").select("status, amount_cents").eq("chantier_id", id),
    supabase
      .from("invoices")
      .select("id, numero, kind, issued_on")
      .eq("chantier_id", id)
      .order("issued_on"),
    supabase
      .from("receptions")
      .select("id, numero, status, reserves, signed_at, lift_signaled_at, lift_message")
      .eq("chantier_id", id)
      .maybeSingle(),
    supabase
      .from("tickets")
      .select("id")
      .eq("chantier_id", id)
      .eq("type", "litige")
      .neq("status", "resolu")
      .maybeSingle(),
  ]);
  const journal = journalSummary(
    (updates ?? []).map((u) => ({
      id: u.id,
      kind: u.kind,
      message: u.message,
      storagePath: u.storage_path,
      createdAt: u.created_at,
    })),
  );
  const [journalPhotos, cover] = await Promise.all([
    signedUrls("chantier-photos", journal.photos),
    signedUrls("project-photos", [c.photo_path]),
  ]);
  const quote = quotes?.[0];
  const documents: ChantierDocument[] = [
    ...(quote?.numero
      ? [
          {
            kind: "devis" as const,
            numero: quote.numero,
            date: quote.signed_at ?? quote.sent_at ?? c.created_at,
            id: quote.id,
            signed: quote.status === "signe",
          },
        ]
      : []),
    ...(invoices ?? []).map((i) => ({
      kind: (i.kind === "solde" ? "solde" : "acompte") as "acompte" | "solde",
      numero: i.numero,
      date: i.issued_on,
      id: i.id,
      signed: false,
    })),
    ...(reception?.status === "signe" && reception.signed_at
      ? [
          {
            kind: "pv" as const,
            numero: reception.numero,
            date: reception.signed_at,
            id: reception.id,
            signed: true,
          },
        ]
      : []),
  ];
  return {
    c,
    coverUrl: c.photo_path ? (cover.get(c.photo_path) ?? null) : null,
    avatarUrl: avatarOf(c.artisan_avatar_path),
    journal,
    photoUrls: journal.photos.flatMap((p) => {
      const url = journalPhotos.get(p);
      return url ? [url] : [];
    }),
    payments: (payments ?? []).map((p) => ({ status: p.status, amountCents: p.amount_cents })),
    documents,
    reception: reception
      ? {
          id: reception.id,
          numero: reception.numero,
          status: reception.status,
          reserves: reception.reserves,
          signedAt: reception.signed_at,
          liftSignaledAt: reception.lift_signaled_at,
          liftMessage: reception.lift_message,
        }
      : null,
    openTicketId: openTicket?.id ?? null,
    insurer: decennaleInsurer(quote?.decennale),
  };
}

/** Annulation du chantier par le client (F-12), avant tout devis signé : motif, mot facultatif. */
export async function cancelChantier(
  chantierId: string,
  reason: CancelReason,
  comment: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("particulier_cancel_chantier", {
    p_chantier_id: chantierId,
    p_reason: reason,
    ...(comment.trim() ? { p_comment: comment.trim().slice(0, 500) } : {}),
  });
  if (!error) return null;
  return error.code === "22023" ? error.message : fr.errors.generic;
}

/** Annulation d'une demande par le client (F-11), avec un motif ; l'artisan est prévenu. */
export async function cancelRequest(
  requestId: string,
  reason: CancelReason,
  comment: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("particulier_cancel_request", {
    p_request_id: requestId,
    p_reason: reason,
    ...(comment.trim() ? { p_comment: comment.trim().slice(0, 500) } : {}),
  });
  if (!error) return null;
  return error.code === "22023" ? error.message : fr.errors.generic;
}
