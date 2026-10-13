import {
  LEGAL_DOCUMENT_VERSIONS,
  parisToday,
  paymentProgress,
  type SignatureConsent,
} from "@menao/core";
import { receptionPreviewData, type QuoteDocument, type ReceptionPdfData } from "@menao/documents";
import type { Database } from "@menao/db";
import { fr } from "@/i18n/fr";
import { env } from "./env";
import { functionError, sqlError, type Opened } from "./functions";
import { supabase } from "./supabase";

/** Logo de l'entreprise en tête des documents (ADR 0038) : le bucket décide de l'accès. */
async function logoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("artisan-logos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

type PaymentStatus = Database["public"]["Tables"]["payments"]["Row"]["status"];

/** Échéancier toujours recalculé à partir des paiements (CLAUDE.md règle 5). */
const toProgress = (
  total: number,
  payments: { status: PaymentStatus; amount_cents: number }[] | null,
) =>
  paymentProgress(
    total,
    (payments ?? []).map((p) => ({ status: p.status, amountCents: p.amount_cents })),
  );

export type ReceptionStart =
  | { ready: false }
  | {
      ready: true;
      title: string;
      artisanName: string;
      /** PV sans numéro (attribué à la signature) ni réserves. */
      preview: ReceptionPdfData;
      balanceCents: number;
      logoUrl: string | null;
    };

/**
 * Réception des travaux (F-25), comme sur le site : aperçu du PV à partir du devis signé. `ready`
 * est faux si le chantier n'en est pas à la réception ; null s'il est introuvable.
 */
export async function loadReception(chantierId: string): Promise<ReceptionStart | null> {
  const { data: rows } = await supabase.rpc("particulier_chantiers", {
    p_chantier_id: chantierId,
  });
  const c = rows?.[0];
  if (!c) return null;
  if (c.status !== "travaux_termines" || !c.quote_id) return { ready: false };
  const [{ data: document }, { data: payments }] = await Promise.all([
    supabase.rpc("quote_document", { p_quote_id: c.quote_id }),
    supabase.from("payments").select("status, amount_cents").eq("quote_id", c.quote_id),
  ]);
  if (!document) return null;
  const quote = document as unknown as QuoteDocument;
  const progress = toProgress(quote.quote.total_ttc_cents, payments);
  return {
    ready: true,
    title: c.title,
    artisanName: c.artisan_name,
    preview: receptionPreviewData(quote, {
      today: parisToday(),
      finishedOn: c.finished_at ? parisToday(new Date(c.finished_at)) : null,
      signedOn: quote.quote.signed_at ? parisToday(new Date(quote.quote.signed_at)) : null,
      paidCents: progress.paidCents,
    }),
    balanceCents: progress.remainingCents,
    logoUrl: await logoUrl(quote.issuer.logo_path),
  };
}

/**
 * F-25, F-26 « Signer le PV de réception » : cases cochées et, s'il y en a, réserves ; la signature
 * s'ouvre chez le prestataire, avec retour dans l'application (ADR 0060).
 */
export async function startReceptionSignature(
  chantierId: string,
  reserves: string | null,
  consents: Record<SignatureConsent, true>,
): Promise<Opened> {
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "signature-create",
    {
      body: {
        chantierId,
        reserves,
        consents: {
          ...consents,
          versions: {
            cgu: LEGAL_DOCUMENT_VERSIONS.cgu,
            confidentialite: LEGAL_DOCUMENT_VERSIONS.confidentialite,
          },
        },
        app: true,
      },
    },
  );
  if (error || !data?.url) return { error: await functionError(error, fr.reception.unavailable) };
  return { url: data.url };
}

/** F-26 « Confirmer la levée des réserves » : chantier réceptionné, le solde est demandé ensuite. */
export async function confirmReservesLifted(chantierId: string): Promise<string | null> {
  const { error } = await supabase.rpc("particulier_confirm_reserves_lifted", {
    p_chantier_id: chantierId,
  });
  return error ? sqlError(error) : null;
}

export type BalanceStart =
  | { ready: false }
  | {
      ready: true;
      totalCents: number;
      paidCents: number;
      remainingCents: number;
      /** Bénéficiaire : l'entreprise de l'artisan. */
      company: string;
      /** Paiement différé (virement) en attente de confirmation. */
      inProgress: boolean;
    };

/**
 * Paiement du solde (F-32), comme sur le site : chantier réceptionné, solde = total TTC − acomptes
 * payés, toujours calculé (CLAUDE.md règle 5).
 */
export async function loadBalance(chantierId: string): Promise<BalanceStart | null> {
  const { data: rows } = await supabase.rpc("particulier_chantiers", {
    p_chantier_id: chantierId,
  });
  const c = rows?.[0];
  if (!c) return null;
  if (c.status !== "receptionne" || !c.quote_id || c.balance_status === "paye") {
    return { ready: false };
  }
  const [{ data: quote }, { data: payments }, { data: document }] = await Promise.all([
    supabase.from("quotes").select("total_ttc_cents").eq("id", c.quote_id).single(),
    supabase.from("payments").select("status, amount_cents").eq("quote_id", c.quote_id),
    supabase.rpc("quote_document", { p_quote_id: c.quote_id }),
  ]);
  const total = quote?.total_ttc_cents ?? 0;
  const progress = toProgress(total, payments);
  const issuer = (document as unknown as QuoteDocument | null)?.issuer;
  return {
    ready: true,
    totalCents: total,
    paidCents: progress.paidCents,
    remainingCents: progress.remainingCents,
    company: issuer?.raison_sociale ?? c.artisan_name,
    inProgress: c.balance_status === "en_cours",
  };
}

/**
 * F-32 « Payer le solde » : Stripe Checkout ouvert directement sur le compte de l'artisan (aucune
 * commission MENAO), avec retour dans l'application (ADR 0060).
 */
export async function startBalancePayment(chantierId: string): Promise<Opened> {
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "deposit-checkout",
    { body: { chantierId, origin: env.siteUrl, app: true } },
  );
  if (error || !data?.url) return { error: await functionError(error, fr.balance.unavailable) };
  return { url: data.url };
}
