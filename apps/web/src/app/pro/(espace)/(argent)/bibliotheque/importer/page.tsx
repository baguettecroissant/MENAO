import type { Metadata, Route } from "next";
import Link from "next/link";
import { LibraryImport } from "@/components/pro/library-import";
import { PlanLocked } from "@/components/pro/plan-locked";
import { fr } from "@/i18n/fr";
import { planRights } from "@/lib/artisan/plan-rights";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.library.importer;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Importer son catalogue (F-148, ADR 0309-0310, maquette lot 42) : fichier Excel ou CSV, colonnes
 * reconnues, vérification, import. Patron et chef d'équipe seulement.
 */
export default async function ImportPage({
  searchParams,
}: PageProps<"/pro/bibliotheque/importer">) {
  const { type } = await searchParams;
  const { supabase, artisanId } = await requireTeamPermission("money");
  // Import de catalogue : Premium et Entreprise (ADR 0363).
  const included = (await planRights(supabase)).catalogImport;
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
        {included ? (
          <LibraryImport
            artisanId={artisanId}
            initialKind={type === "fournitures" ? "fournitures" : "ouvrages"}
          />
        ) : (
          <PlanLocked title={fr.pro.planLocked.importTitle} text={fr.pro.planLocked.importText} />
        )}
      </div>
    </main>
  );
}
