import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NeedForm } from "@/components/project/need-form";
import { NeedFormFromQuery } from "@/components/project/need-form-from-query";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { createClient } from "@/lib/supabase/server";

const t = fr.myChantiers;

export const metadata: Metadata = { title: `${t.start} — MENAO`, robots: { index: false } };

/**
 * « Démarrer un chantier » depuis l'espace client (F-05, ADR 0042) : même saisie que la page
 * publique (texte, dictée, photos, analyse), sans quitter l'espace ; les étapes suivantes
 * (critères, artisans, envoi) gardent le menu latéral.
 */
export default async function NewRequestPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data || data.claims.is_anonymous) {
    redirect("/connexion?next=/mon-espace/nouvelle-demande");
  }
  const home = homePathForRole(roleFromAppMetadata(data.claims.app_metadata));
  if (home !== "/mon-espace") redirect(home as Route);
  const { trades } = await seoCatalog();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-10 text-center sm:px-6 sm:py-14">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.start}</h1>
        <p className="max-w-lg text-sm text-muted-foreground">{t.newRequest.intro}</p>
      </div>
      <Suspense fallback={<NeedForm trades={trades} />}>
        <NeedFormFromQuery trades={trades} />
      </Suspense>
    </main>
  );
}
