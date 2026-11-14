import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Euro, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { sheetCard } from "@/components/pro/sheet";
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

  const n = t.newRequest;
  // Refonte « Nette » (lot 48, ADR 0317) : la saisie du lot 12 à gauche, « Comment ça marche » et
  // les garanties à droite, dans l'espace client.
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2rem]">{t.start}</h1>
        <p className="text-base text-label">{n.intro}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
        <div className="min-w-0">
          <Suspense fallback={<NeedForm trades={trades} />}>
            <NeedFormFromQuery trades={trades} />
          </Suspense>
        </div>
        <div className="flex flex-col gap-4">
          <section aria-labelledby="comment-ca-marche" className={sheetCard}>
            <h2 id="comment-ca-marche" className="text-base font-bold tracking-tight">
              {n.howTitle}
            </h2>
            <ol className="flex flex-col">
              {n.howSteps.map(([title, text], index) => (
                <li key={title} className="flex gap-3 border-t border-border py-2.5">
                  <span className="flex size-[1.625rem] shrink-0 items-center justify-center rounded-full bg-foreground text-[0.8125rem] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <b className="text-[0.90625rem] font-semibold">{title}</b>
                    <span className="text-[0.84375rem] text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="garanties" className={sheetCard}>
            <h2 id="garanties" className="text-base font-bold tracking-tight">
              {n.guaranteesTitle}
            </h2>
            <ul className="flex flex-col">
              <li className="flex items-center gap-3 border-t border-border py-2.5">
                <span className="flex size-[2.125rem] shrink-0 items-center justify-center rounded-[0.625rem] bg-success-soft text-success">
                  <ShieldCheck aria-hidden="true" className="size-[1.0625rem]" />
                </span>
                <span className="flex flex-col">
                  <b className="text-[0.90625rem] font-semibold">{n.verifiedTitle}</b>
                  <span className="text-[0.8125rem] text-muted-foreground">{n.verifiedText}</span>
                </span>
              </li>
              <li className="flex items-center gap-3 border-t border-border py-2.5">
                <span className="flex size-[2.125rem] shrink-0 items-center justify-center rounded-[0.625rem] bg-background text-label">
                  <Euro aria-hidden="true" className="size-[1.0625rem]" />
                </span>
                <span className="flex flex-col">
                  <b className="text-[0.90625rem] font-semibold">{n.freeTitle}</b>
                  <span className="text-[0.8125rem] text-muted-foreground">{n.freeText}</span>
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
