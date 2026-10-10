import { conversationClosed } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Conversation } from "@/components/messages/conversation";
import { ConversationShell } from "@/components/messages/conversation-shell";
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
  const [{ data: rows }, messages] = await Promise.all([
    supabase.rpc("particulier_chantiers", { p_chantier_id: id }),
    loadConversation(supabase, id),
  ]);
  const c = rows?.[0];
  if (!c) notFound();
  return (
    <ConversationShell
      backHref="/mon-espace/messages"
      chantierHref={`/mon-espace/chantiers/${id}`}
      title={c.title}
      otherName={c.artisan_name}
      avatar={avatarUrl(supabase, c.artisan_avatar_path)}
    >
      <Conversation
        chantierId={id}
        otherName={c.artisan_name}
        messages={messages}
        closed={conversationClosed(c.status)}
      />
    </ConversationShell>
  );
}
