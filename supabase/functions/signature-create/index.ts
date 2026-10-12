// Edge Function signature-create (F-13, F-25) : ouvre la signature du devis, ou du PV de réception,
// chez le prestataire. particulier_start_signature / particulier_start_reception et les fonctions
// de données, appelées au nom du client, décident de l'accès ; le PDF du devis envoyé est transmis
// tel quel, le PV est produit à partir de ses données figées. Aucune donnée personnelle dans les
// journaux. ADR 0022, 0027.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parisLocalToDate } from "../../../packages/core/src/appointment.ts";
import type { QuoteDocument } from "../../../packages/documents/src/quote-data.ts";
import {
  receptionPdfData,
  type ReceptionDocument,
} from "../../../packages/documents/src/reception-data.ts";
import { renderReceptionPdf } from "../../../packages/documents/src/reception-pdf.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { docuseal } from "../_shared/docuseal.ts";
import { env } from "../_shared/env.ts";
import { documentLogo } from "../_shared/logo.ts";
import { sentQuotePdf } from "../_shared/quote-pdf.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Started = {
  request_id: string;
  signing_url: string | null;
  valid_until: string;
  signer: { name: string | null; email: string; phone: string | null };
};

type StartedReception = {
  reception_id: string;
  request_id: string;
  signing_url: string | null;
  numero: string;
  signer: { name: string | null; email: string; phone: string | null };
};

/** Signature ouverte chez le prestataire pendant 30 jours au plus. */
const RECEPTION_SIGNING_DAYS = 30;

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

const siteUrl = () => (env("SITE_URLS").split(",")[0] ?? "").trim().replace(/\/+$/, "");

/** Erreur de la base : règle métier (409, message affichable) ou accès refusé. */
const refused = (error: { code?: string; message: string }) =>
  error.code === "22023"
    ? json({ status: "refused", message: error.message }, 409)
    : json({ status: "forbidden" }, 403);

/** F-25, F-26 : PV de réception, sans ou avec réserves, signé par le client. */
async function receptionSignature(
  supabase: SupabaseClient,
  chantierId: string,
  reserves: string | null,
  consents: unknown,
): Promise<Response> {
  const { data: start, error } = await supabase.rpc("particulier_start_reception", {
    p_chantier_id: chantierId,
    p_reserves: reserves,
    p_consents: consents ?? {},
  });
  if (error) return refused(error);
  const started = start as StartedReception;
  if (started.signing_url) return json({ status: "ok", url: started.signing_url });

  const { data: document } = await supabase.rpc("reception_document", {
    p_reception_id: started.reception_id,
  });
  if (!document) return json({ status: "not_found" }, 404);
  try {
    const doc = document as ReceptionDocument;
    // Accès vérifié par reception_document : logo lu avec la clé serveur.
    const logo = await documentLogo(adminClient(), doc.issuer.logo_path);
    const pdf = new Uint8Array(await renderReceptionPdf(receptionPdfData(doc), { logo }));
    const request = await docuseal.createSigningRequest({
      pdfBase64: base64(pdf),
      filename: `${started.numero}.pdf`,
      signer: {
        name: started.signer.name ?? started.signer.email,
        email: started.signer.email,
        phone: started.signer.phone,
      },
      externalId: started.reception_id,
      completedRedirectUrl: `${siteUrl()}/mon-espace/chantiers/${chantierId}?reception=signee`,
      expireAt: new Date(Date.now() + RECEPTION_SIGNING_DAYS * 86_400_000).toISOString(),
    });
    const { error: updateError } = await adminClient()
      .from("signature_requests")
      .update({
        external_submission_id: request.submissionId,
        external_submitter_id: request.submitterId,
        signing_url: request.signingUrl,
      })
      .eq("id", started.request_id)
      .eq("status", "en_attente");
    if (updateError) throw new Error(updateError.message);
    return json({ status: "ok", url: request.signingUrl });
  } catch (e) {
    console.error(
      "signature-create : PV, demande chez le prestataire en échec",
      e instanceof Error ? e.message : "erreur inconnue",
    );
    return json({ status: "unavailable" }, 502);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ status: "forbidden" }, 401);

  const body = (await req.json().catch(() => null)) as {
    quoteId?: unknown;
    chantierId?: unknown;
    reserves?: unknown;
    consents?: unknown;
  } | null;
  const quoteId = typeof body?.quoteId === "string" ? body.quoteId : "";
  const chantierId = typeof body?.chantierId === "string" ? body.chantierId : "";
  if (!UUID.test(quoteId) && !UUID.test(chantierId)) return json({ status: "invalid" }, 400);

  // Client au nom de l'utilisateur : auth.uid() et ses droits s'appliquent en base.
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (UUID.test(chantierId)) {
    const reserves = typeof body?.reserves === "string" ? body.reserves : null;
    return receptionSignature(supabase, chantierId, reserves, body?.consents);
  }
  const { data: start, error } = await supabase.rpc("particulier_start_signature", {
    p_quote_id: quoteId,
    p_consents: body?.consents ?? {},
  });
  if (error) return refused(error);
  const started = start as Started;
  if (started.signing_url) return json({ status: "ok", url: started.signing_url });

  const { data: document } = await supabase.rpc("quote_document", { p_quote_id: quoteId });
  if (!document) return json({ status: "not_found" }, 404);
  const doc = document as QuoteDocument;
  const admin = adminClient();
  try {
    const pdf = await sentQuotePdf(admin, doc);
    const site = siteUrl();
    const request = await docuseal.createSigningRequest({
      pdfBase64: base64(pdf),
      filename: `${doc.quote.numero ?? "devis"}.pdf`,
      signer: {
        name: started.signer.name ?? started.signer.email,
        email: started.signer.email,
        phone: started.signer.phone,
      },
      externalId: quoteId,
      completedRedirectUrl: `${site}/mon-espace/devis/${quoteId}?signature=terminee`,
      // Plus de signature possible après la fin de validité du devis (heure de Paris).
      expireAt: parisLocalToDate(started.valid_until, "23:59").toISOString(),
    });
    const { error: updateError } = await admin
      .from("signature_requests")
      .update({
        external_submission_id: request.submissionId,
        external_submitter_id: request.submitterId,
        signing_url: request.signingUrl,
      })
      .eq("id", started.request_id)
      .eq("status", "en_attente");
    if (updateError) throw new Error(updateError.message);
    return json({ status: "ok", url: request.signingUrl });
  } catch (e) {
    console.error(
      "signature-create : demande chez le prestataire en échec",
      e instanceof Error ? e.message : "erreur inconnue",
    );
    return json({ status: "unavailable" }, 502);
  }
});
