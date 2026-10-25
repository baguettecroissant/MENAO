import { exampleConversations } from "@menao/core";
import type { Metadata } from "next";
import { ConversationList } from "@/components/messages/conversation-list";
import { fr } from "@/i18n/fr";
import { requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.messages;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Messages d'exemple (ADR 0184) : une conversation par chantier d'exemple. */
export default async function ExampleMessagesPage() {
  await requireExampleViewer();
  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitlePro}</p>
        </div>
        <ConversationList
          rows={exampleConversations()}
          basePath="/pro/decouvrir/messages"
          avatarUrls={new Map()}
          now={new Date()}
        />
      </div>
    </main>
  );
}
