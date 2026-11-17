import { exampleTenders } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExampleBadge } from "@/components/pro/examples";
import { TenderEditor } from "@/components/pro/tender-editor";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";
import { formatDay } from "@/lib/format";

const t = fr.pro.tenders;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * DPGF d'exemple (ADR 0365) : les postes de l'architecte, des prix repris de la bibliothèque et
 * d'anciens devis, des postes à chiffrer. Les prix se saisissent et les totaux suivent ; rien ne
 * s'enregistre ni ne s'exporte.
 */
export default async function ExampleTenderPage({
  params,
}: PageProps<"/pro/decouvrir/demandes/appels-offres/[id]">) {
  const { id } = await params;
  await requireExampleViewer();
  const { tenders, lines } = exampleTenders();
  const tender = tenders[0];
  if (!tender || tender.id !== id) notFound();
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={`${EXAMPLES_BASE}/demandes/appels-offres` as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {t.back}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-muted-foreground">
              {[
                tender.client_name,
                tender.due_on ? t.dueOn(formatDay(`${tender.due_on}T12:00:00Z`)) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2.25rem]">{tender.name}</h1>
          </div>
          <ExampleBadge />
        </div>
        <TenderEditor
          tenderId={tender.id}
          lines={lines}
          vatRateBp={1000}
          vatOptions={[2000, 1000, 550]}
          sourceKind="xlsx"
          example
        />
      </div>
    </main>
  );
}
