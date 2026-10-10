import "server-only";
import type { ConversationMessage } from "@/components/messages/conversation";
import { fr } from "@/i18n/fr";
import { signedUrlMap } from "@/lib/chantier/storage";
import { formatDayFull, formatTime } from "@/lib/format";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
const parisDay = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

/** « Aujourd'hui », « Hier » ou la date complète, à l'heure de Paris. */
function dayLabel(iso: string, now: Date): string {
  const day = parisDay.format(new Date(iso));
  if (day === parisDay.format(now)) return fr.messages.today;
  if (day === parisDay.format(new Date(now.getTime() - 86_400_000))) return fr.messages.yesterday;
  return formatDayFull(iso);
}

/**
 * Messages d'une conversation (F-40) pour l'affichage : contenu des messages masqués retiré par
 * la base (chantier_messages), pièces jointes servies par URL signées (1 h).
 */
export async function loadConversation(
  supabase: Client,
  chantierId: string,
): Promise<ConversationMessage[]> {
  const { data } = await supabase.rpc("chantier_messages", { p_chantier_id: chantierId });
  const rows = data ?? [];
  const urls = await signedUrlMap(
    supabase,
    "message-attachments",
    rows.map((r) => r.storage_path),
  );
  const now = new Date();
  return rows.map((r) => ({
    id: r.message_id,
    mine: r.mine === true,
    kind: r.kind,
    body: r.body,
    url: r.storage_path ? (urls.get(r.storage_path) ?? null) : null,
    hidden: r.hidden,
    read: r.read_at !== null,
    day: dayLabel(r.created_at, now),
    time: formatTime(r.created_at),
  }));
}
