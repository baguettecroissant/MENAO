import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { ProMessagesLayout } from "@/components/messages/pro-messages-layout";
import { fr } from "@/i18n/fr";
import { avatarUrl } from "@/lib/chantier/storage";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

const t = fr.messages;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Messages du client (F-40) : une conversation par chantier, la plus récente en premier. */
export default async function ClientMessagesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/mon-espace/messages" as Route);
  const { data } = await supabase.rpc("my_conversations");
  const rows = data ?? [];
  const avatars = new Map(
    rows.flatMap((r) => {
      const url = avatarUrl(supabase, r.other_avatar_path);
      return r.other_avatar_path && url ? [[r.other_avatar_path, url] as const] : [];
    }),
  );
  // Refonte « Nette » (ADR 0256) : mêmes deux colonnes que l'espace pro.
  return (
    <ProMessagesLayout
      base="/mon-espace/messages"
      subtitle={t.subtitleClient}
      rows={rows}
      avatarUrls={avatars}
      now={new Date()}
      empty={
        rows.length === 0 ? (
          <EmptyState illustration="messages">{t.emptyClient}</EmptyState>
        ) : undefined
      }
    />
  );
}
