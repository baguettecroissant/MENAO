import { conversationClosed } from "@menao/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Conversation } from "@/components/messages/conversation";
import { ConversationShell } from "@/components/messages/conversation-shell";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";
import { loadConversation } from "@/lib/messages/conversation";

const t = fr.messages;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Conversation de l'artisan avec le client d'un chantier (F-40). */
export default async function ProConversationPage({ params }: PageProps<"/pro/messages/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const [c, messages] = await Promise.all([
    getChantierDetail(supabase, id),
    loadConversation(supabase, id),
  ]);
  if (!c) notFound();
  const clientName =
    [c.client.first_name, c.client.last_name].filter(Boolean).join(" ") ||
    fr.pro.followUp.yourClientFallback;
  return (
    <ConversationShell
      backHref="/pro/messages"
      chantierHref={`/pro/chantiers/${id}`}
      title={c.chantier.title}
      otherName={clientName}
      avatar={null}
    >
      <Conversation
        chantierId={id}
        otherName={clientName}
        messages={messages}
        closed={conversationClosed(c.chantier.status)}
      />
    </ConversationShell>
  );
}
