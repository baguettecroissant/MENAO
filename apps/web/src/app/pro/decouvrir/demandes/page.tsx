import { exampleInbox } from "@menao/core";
import type { Metadata } from "next";
import { RequestsView } from "@/components/pro/requests-view";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.pro.onboarding.requests;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Demandes d'exemple (ADR 0184), affichées comme les vraies. */
export default async function ExampleRequestsPage() {
  await requireExampleViewer();
  const now = new Date();
  return (
    <RequestsView
      rows={exampleInbox(now).map((r) => ({ ...r, thumbUrl: null }))}
      now={now}
      responseMinutes={null}
      base={EXAMPLES_BASE}
      example
    />
  );
}
