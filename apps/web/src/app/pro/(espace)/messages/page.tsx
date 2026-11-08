import type { Metadata } from "next";
import { ProMessagesLayout } from "@/components/messages/pro-messages-layout";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
import { avatarUrl } from "@/lib/chantier/storage";
import { EmptyState } from "@/components/empty-state";

const t = fr.messages;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Messages de l'artisan (F-40) : une conversation par chantier, la plus récente en premier ;
 * en grand écran, la conversation s'ouvre à côté (ADR 0249).
 */
export default async function ProMessagesPage() {
  const { supabase } = await requireProSpace();
  const { data } = await supabase.rpc("my_conversations");
  const rows = data ?? [];
  const avatars = new Map(
    rows.flatMap((r) => {
      const url = avatarUrl(supabase, r.other_avatar_path);
      return r.other_avatar_path && url ? [[r.other_avatar_path, url] as const] : [];
    }),
  );
  return (
    <ProMessagesLayout
      rows={rows}
      avatarUrls={avatars}
      now={new Date()}
      empty={
        rows.length === 0 ? (
          <EmptyState illustration="messages">{t.emptyPro}</EmptyState>
        ) : undefined
      }
    />
  );
}
