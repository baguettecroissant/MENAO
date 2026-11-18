import {
  ATTESTATION_TYPES,
  attestationsProgress,
  documentState,
  type DocumentState,
} from "@menao/core";
import { ArrowRight, ChevronRight, Mail } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentHelpDisclosure } from "@/components/pro/document-help";
import { GuideBar, GuideBarSpace } from "@/components/pro/guide-bar";
import { Alert, ButtonLink, Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { setDecennaleExempt } from "@/lib/artisan/actions";
import { getOnboardingContext } from "@/lib/artisan/context";
import { guideAround, guideFromContext, suiteHref } from "@/lib/artisan/guide";
import { DocumentUpload } from "../documents/document-upload";

const t = fr.pro.onboarding.documents;
const g = fr.pro.onboarding.guide;
const a = g.attestations;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

const chip: Record<DocumentState, string> = {
  missing: "bg-warning-soft text-warning",
  en_attente: "bg-primary-soft text-primary-strong",
  valide: "bg-success-soft text-success",
  refuse: "bg-danger-soft text-danger",
  a_refaire: "bg-danger-soft text-danger",
};

/**
 * « Vos attestations » (lot 73, ADR 0376) : décennale, RC Pro et URSSAF sur un seul écran. On
 * dépose celles qu'on a, avant ou après l'envoi du dossier, et on continue : les autres sont
 * rappelées par e-mail. Elles conditionnent la mise en ligne de la fiche.
 */
export default async function AttestationsPage() {
  const context = await getOnboardingContext();
  const { supabase, userId, artisan, documents, snapshot, tradeCodes } = context;
  const guide = guideFromContext(context);
  // Artisan validé : ses attestations se renouvellent depuis « Mon dossier ».
  if (!guide.active) redirect("/pro/onboarding/documents");

  const { data: trades } = await supabase
    .from("trades")
    .select("code, label")
    .in("code", tradeCodes.length ? tradeCodes : ["-"])
    .order("sort_order");
  const exempt = artisan.decennale_non_soumis;
  const progress = attestationsProgress(snapshot);
  const around = guideAround(guide, "attestations");

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="leading-relaxed text-label">{a.lead}</p>
      {ATTESTATION_TYPES.map((type) => {
        const state = documentState(type, snapshot.documents[type]);
        const rows = documents.filter((doc) => doc.type === type);
        const current = rows.find((doc) => doc.status === "valide") ?? rows[0];
        const refused = rows.find((doc) => doc.status === "refuse");
        const nonSoumis = type === "decennale" && exempt;
        return (
          <Card key={type}>
            <section
              id={type}
              aria-labelledby={`att-${type}`}
              className="flex scroll-mt-24 flex-col gap-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 id={`att-${type}`} className="text-lg">
                  {t.types[type]}
                </h2>
                <span
                  className={`rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                    nonSoumis ? chip.en_attente : chip[state]
                  }`}
                >
                  {nonSoumis
                    ? fr.pro.onboarding.dossier.states.exempt
                    : fr.pro.onboarding.dossier.states[state]}
                </span>
              </div>
              {current && !nonSoumis && (
                <p className="text-sm text-muted-foreground">
                  {[
                    current.assureur,
                    current.numero,
                    current.date_emission &&
                      type === "urssaf" &&
                      t.issuedOn(dateFormat.format(new Date(current.date_emission))),
                    current.date_fin && t.validUntil(dateFormat.format(new Date(current.date_fin))),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {refused?.refusal_reason && (
                <Alert tone="error">{t.refusedBecause(refused.refusal_reason)}</Alert>
              )}
              {state === "a_refaire" && <Alert tone="error">{t.invalidNow}</Alert>}
              {nonSoumis ? (
                <Alert tone="info">{t.exemptDeclared}</Alert>
              ) : (
                // Un document déjà validé par l'équipe est gardé.
                state !== "valide" && (
                  <DocumentUpload
                    type={type}
                    userId={userId}
                    trades={type === "decennale" ? (trades ?? []) : undefined}
                    label={current ? t.replace : t.send}
                    fieldsAfterFile
                  />
                )
              )}
              {type === "decennale" && state !== "valide" && (
                <form action={setDecennaleExempt}>
                  <input type="hidden" name="value" value={exempt ? "non" : "oui"} />
                  <button
                    type="submit"
                    className={`min-h-touch rounded-sm text-left text-sm font-semibold text-primary-strong underline underline-offset-4 ${focusRing}`}
                  >
                    {exempt ? t.exemptCancel : t.exemptDeclare}
                  </button>
                </form>
              )}
              {!nonSoumis && state !== "valide" && state !== "en_attente" && (
                <DocumentHelpDisclosure type={type} />
              )}
            </section>
          </Card>
        );
      })}
      <Link
        href={"/pro/onboarding/documents/assureur?type=decennale" as Route}
        className={`flex min-h-touch items-center gap-3 rounded-input border border-border bg-surface px-4 py-3 hover:bg-background ${focusRing}`}
      >
        <Mail aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
        <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold">{a.insurer}</span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      </Link>

      <GuideBarSpace />
      <GuideBar backHref={around.backHref} note={a.barNote(progress.total - progress.done)}>
        <ButtonLink href={suiteHref("attestations")} size="lg" block>
          {g.continue}
          <ArrowRight aria-hidden="true" className="size-5" />
        </ButtonLink>
      </GuideBar>
    </div>
  );
}
