import type { Metadata, Route } from "next";
import Link from "next/link";
import { LibraryRaise } from "@/components/pro/library-raise";
import { fr } from "@/i18n/fr";
import { loadLibrary } from "@/lib/artisan/library";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.library.raise;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Augmenter ses prix en un geste (F-149, ADR 0312, maquette lot 43) : ouvrages à prix fixé et/ou
 * prix d'achat, aperçu avant/après, annulable 24 h. Patron et chef d'équipe seulement.
 */
export default async function RaisePage() {
  const { supabase } = await requireTeamPermission("money");
  const library = await loadLibrary(supabase, { seed: false });
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/pro/bibliotheque" as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {fr.pro.library.work.back}
        </Link>
        <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2rem]">{t.title}</h1>
        <LibraryRaise
          works={library.works.map((w) => ({
            id: w.id,
            designation: w.designation,
            unit: w.unit,
            manualPriceCents: w.manual_price_cents,
          }))}
          supplies={library.supplies.map((s) => ({
            id: s.id,
            designation: s.designation,
            unit: s.unit,
            purchasePriceCents: s.purchase_price_cents,
          }))}
        />
      </div>
    </main>
  );
}
