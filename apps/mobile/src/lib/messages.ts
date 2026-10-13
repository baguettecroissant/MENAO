import { conversationClosed } from "@menao/core";
import type { Database } from "@menao/db";
import { parseArtisanChantierDetail } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { artisanAvatar } from "./chantiers";
import { formatDayLabel, formatTime } from "./format";
import { supabase } from "./supabase";

type Functions = Database["public"]["Functions"];
type ConversationRow = Functions["my_conversations"]["Returns"][number];

export type ConversationItem = ConversationRow & { avatarUrl: string | null };

/** Liste « Messages » (F-40) : une conversation par chantier, la plus récente en premier. */
export async function loadConversations(): Promise<ConversationItem[] | null> {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) return null;
  return (data ?? []).map((row) => ({ ...row, avatarUrl: artisanAvatar(row.other_avatar_path) }));
}

export type ConversationMessage = {
  id: string;
  mine: boolean;
  kind: Database["public"]["Enums"]["message_kind"];
  body: string | null;
  /** URL signée (1 h) de la pièce jointe : photo ou document PDF. */
  url: string | null;
  hidden: boolean;
  read: boolean;
  /** « Aujourd'hui », « Hier » ou la date, à l'heure de Paris. */
  day: string;
  time: string;
};

export type Conversation = {
  title: string;
  otherName: string;
  avatarUrl: string | null;
  /** Vue du chantier de l'utilisateur : côté client, ou côté artisan. */
  chantierPath: `/chantier/${string}` | `/pro-chantier/${string}`;
  /** Lecture seule : chantier annulé ou devis refusé. */
  closed: boolean;
  messages: ConversationMessage[];
};

/** Interlocuteur et chantier : vus par le client (son artisan), sinon par l'artisan (son client). */
async function conversationParty(chantierId: string, artisan: boolean) {
  if (artisan) {
    const { data } = await supabase.rpc("artisan_chantier_detail", { p_chantier_id: chantierId });
    const c = parseArtisanChantierDetail(data);
    if (!c) return null;
    return {
      title: c.chantier.title,
      otherName: [c.client.first_name, c.client.last_name].filter(Boolean).join(" "),
      avatarUrl: null,
      chantierPath: `/pro-chantier/${chantierId}` as const,
      closed: conversationClosed(c.chantier.status),
    };
  }
  const { data: rows } = await supabase.rpc("particulier_chantiers", {
    p_chantier_id: chantierId,
  });
  const c = rows?.[0];
  if (!c) return null;
  return {
    title: c.title,
    otherName: c.artisan_name,
    avatarUrl: artisanAvatar(c.artisan_avatar_path),
    chantierPath: `/chantier/${chantierId}` as const,
    closed: conversationClosed(c.status),
  };
}

/**
 * Conversation d'un chantier (F-40), comme sur le site, entre le client et son artisan : contenu
 * des messages masqués retiré par la base (chantier_messages), pièces jointes par URL signées.
 */
export async function loadConversation(
  chantierId: string,
  artisan: boolean,
): Promise<Conversation | null> {
  const [party, { data: messages }] = await Promise.all([
    conversationParty(chantierId, artisan),
    supabase.rpc("chantier_messages", { p_chantier_id: chantierId }),
  ]);
  if (!party) return null;
  const list = messages ?? [];
  const paths = [...new Set(list.flatMap((m) => (m.storage_path ? [m.storage_path] : [])))];
  const { data: signed } = paths.length
    ? await supabase.storage.from("message-attachments").createSignedUrls(paths, 3600)
    : { data: [] };
  const urls = new Map(
    (signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
  );
  const now = new Date();
  return {
    ...party,
    messages: list.map((m) => ({
      id: m.message_id,
      mine: m.mine === true,
      kind: m.kind,
      body: m.body,
      url: m.storage_path ? (urls.get(m.storage_path) ?? null) : null,
      hidden: m.hidden,
      read: m.read_at !== null,
      day: formatDayLabel(m.created_at, now),
      time: formatTime(m.created_at),
    })),
  };
}

/** Erreur de la base affichable telle quelle (règle métier, droit refusé), sinon générique. */
const messageError = (error: { code?: string; message: string }) =>
  error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;

/** F-40 : message texte (send_message : droits, longueur, 30 envois par minute au plus). */
export async function sendMessage(chantierId: string, body: string): Promise<string | null> {
  const { error } = await supabase.rpc("send_message", {
    p_chantier_id: chantierId,
    p_body: body,
  });
  return error ? messageError(error) : null;
}

/** Conversation affichée : messages de l'artisan lus, e-mail groupé en attente annulé. */
export async function markConversationRead(chantierId: string): Promise<void> {
  await supabase.rpc("mark_conversation_read", { p_chantier_id: chantierId });
}

/** F-40 : signalement d'un message à l'équipe MENAO (ticket « Message signalé »). */
export async function reportMessage(messageId: string, reason: string): Promise<string | null> {
  const { error } = await supabase.rpc("report_message", {
    p_message_id: messageId,
    p_reason: reason,
  });
  return error ? messageError(error) : null;
}

/**
 * Temps réel (F-40) : nouveaux messages du chantier, seulement tant que la conversation est
 * affichée. Renvoie la fonction de désabonnement.
 */
export function subscribeToConversation(chantierId: string, onMessage: () => void): () => void {
  const channel = supabase
    .channel(`messages:${chantierId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chantier_id=eq.${chantierId}`,
      },
      onMessage,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
