// Edge Function accountant-export (F-63, ADR 0187) : prépare l'export comptable d'une période
// (factures et dépenses : tableaux CSV et pièces, dans un ZIP), le range dans l'espace privé
// « accountant-exports » et envoie au comptable un lien de téléchargement valable 30 jours.
// - mode « automatique » : appelée chaque heure par la base (pg_cron + pg_net, secret partagé de
//   notify) pour les envois dus ; retire aussi les archives de plus de 60 jours ;
// - sinon : « Envoyer maintenant », par l'artisan connecté, pour la dernière période complète.
// Aucune donnée personnelle journalisée (CLAUDE.md règle 11).
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACCOUNTANT_LINK_DAYS,
  ACCOUNTANT_RETENTION_DAYS,
  accountantPeriodRange,
  type AccountantPeriod,
} from "../../../packages/core/src/accountant.ts";
import { parisToday } from "../../../packages/core/src/project.ts";
import {
  accountantArchive,
  type AccountantExpense,
  type AccountantInvoice,
} from "../../../packages/documents/src/accountant-export.ts";
import type { InvoiceDocument } from "../../../packages/documents/src/invoice-data.ts";
import { isDeliverableAddress } from "../../../packages/emails/src/address.ts";
import { renderAccountantExport } from "../../../packages/emails/src/render.tsx";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { invoicePdfBytes } from "../_shared/invoice-pdf.ts";
import { notificationProvider, type NotificationProvider } from "../_shared/notifications.ts";

const PRO_STATUSES = new Set(["valide", "suspendu", "radie"]);
/** Pièces des dépenses au-delà : tableaux seulement (l'espace accepte 200 Mo par archive). */
const MAX_PIECES_BYTES = 150 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const longDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

type Job = {
  artisanId: string;
  email: string;
  includeInvoices: boolean;
  includeExpenses: boolean;
  start: string;
  end: string;
  label: string;
  key: string;
  kind: "automatique" | "manuel";
};

type Outcome = { status: "envoye" | "echec"; invoices: number | null; expenses: number | null };

