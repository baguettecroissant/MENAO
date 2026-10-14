import type { Metadata } from "next";
import { ConversationList } from "@/components/messages/conversation-list";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
import { avatarUrl } from "@/lib/chantier/storage";
import { EmptyState } from "@/components/empty-state";

const t = fr.messages;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Messages de l'artisan (F-40) : une conversation par chantier, la plus récente en premier. */
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
    <main className="flex-1 bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitlePro}</p>
        </div>
        {rows.length ? (
          <ConversationList
            rows={rows}
            basePath="/pro/messages"
            avatarUrls={avatars}
            now={new Date()}
          />
        ) : (
          <EmptyState illustration="messages">{t.emptyPro}</EmptyState>
        )}
      </div>
    </main>
  );
}
