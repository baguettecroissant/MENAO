import { exampleConversations } from "@menao/core";
import type { Metadata } from "next";
import { ProMessagesLayout } from "@/components/messages/pro-messages-layout";
import { fr } from "@/i18n/fr";
import { requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.messages;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Messages d'exemple (ADR 0184) : une conversation par chantier d'exemple. */
export default async function ExampleMessagesPage() {
  await requireExampleViewer();
  return (
    <ProMessagesLayout
      rows={exampleConversations()}
      avatarUrls={new Map()}
      now={new Date()}
      base="/pro/decouvrir/messages"
    />
  );
}
