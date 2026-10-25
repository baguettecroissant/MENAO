import { EXAMPLE_IDS, exampleChantier, exampleQuoteDraftLines } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ExampleLock } from "@/components/pro/examples";
import { QuoteEditor } from "@/components/pro/quote-editor";
import { QuoteHeader } from "@/components/pro/quote-header";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.pro.quote;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Devis d'exemple en préparation (ADR 0184) : l'éditeur de devis rempli après la visite du
 * chantier « Remplacement d'un chauffe-eau », en lecture seule.
 */
export default async function ExampleQuotePage({
  params,
}: PageProps<"/pro/decouvrir/chantiers/[id]/devis">) {
  const { id } = await params;
  await requireExampleViewer();
  const c = exampleChantier(id);
  if (!c) notFound();
  if (id !== EXAMPLE_IDS.chantierChauffeEau) redirect(`${EXAMPLES_BASE}/chantiers/${id}` as Route);
  return (
    <main className="flex flex-1 flex-col">
      <QuoteHeader
        backHref={`${EXAMPLES_BASE}/chantiers/${id}`}
        backLabel={t.back}
        title={t.title}
        chantierTitle={c.chantier.title}
        appointmentAt={c.appointment?.starts_at ?? null}
      />
      <div className="py-3">
        <ExampleLock locked note>
          <QuoteEditor
            chantierId={id}
            initialLines={exampleQuoteDraftLines()}
            saved
            assujettiTva
            savedDictation={null}
          />
        </ExampleLock>
      </div>
    </main>
  );
}
