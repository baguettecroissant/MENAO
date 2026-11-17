import { formatCoefficient } from "@menao/core";
import type { Metadata } from "next";
import { LibraryView } from "@/components/pro/library-view";
import { MenaoLibraryStart } from "@/components/pro/menao-library-start";
import { fr } from "@/i18n/fr";
import { loadLibrary, loadMenaoTrades, tradeLabels } from "@/lib/artisan/library";
import { loadInvoicePrices } from "@/lib/artisan/library-invoices";
import { loadUndoableRaise } from "@/lib/artisan/library-raise";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.library;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Bibliothèque d'ouvrages et marge (F-141, ADR 0293), onglet d'Argent : ouvrages (prix, coût,
 * marge en euros et en taux de marque), fournitures, réglages de chiffrage. Remplie avec les
 * anciens devis à la première ouverture. Patron et chef d'équipe seulement.
 */
export default async function LibraryPage({ searchParams }: PageProps<"/pro/bibliotheque">) {
  const { vue, q, metier, menao, metiers, importe, maj, factures, ajouts, annule } =
    await searchParams;
  const view = vue === "fournitures" ? "fournitures" : "ouvrages";
  const query = typeof q === "string" ? q.slice(0, 100) : "";
  const { supabase, artisanId } = await requireTeamPermission("money");
  const library = await loadLibrary(supabase);

  // Premier passage (F-147) : bibliothèque MENAO, import ou devis, et les deux réglages.
  if (!library.onboarded) {
    const trades = await loadMenaoTrades(supabase, artisanId);
    return (
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
          <MenaoLibraryStart
            trades={trades}
            devisCount={library.works.length}
            hourPriceCents={library.settings.hourPriceCents}
            coef={formatCoefficient(library.settings.supplyCoefBp)}
          />
        </div>
      </main>
    );
  }

  const hasMenao = library.works.some((w) => w.source === "menao");
  // Prix d'achat repérés dans les factures lues dans Dépenses (F-149).
  const invoicePrices = await loadInvoicePrices(supabase, library);
  const count = (value: unknown, max: number) =>
    typeof value === "string" && new RegExp(`^\\d{1,${max}}$`).test(value) ? Number(value) : null;
  const facturesCount = count(factures, 3);
  const importedCount = count(importe, 5);
  return (
    <LibraryView
      library={library}
      view={view}
      query={query}
      metier={typeof metier === "string" ? metier : null}
      labels={hasMenao ? await tradeLabels(supabase) : []}
      added={count(menao, 4)}
      addedTrades={count(metiers, 2) ?? 0}
      imported={
        importedCount === null ? null : { added: importedCount, updated: count(maj, 5) ?? 0 }
      }
      undone={count(annule, 5)}
      // Hausse en un geste encore annulable (F-149).
      raise={await loadUndoableRaise(supabase)}
      invoiceDone={
        facturesCount === null ? null : { updated: facturesCount, added: count(ajouts, 3) ?? 0 }
      }
      invoicePrices={{ changes: invoicePrices.changes.length, fresh: invoicePrices.fresh.length }}
    />
  );
}
