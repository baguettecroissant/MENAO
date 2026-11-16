import "server-only";
import type { ChatAnswer } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Réponse de MENAO enregistrée : métré, fournitures, étapes, ou question de précision. */
export type PlanChatResult = ChatAnswer & { question?: { texte: string; choix: string[] } };

export type PlanChatMessage = {
  id: string;
  role: "artisan" | "menao";
  content: string;
  result: PlanChatResult | null;
  createdAt: string;
};

/** Conversation d'un appel d'offres (lecture : RLS, l'entreprise seule) et questions du mois. */
export async function getPlanChat(supabase: Client, tenderId: string) {
  const [{ data: rows }, { data: quota }] = await Promise.all([
    supabase
      .from("tender_chat_messages")
      .select("id, role, content, result, created_at")
      .eq("tender_id", tenderId)
      .order("created_at")
      .limit(200),
    supabase.rpc("artisan_plan_chat_quota"),
  ]);
  const messages: PlanChatMessage[] = (rows ?? []).map((m) => ({
    id: m.id,
    role: m.role === "menao" ? "menao" : "artisan",
    content: m.content,
    result: m.result && typeof m.result === "object" ? (m.result as PlanChatResult) : null,
    createdAt: m.created_at,
  }));
  const q = (quota ?? {}) as { used?: number; limit?: number };
  return { messages, quota: { used: q.used ?? 0, limit: q.limit ?? 40 } };
}
