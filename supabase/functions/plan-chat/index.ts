// Edge Function plan-chat (F-160, ADR 0346) : « Demander à MENAO », le chat sur les plans d'un
// appel d'offres déjà lu. L'artisan pose une question ; le modèle part du relevé (pièces, ouvrages
// écrits, éléments comptés, symboles), appelle les calculs de packages/core, cherche les prix dans
// sa bibliothèque, puis répond ou demande une précision. Formule Entreprise et nombre de questions
// par mois vérifiés par la base (jeton de l'utilisateur). Journal : métriques seules (ai_runs).
import type Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { llmConfig, logAiRuns, planChatModel } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { askPlanChat, libraryOf, type ChatUsage } from "./chat.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Plafonds de dépense : par entreprise et par heure, et tous comptes confondus. */
const MAX_PER_HOUR_USER = 30;
const MAX_PER_HOUR = 300;
/** Messages de la conversation repris pour le contexte. */
const HISTORY = 8;

const metres = (mm: number | null) => (mm === null ? null : Math.round(mm / 10) / 100);
const squareMetres = (cm2: number | null) => (cm2 === null ? null : Math.round(cm2 / 100) / 100);

/** Relevé de l'appel d'offres pour le modèle (sans nom de client ni de projet). */
async function survey(asUser: SupabaseClient, tenderId: string) {
  const [{ data: tender }, { data: rooms }, { data: works }] = await Promise.all([
    asUser
      .from("tenders")
      .select("source_kind, plan_trades, plan_counts, plan_symbols, plan_page_labels, plan_files")
      .eq("id", tenderId)
      .maybeSingle(),
    asUser
      .from("tender_rooms")
      .select("name, level, area_cm2, perimeter_mm, height_mm, source, uncertain, file_index, page")
      .eq("tender_id", tenderId)
      .order("position"),
    asUser
      .from("tender_works")
      .select("name, kind, quantity_milli, source, trade_code, room, removal, file_index, page")
      .eq("tender_id", tenderId)
      .order("position"),
  ]);
  if (!tender || tender.source_kind !== "plan") return null;
  const symbols: Record<string, { total: number; douteux: number }> = {};
  for (const s of Array.isArray(tender.plan_symbols)
    ? (tender.plan_symbols as { type?: string; doubt?: boolean }[])
    : []) {
    if (!s?.type) continue;
    const entry = (symbols[s.type] ??= { total: 0, douteux: 0 });
    entry.total += 1;
    if (s.doubt) entry.douteux += 1;
  }
  const files = Array.isArray(tender.plan_files) ? (tender.plan_files as { name?: string }[]) : [];
  return {
    plans: files.map((f, i) => ({ fichier: i + 1, nom: f?.name ?? `Plan ${i + 1}` })),
    types_de_plans: tender.plan_page_labels,
    lots: tender.plan_trades,
    pieces: (rooms ?? []).map((r) => ({
      nom: r.name,
      niveau: r.level,
      surface_m2: squareMetres(r.area_cm2),
      perimetre_m: metres(r.perimeter_mm),
      hauteur_m: metres(r.height_mm),
      origine: r.uncertain ? "estime" : r.source,
      plan: r.file_index ? { fichier: r.file_index, page: r.page ?? 1 } : null,
    })),
    ouvrages_ecrits: (works ?? []).map((w) => ({
      nom: w.name,
      unite: w.kind,
      quantite: w.quantity_milli === null ? null : w.quantity_milli / 1000,
      origine: w.source,
      lot: w.removal ? "demolition" : w.trade_code,
      piece: w.room,
      plan: w.file_index ? { fichier: w.file_index, page: w.page ?? 1 } : null,
    })),
    elements_comptes: tender.plan_counts,
    symboles: symbols,
  };
}

