import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";
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
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitleClient}</p>
        </div>
        {rows.length ? (
          <ConversationList
            rows={rows}
            basePath="/mon-espace/messages"
            avatarUrls={avatars}
            now={new Date()}
          />
        ) : (
          <EmptyState illustration="messages">{t.emptyClient}</EmptyState>
        )}
      </div>
    </main>
  );
}
