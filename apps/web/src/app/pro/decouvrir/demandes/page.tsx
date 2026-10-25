import { exampleInbox } from "@menao/core";
import type { Metadata } from "next";
import { InboxList } from "@/components/pro/inbox-list";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.pro.onboarding.requests;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Demandes d'exemple (ADR 0184), affichées comme les vraies. */
export default async function ExampleRequestsPage() {
  await requireExampleViewer();
  const now = new Date();
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <InboxList
          rows={exampleInbox(now).map((r) => ({ ...r, thumbUrl: null }))}
          now={now}
          base={EXAMPLES_BASE}
          example
        />
      </div>
    </main>
  );
}
