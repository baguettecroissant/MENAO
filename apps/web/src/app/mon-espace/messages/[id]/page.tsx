import { conversationClosed } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Conversation } from "@/components/messages/conversation";
import { ProConversationPane, ProMessagesLayout } from "@/components/messages/pro-messages-layout";
import { fr } from "@/i18n/fr";
import { avatarUrl } from "@/lib/chantier/storage";
import { loadConversation } from "@/lib/messages/conversation";
import { createClient } from "@/lib/supabase/server";

const t = fr.messages;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Conversation du client avec l'artisan de son chantier (F-40). */
export default async function ClientConversationPage({
  params,
}: PageProps<"/mon-espace/messages/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/messages/${id}` as Route);
  }
  const [{ data: rows }, messages, { data: conversations }] = await Promise.all([
    supabase.rpc("particulier_chantiers", { p_chantier_id: id }),
    loadConversation(supabase, id),
    supabase.rpc("my_conversations"),
  ]);
  const c = rows?.[0];
  if (!c) notFound();
  const list = conversations ?? [];
  const avatars = new Map(
    list.flatMap((r) => {
      const url = avatarUrl(supabase, r.other_avatar_path);
      return r.other_avatar_path && url ? [[r.other_avatar_path, url] as const] : [];
    }),
  );
  // Refonte « Nette » (ADR 0256) : la liste à gauche et la conversation à droite en grand écran.
  return (
    <ProMessagesLayout
      base="/mon-espace/messages"
      subtitle={t.subtitleClient}
      rows={list}
      avatarUrls={avatars}
      now={new Date()}
      activeId={id}
    >
      <ProConversationPane
        backHref="/mon-espace/messages"
        chantierHref={`/mon-espace/chantiers/${id}`}
        title={c.title}
        otherName={c.artisan_name}
        avatar={avatarUrl(supabase, c.artisan_avatar_path)}
        phone={null}
      >
        <Conversation
          chantierId={id}
          otherName={c.artisan_name}
          messages={messages}
          closed={conversationClosed(c.status)}
        />
      </ProConversationPane>
    </ProMessagesLayout>
  );
}
