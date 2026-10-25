import { exampleChantier, exampleFollowUp, exampleSentQuote, parisToday } from "@menao/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChantierAppointmentView } from "@/components/pro/chantier-appointment";
import { ArtisanFollowUpView } from "@/components/pro/chantier-follow-up";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, examplePhotoUrl, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.appointment.title} — MENAO` };

/**
 * Chantier d'exemple (ADR 0184) : vue du rendez-vous et du devis envoyé, ou suivi des travaux en
 * cours (journal, échéancier, dossier), actions inactives.
 */
export default async function ExampleChantierPage({
  params,
  searchParams,
}: PageProps<"/pro/decouvrir/chantiers/[id]">) {
  const { id } = await params;
  await requireExampleViewer();
  const now = new Date();
  const c = exampleChantier(id, now);
  if (!c) notFound();

  if (c.chantier.status === "en_cours") {
    const { onglet } = await searchParams;
    const f = exampleFollowUp(now);
    return (
      <ArtisanFollowUpView
        c={c}
        data={{
          quote: f.quote,
          payments: f.payments,
          invoices: f.invoices,
          updates: f.updates,
          finishedAt: null,
          reception: null,
          receivedAt: null,
          review: null,
          openTicketId: null,
          conversation: f.conversation,
          clientRating: null,
          ratingsVisible: false,
          journalPhotoUrls: new Map(
            f.updates.flatMap((u) => {
              const url = u.storage_path ? examplePhotoUrl(u.storage_path) : null;
              return u.storage_path && url ? [[u.storage_path, url] as const] : [];
            }),
          ),
          projectPhotoUrls: new Map(),
        }}
        tab={onglet === "dossier" ? "dossier" : "suivi"}
        startConfirmed={false}
        today={parisToday(now)}
        now={now}
        base={EXAMPLES_BASE}
        example
      />
    );
  }

  return (
    <ChantierAppointmentView
      c={c}
      photoUrls={[]}
      trades={[]}
      hasDraft={false}
      sentQuote={c.chantier.status === "devis_envoye" ? exampleSentQuote(now) : null}
      deposit={null}
      invoice={null}
      minDate={parisToday(now)}
      base={EXAMPLES_BASE}
      example
    />
  );
}