/** Dernières questions et réponses, pour suivre la conversation. */
async function history(
  asUser: SupabaseClient,
  tenderId: string,
): Promise<Anthropic.MessageParam[]> {
  const { data } = await asUser
    .from("tender_chat_messages")
    .select("role, content, result")
    .eq("tender_id", tenderId)
    .order("created_at", { ascending: false })
    .limit(HISTORY);
  const rows = (data ?? []).reverse();
  // La conversation commence par une question de l'artisan.
  while (rows[0] && rows[0].role !== "artisan") rows.shift();
  return rows.map((m) => {
    const question = (m.result as { question?: { choix?: string[] } } | null)?.question;
    const choices = question?.choix?.length
      ? `\n(Choix proposés : ${question.choix.join(" ; ")})`
      : "";
    return { role: m.role === "artisan" ? "user" : "assistant", content: `${m.content}${choices}` };
  });
}

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const admin = adminClient();
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData?.user;
    if (!user || user.is_anonymous) return json({ status: "forbidden" }, 401);

    const body = (await req.json().catch(() => null)) as {
      tenderId?: unknown;
      question?: unknown;
    } | null;
    const tenderId = typeof body?.tenderId === "string" ? body.tenderId : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!UUID.test(tenderId) || question.length < 2 || question.length > 2000) {
      return json({ status: "invalid" }, 400);
    }

    // Appels à la base avec le jeton de l'utilisateur : formule, entreprise et quota vérifiés.
    const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: quota, error: quotaError } = await asUser.rpc("artisan_plan_chat_quota");
    if (quotaError)
      return json({ status: quotaError.code === "42501" ? "forbidden" : "error" }, 403);
    const { used, limit } = quota as { used: number; limit: number };
    if (used >= limit) return json({ status: "quota", used, limit });

    const limits = await Promise.all(
      [
        [`plan-chat:user:${user.id}`, MAX_PER_HOUR_USER],
        ["plan-chat:all", MAX_PER_HOUR],
      ].map(([key, max]) =>
        admin.rpc("consume_rate_limit", { p_key: key, p_max: max, p_window_seconds: 3600 }),
      ),
    );
    if (!limits.every(({ data }) => data === true)) return json({ status: "busy" }, 429);

    const releve = await survey(asUser, tenderId);
    if (!releve) return json({ status: "invalid" }, 404);
    const llm = llmConfig();
    if (!llm) return json({ status: "unavailable" }, 503);

    const model = planChatModel();
    const usage: ChatUsage = { inputTokens: 0, outputTokens: 0 };
    const started = Date.now();
    let outcome: Awaited<ReturnType<typeof askPlanChat>>;
    try {
      outcome = await askPlanChat({
        client: llm.client,
        model,
        survey: releve,
        history: await history(asUser, tenderId),
        question,
        library: libraryOf(asUser),
        usage,
      });
    } catch (error) {
      console.error(
        "plan-chat : appel du modèle impossible",
        error instanceof Error ? error.name : "?",
      );
      outcome = { kind: "failed", reason: "invalid" };
    }
    await logAiRuns(admin, [
      {
        function_name: "plan-chat",
        model,
        outcome: outcome.kind === "failed" ? "erreur" : "ok",
        latency_ms: Date.now() - started,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
      },
    ]);
    if (outcome.kind === "failed")
      return json({ status: outcome.reason === "timeout" ? "timeout" : "error" }, 502);

    const answer = outcome.kind === "answer" ? outcome.answer : outcome.question;
    const result =
      outcome.kind === "question"
        ? { ...outcome.result, question: { texte: outcome.question, choix: outcome.choices } }
        : outcome.result;
    const { data: messageId, error: saveError } = await asUser.rpc("artisan_save_plan_chat", {
      p_tender_id: tenderId,
      p_question: question,
      p_answer: answer,
      p_result: result,
    });
    if (saveError) {
      return json(
        { status: saveError.code === "53400" ? "quota" : "error" },
        saveError.code === "53400" ? 200 : 500,
      );
    }
    return json({
      status: "ok",
      messageId,
      kind: outcome.kind,
      answer,
      result,
      used: used + 1,
      limit,
    });
  }),
);
