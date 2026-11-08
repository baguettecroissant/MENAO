import { conversationClosed } from "@menao/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Conversation } from "@/components/messages/conversation";
import { ProConversationPane, ProMessagesLayout } from "@/components/messages/pro-messages-layout";
import { avatarUrl } from "@/lib/chantier/storage";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";
import { loadConversation } from "@/lib/messages/conversation";

const t = fr.messages;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Conversation de l'artisan avec le client d'un chantier (F-40) ; en grand écran, la liste des
 * conversations reste à gauche (ADR 0249).
 */
export default async function ProConversationPage({ params }: PageProps<"/pro/messages/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const [c, messages, { data: conversations }] = await Promise.all([
    getChantierDetail(supabase, id),
    loadConversation(supabase, id),
    supabase.rpc("my_conversations"),
  ]);
  if (!c) notFound();
  const clientName =
    [c.client.first_name, c.client.last_name].filter(Boolean).join(" ") ||
    fr.pro.followUp.yourClientFallback;
  const rows = conversations ?? [];
  const avatars = new Map(
    rows.flatMap((r) => {
      const url = avatarUrl(supabase, r.other_avatar_path);
      return r.other_avatar_path && url ? [[r.other_avatar_path, url] as const] : [];
    }),
  );
  const current = rows.find((r) => r.chantier_id === id);
  return (
    <ProMessagesLayout rows={rows} avatarUrls={avatars} now={new Date()} activeId={id}>
      <ProConversationPane
        chantierHref={`/pro/chantiers/${id}`}
        title={c.chantier.title}
        otherName={clientName}
        avatar={
          current?.other_avatar_path ? (avatars.get(current.other_avatar_path) ?? null) : null
        }
        phone={c.client.phone ?? null}
      >
        <Conversation
          chantierId={id}
          otherName={clientName}
          messages={messages}
          closed={conversationClosed(c.chantier.status)}
        />
      </ProConversationPane>
    </ProMessagesLayout>
  );
}
