import type { ClientDraft } from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/**
 * Aide du particulier dans l'application (F-170, ADR 0361) : message à l'équipe MENAO, suivi des
 * échanges et assistant, sans passer par le site. Mêmes fonctions de la base et mêmes Edge
 * Functions que le site (send_contact_message, tickets, client-assistant).
 */

const t = fr.clientHelp;

/** Message à l'équipe MENAO. Renvoie le message d'erreur à afficher, ou null. */
export async function sendContactMessage(input: {
  email: string;
  subject: string;
  message: string;
}): Promise<string | null> {
  const { error } = await supabase.rpc("send_contact_message", {
    p_email: input.email,
    p_subject: input.subject,
    p_message: input.message,
  });
  // 22023 : refus expliqué par la base (adresse invalide, trop de messages).
  return error ? (error.code === "22023" ? error.message : fr.errors.generic) : null;
}

export type Exchange = {
  id: string;
  subject: string | null;
  message: string;
  status: "ouvert" | "en_cours" | "resolu";
  createdAt: string;
  /** Réponses de l'équipe MENAO. */
  replies: number;
};

/** « Mes échanges avec MENAO » : les messages écrits à l'équipe, du plus récent au plus ancien. */
export async function loadExchanges(): Promise<Exchange[] | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("tickets")
    .select("id, status, subject, message, created_at, ticket_messages(from_staff)")
    .eq("user_id", auth.user.id)
    .eq("type", "contact")
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    message: row.message ?? "",
    status: row.status,
    createdAt: row.created_at,
    replies: row.ticket_messages.filter((m) => m.from_staff).length,
  }));
}

export type ExchangeDetail = Omit<Exchange, "replies"> & {
  entries: { id: string; fromStaff: boolean; body: string; createdAt: string }[];
};

/** Un échange et ses messages ; ceux d'autrui restent illisibles (RLS). */
export async function loadExchange(id: string): Promise<ExchangeDetail | null> {
  const [{ data: ticket }, { data: rows }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, type, status, subject, message, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, from_staff, body, created_at")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);
  if (!ticket || ticket.type !== "contact") return null;
  return {
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message ?? "",
    status: ticket.status,
    createdAt: ticket.created_at,
    entries: (rows ?? []).map((r) => ({
      id: r.id,
      fromStaff: r.from_staff,
      body: r.body ?? "",
      createdAt: r.created_at,
    })),
  };
}

export type AssistantTurn = { role: "user" | "assistant"; text: string };
export type AssistantReply =
  | {
      status: "ok";
      answer: string;
      suggestions: string[];
      suggestHuman: boolean;
      draft: ClientDraft | null;
    }
  | { status: "limit" | "unavailable" };

/** Question à l'assistant des particuliers (F-71), avec les échanges précédents de l'écran. */
export async function askClientAssistant(
  question: string,
  history: AssistantTurn[],
): Promise<AssistantReply> {
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    answer?: string;
    suggestHuman?: boolean;
    suggestions?: string[];
    draft?: ClientDraft | null;
  }>("client-assistant", { method: "POST", body: { question, history } });
  if (!error && data?.status === "ok" && data.answer) {
    return {
      status: "ok",
      answer: data.answer,
      suggestions: data.suggestions ?? [],
      suggestHuman: data.suggestHuman ?? false,
      draft: data.draft ?? null,
    };
  }
  const limited = error instanceof FunctionsHttpError && error.context.status === 429;
  return { status: limited ? "limit" : "unavailable" };
}

export const exchangeStatusLabel = (status: Exchange["status"]) => t.exchanges.statuses[status];
