// Edge Function signature-webhook (F-13) : événements du prestataire de signature, signés en
// HMAC (X-Docuseal-Signature) et traités une seule fois (webhook_events, CLAUDE.md règle 9).
// Signature terminée : devis signé et fichier de preuve téléchargés aussitôt (liens temporaires),
// conservés dans le bucket privé quote-signatures, puis devis et chantier mis à jour. ADR 0022.
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyDocusealSignature } from "../../../packages/core/src/signature.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { docuseal } from "../_shared/docuseal.ts";
import { env } from "../_shared/env.ts";

const HANDLED = new Set(["form.completed", "form.declined"]);

type WebhookEvent = {
  event_type?: string;
  data?: { id?: number | string; completed_at?: string | null };
};

async function keep(admin: SupabaseClient, path: string, url: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`téléchargement : HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const { error } = await admin.storage
    .from("quote-signatures")
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`conservation : ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const payload = await req.text();
  const valid = await verifyDocusealSignature(
    payload,
    req.headers.get("X-Docuseal-Signature"),
    env("DOCUSEAL_WEBHOOK_SECRET"),
    Math.floor(Date.now() / 1000),
  );
  if (!valid) return json({ error: "signature invalide" }, 400);

  let event: WebhookEvent;
  try {
    event = JSON.parse(payload) as WebhookEvent;
  } catch {
    return json({ error: "contenu invalide" }, 400);
  }
  const type = event.event_type ?? "";
  const submitterId = event.data?.id == null ? "" : String(event.data.id);
  if (!HANDLED.has(type) || !submitterId) return json({ received: true, ignored: true });

  const admin = adminClient();
  const eventId = `docuseal:${type}:${submitterId}`;
  const { error: insertError } = await admin
    .from("webhook_events")
    .insert({ id: eventId, source: "docuseal", type });
  if (insertError) {
    if (insertError.code !== "23505") return json({ error: "indisponible" }, 503);
    const { data: seen } = await admin
      .from("webhook_events")
      .select("processed_at")
      .eq("id", eventId)
      .single();
    if (seen?.processed_at) return json({ received: true, duplicate: true });
  }
  const processed = () =>
    admin
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", eventId);

  const { data: request } = await admin
    .from("signature_requests")
    .select("id, quote_id, status, external_submission_id, quotes(artisan_id)")
    .eq("external_submitter_id", submitterId)
    .maybeSingle();
  if (!request) {
    await processed();
    return json({ received: true, unknown: true });
  }

  try {
    if (type === "form.declined") {
      if (request.status === "en_attente") {
        await admin
          .from("signature_requests")
          .update({ status: "abandonnee" })
          .eq("id", request.id);
      }
    } else if (request.status === "en_attente") {
      const signed = await docuseal.getCompletedSignature(request.external_submission_id ?? "");
      if (!signed.documentUrl) throw new Error("document signé absent");
      const artisanId = (request.quotes as unknown as { artisan_id: string } | null)?.artisan_id;
      const folder = `${artisanId}/${request.quote_id}`;
      const signedPath = `${folder}/devis-signe.pdf`;
      await keep(admin, signedPath, signed.documentUrl);
      const proofPath = signed.auditLogUrl ? `${folder}/preuve-signature.pdf` : null;
      if (proofPath && signed.auditLogUrl) await keep(admin, proofPath, signed.auditLogUrl);
      const { data: outcome, error } = await admin.rpc("record_quote_signature", {
        p_request_id: request.id,
        p_signed_at: signed.completedAt ?? event.data?.completed_at ?? new Date().toISOString(),
        p_signed_pdf_path: signedPath,
        p_proof_path: proofPath,
      });
      if (error) throw new Error(error.message);
      if (outcome === "non_signable") {
        console.warn(
          "signature-webhook : devis plus signable, signature non enregistrée",
          request.quote_id,
        );
      }
    }
    await processed();
    return json({ received: true });
  } catch (e) {
    // Le prestataire renvoie l'événement plus tard (nouvelles tentatives pendant 48 h).
    console.error(
      "signature-webhook : traitement en échec",
      e instanceof Error ? e.message : "erreur",
    );
    return json({ error: "traitement en échec" }, 500);
  }
});
