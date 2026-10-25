import { exampleRequest, parisToday, timeLeft } from "@menao/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestOpportunityView } from "@/components/pro/request-opportunity";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.onboarding.requests.title} — MENAO` };

/** Demande d'exemple (ADR 0184) : la vue d'une opportunité, actions inactives. */
export default async function ExampleRequestPage({
  params,
}: PageProps<"/pro/decouvrir/demandes/[id]">) {
  const { id } = await params;
  await requireExampleViewer();
  const now = new Date();
  const r = exampleRequest(id, now);
  if (!r) notFound();
  return (
    <RequestOpportunityView
      r={r}
      photoUrls={[]}
      left={timeLeft(new Date(r.expires_at), now)}
      open
      minDate={parisToday(now)}
      trades={[]}
      clientReputation={null}
      partners={[]}
      base={EXAMPLES_BASE}
      example
    />
  );
}