/** Comparaison à temps constant du secret partagé. */
function sameSecret(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function loadInvoices(admin: SupabaseClient, job: Job): Promise<AccountantInvoice[]> {
  const { data, error } = await admin
    .from("invoices")
    .select(
      "numero, kind, issued_on, total_ht_cents, total_tva_cents, total_ttc_cents, document, pdf_path",
    )
    .eq("artisan_id", job.artisanId)
    .gte("issued_on", job.start)
    .lte("issued_on", job.end)
    .order("issued_on")
    .order("numero");
  if (error) throw new Error("factures illisibles");
  const invoices: AccountantInvoice[] = [];
  for (const row of data ?? []) {
    let pdf: Uint8Array | null = null;
    try {
      pdf = await invoicePdfBytes(admin, {
        ...(row.document as InvoiceDocument),
        pdf_path: row.pdf_path,
      });
    } catch {
      console.error("accountant-export : PDF d'une facture indisponible");
    }
    invoices.push({
      numero: row.numero,
      issuedOn: row.issued_on,
      kind: row.kind,
      document: row.document,
      totalHtCents: row.total_ht_cents,
      totalTvaCents: row.total_tva_cents,
      totalTtcCents: row.total_ttc_cents,
      pdf,
    });
  }
  return invoices;
}

async function loadExpenses(admin: SupabaseClient, job: Job): Promise<AccountantExpense[]> {
  const { data, error } = await admin
    .from("expenses")
    .select(
      "title, supplier_name, reference, kind, category, issued_on, due_on, paid_on, total_ht_cents, total_tva_cents, total_ttc_cents, document_path, document_mime, chantier:chantiers(title)",
    )
    .eq("artisan_id", job.artisanId)
    .gte("issued_on", job.start)
    .lte("issued_on", job.end)
    .order("issued_on")
    .order("created_at");
  if (error) throw new Error("dépenses illisibles");
  let bytes = 0;
  const expenses: AccountantExpense[] = [];
  for (const row of data ?? []) {
    let piece: AccountantExpense["piece"] = null;
    const extension = row.document_mime ? EXTENSIONS[row.document_mime] : undefined;
    if (row.document_path && extension && bytes < MAX_PIECES_BYTES) {
      const { data: file } = await admin.storage
        .from("expense-documents")
        .download(row.document_path);
      if (file) {
        bytes += file.size;
        piece = { bytes: new Uint8Array(await file.arrayBuffer()), extension };
      }
    }
    const chantier = row.chantier as unknown as { title: string } | null;
    expenses.push({
      issuedOn: row.issued_on,
      supplier: row.supplier_name,
      reference: row.reference,
      title: row.title,
      kind: row.kind,
      category: row.category,
      chantier: chantier?.title ?? null,
      totalHtCents: row.total_ht_cents,
      totalTvaCents: row.total_tva_cents,
      totalTtcCents: row.total_ttc_cents ?? row.total_ht_cents + row.total_tva_cents,
      dueOn: row.due_on,
      paidOn: row.paid_on,
      piece,
    });
  }
  return expenses;
}

/** Prépare, range et envoie l'export d'une période ; l'envoi est inscrit dans l'historique. */
async function runExport(
  admin: SupabaseClient,
  provider: NotificationProvider,
  siteUrl: string,
  job: Job,
): Promise<Outcome> {
  const exportId = crypto.randomUUID();
  let invoices: AccountantInvoice[] | null = null;
  let expenses: AccountantExpense[] | null = null;
  let storagePath: string | null = null;
  let error: string | null = null;
  try {
    const { data: artisan } = await admin
      .from("artisans")
      .select("user_id, raison_sociale, nom_commercial")
      .eq("id", job.artisanId)
      .single();
    const company = artisan?.nom_commercial || artisan?.raison_sociale || "Votre client";
    const { data: owner } = artisan
      ? await admin.auth.admin.getUserById(artisan.user_id)
      : { data: null };

    invoices = job.includeInvoices ? await loadInvoices(admin, job) : null;
    expenses = job.includeExpenses ? await loadExpenses(admin, job) : null;
    const archive = accountantArchive({ company, period: job.label, invoices, expenses });

    storagePath = `${job.artisanId}/${job.key}-${exportId}.zip`;
    const { error: uploadError } = await admin.storage
      .from("accountant-exports")
      .upload(storagePath, archive, { contentType: "application/zip", upsert: false });
    if (uploadError) throw new Error("archive non rangée");
    const { data: signed } = await admin.storage
      .from("accountant-exports")
      .createSignedUrl(storagePath, ACCOUNTANT_LINK_DAYS * 86_400, {
        download: `export-comptable-${job.key}.zip`,
      });
    if (!signed?.signedUrl) throw new Error("lien non créé");

    if (!isDeliverableAddress(job.email)) throw new Error("domaine réservé");
    const email = renderAccountantExport(
      {
        company,
        period: job.label,
        downloadUrl: signed.signedUrl,
        expiresOn: longDate
          .format(new Date(Date.now() + ACCOUNTANT_LINK_DAYS * 86_400_000))
          .replace(/^1 /, "1er "),
        invoices: invoices?.length ?? null,
        expenses: expenses?.length ?? null,
      },
      siteUrl,
    );
    const sent = await provider.sendEmail({
      to: job.email,
      ...email,
      idempotencyKey: exportId,
      ...(owner?.user?.email ? { replyTo: owner.user.email } : {}),
    });
    if (!sent.ok) throw new Error(sent.error);
  } catch (cause) {
    error = (cause instanceof Error ? cause.message : "erreur").slice(0, 200);
    if (storagePath) await admin.storage.from("accountant-exports").remove([storagePath]);
    storagePath = null;
  }
  const status = error ? "echec" : "envoye";
  const { error: insertError } = await admin.from("accountant_exports").insert({
    id: exportId,
    artisan_id: job.artisanId,
    kind: job.kind,
    status,
    period_start: job.start,
    period_end: job.end,
    recipient: job.email,
    invoices_count: invoices?.length ?? null,
    expenses_count: expenses?.length ?? null,
    storage_path: storagePath,
    error,
  });
  if (insertError) console.error("accountant-export : historique non écrit", insertError.code);
  return { status, invoices: invoices?.length ?? null, expenses: expenses?.length ?? null };
}

/** Archives de plus de 60 jours retirées de l'espace (le lien a expiré depuis longtemps). */
async function purgeOldArchives(admin: SupabaseClient) {
  const before = new Date(Date.now() - ACCOUNTANT_RETENTION_DAYS * 86_400_000).toISOString();
  const { data } = await admin
    .from("accountant_exports")
    .select("id, storage_path")
    .not("storage_path", "is", null)
    .lt("created_at", before)
    .limit(100);
  const old = (data ?? []) as { id: string; storage_path: string }[];
  if (old.length === 0) return 0;
  await admin.storage.from("accountant-exports").remove(old.map((row) => row.storage_path));
  await admin
    .from("accountant_exports")
    .update({ storage_path: null })
    .in(
      "id",
      old.map((row) => row.id),
    );
  return old.length;
}

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const admin = adminClient();
    const body = (await req.json().catch(() => null)) as { mode?: unknown } | null;
    const provider = notificationProvider();
    const siteUrl = (env("SITE_URLS").split(",")[0] ?? "").trim();

    if (body?.mode === "automatique") {
      const secret = env("NOTIFY_SECRET");
      if (!secret || !sameSecret(req.headers.get("x-menao-secret") ?? "", secret)) {
        return json({ error: "non autorisé" }, 401);
      }
      const purged = await purgeOldArchives(admin);
      if (!provider) return json({ status: "unavailable", purged }, 503);
      const { data, error } = await admin.rpc("accountant_exports_due", { p_limit: 10 });
      if (error) return json({ status: "unavailable", purged }, 503);
      let sent = 0;
      let failed = 0;
      for (const due of (data ?? []) as {
        artisan_id: string;
        email: string;
        period: AccountantPeriod;
        include_invoices: boolean;
        include_expenses: boolean;
        period_start: string;
        period_end: string;
      }[]) {
        const range = accountantPeriodRange(due.period, parisToday());
        const outcome = await runExport(admin, provider, siteUrl, {
          artisanId: due.artisan_id,
          email: due.email,
          includeInvoices: due.include_invoices,
          includeExpenses: due.include_expenses,
          start: due.period_start,
          end: due.period_end,
          label: range.label,
          key: range.key,
          kind: "automatique",
        });
        if (outcome.status === "envoye") sent++;
        else failed++;
      }
      // Comptes seulement : ni adresse, ni montant.
      console.log(JSON.stringify({ sent, failed, purged }));
      return json({ sent, failed, purged });
    }

    // « Envoyer maintenant » : l'artisan connecté, avec ses réglages enregistrés.
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData?.user;
    if (!user) return json({ status: "forbidden" }, 401);
    const { data: artisan } = await admin
      .from("artisans")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!artisan || !PRO_STATUSES.has(artisan.status as string)) {
      return json({ status: "forbidden" }, 403);
    }
    const { data: settings } = await admin
      .from("accountant_settings")
      .select("email, period, include_invoices, include_expenses")
      .eq("artisan_id", artisan.id)
      .maybeSingle();
    if (!settings) return json({ status: "no_settings" }, 400);
    if (!provider) return json({ status: "unavailable" }, 503);
    // Cinq envois à la main par heure au plus.
    const { data: allowed } = await admin.rpc("consume_rate_limit", {
      p_key: `accountant-export:${user.id}`,
      p_max: 5,
      p_window_seconds: 3600,
    });
    if (allowed !== true) return json({ status: "rate_limited" }, 429);
    const range = accountantPeriodRange(settings.period as AccountantPeriod, parisToday());
    const outcome = await runExport(admin, provider, siteUrl, {
      artisanId: artisan.id,
      email: settings.email,
      includeInvoices: settings.include_invoices,
      includeExpenses: settings.include_expenses,
      start: range.start,
      end: range.end,
      label: range.label,
      key: range.key,
      kind: "manuel",
    });
    return json({ ...outcome, period: range.label }, outcome.status === "envoye" ? 200 : 502);
  }),
);
