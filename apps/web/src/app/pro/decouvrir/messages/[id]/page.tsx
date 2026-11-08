import { exampleChantier, exampleConversations, exampleMessages } from "@menao/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Conversation } from "@/components/messages/conversation";
import { ProConversationPane, ProMessagesLayout } from "@/components/messages/pro-messages-layout";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";
import { formatTime } from "@/lib/format";
import { dayLabel } from "@/lib/messages/conversation";

export const metadata: Metadata = { title: `${fr.messages.title} — MENAO` };

/** Conversation d'exemple (ADR 0184) : messages fictifs, saisie inactive. */
export default async function ExampleConversationPage({
  params,
}: PageProps<"/pro/decouvrir/messages/[id]">) {
  const { id } = await params;
  await requireExampleViewer();
  const now = new Date();
  const c = exampleChantier(id, now);
  if (!c) notFound();
  const clientName = [c.client.first_name, c.client.last_name].filter(Boolean).join(" ");
  return (
    <ProMessagesLayout
      rows={exampleConversations()}
      avatarUrls={new Map()}
      now={now}
      activeId={id}
      base="/pro/decouvrir/messages"
    >
      <ProConversationPane
        backHref={`${EXAMPLES_BASE}/messages`}
        chantierHref={`${EXAMPLES_BASE}/chantiers/${id}`}
        title={c.chantier.title}
        otherName={clientName}
        avatar={null}
        phone={null}
      >
        <Conversation
          chantierId={id}
          otherName={clientName}
          messages={exampleMessages(id, now).map((m) => ({
            id: m.id,
            mine: m.mine,
            kind: "texte",
            body: m.body,
            url: null,
            hidden: false,
            read: m.read,
            day: dayLabel(m.created_at, now),
            time: formatTime(m.created_at),
          }))}
          closed={false}
          example
        />
      </ProConversationPane>
    </ProMessagesLayout>
  );
}
