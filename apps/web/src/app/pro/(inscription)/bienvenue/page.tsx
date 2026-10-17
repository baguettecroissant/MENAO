import { REQUIRED_DOCUMENT_TYPES } from "@menao/core";
import { ArrowRight, Camera, CircleCheck, Clock, FileText, MapPin, PenLine } from "lucide-react";
import type { Metadata } from "next";
import { Alert, ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { ClearSignupDraft } from "./clear-signup-draft";

const t = fr.pro.signUp.welcome;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/** Initiales de l'entreprise pour l'aperçu de la fiche (« Plomberie des Oliviers » → « PO »). */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "M"
  );
}

/**
 * « Votre profil est créé » (ADR 0110) : aperçu de la fiche avec les choix du parcours, puis la
 * suite de l'inscription (charte et documents). Le résultat de la vérification du SIRET auprès de
 * l'INSEE, faite à la création du compte, y est signalé s'il pose problème.
 */
export default async function ArtisanWelcomePage() {
  const { supabase, artisan, tradeCodes } = await getOnboardingContext();
  const { data: trades } = await supabase
    .from("trades")
    .select("code, label")
    .in("code", tradeCodes.length ? tradeCodes : ["-"])
    .order("sort_order");

  const name = artisan.nom_commercial ?? artisan.raison_sociale ?? fr.pro.signUp.company.manualName;
  const sirene: keyof typeof t.sirene | null =
    artisan.siret === null
      ? "siret_missing"
      : artisan.sirene_checked_at === null
        ? "unavailable"
        : artisan.sirene_active === false
          ? "inactive"
          : null;
  const documents = fr.pro.onboarding.documents.types;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <ClearSignupDraft />
      <span className="flex size-14 items-center justify-center rounded-full bg-success text-primary-foreground">
        <CircleCheck aria-hidden="true" className="size-7" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight">{t.title}</h1>
        <p className="leading-relaxed text-muted-foreground">{t.lead}</p>
      </div>

      {sirene && <Alert tone="info">{t.sirene[sirene]}</Alert>}

      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-raised">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
          >
            {initials(name)}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-lg font-semibold">{name}</span>
            <span className="text-sm text-muted-foreground">
              {(trades ?? []).map((trade) => trade.label).join(" · ")}
            </span>
          </span>
        </div>
        {artisan.base_label && artisan.radius_km && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {t.zone(artisan.base_label, artisan.radius_km)}
          </p>
        )}
        <span className="inline-flex items-center gap-1.5 self-start rounded-pill bg-warning-soft px-3 py-1 text-[0.8125rem] font-semibold text-warning">
          <Clock aria-hidden="true" className="size-3.5" />
          {t.toVerify}
        </span>
        <p className="text-[0.8125rem] text-muted-foreground">{t.photoLater}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-primary-softer p-5">
        <h2 className="text-[1.0625rem] font-semibold">{t.nextTitle}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2.5">
            <PenLine aria-hidden="true" className="size-4 shrink-0 text-primary-strong" />
            {t.charter}
          </li>
          {REQUIRED_DOCUMENT_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-2.5">
              <FileText aria-hidden="true" className="size-4 shrink-0 text-primary-strong" />
              {documents[type]}
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 text-sm font-medium text-primary-strong">
          <Camera aria-hidden="true" className="size-4 shrink-0" />
          {t.duration}
        </p>
      </section>

      <div className="sticky bottom-0 -mx-4 mt-auto border-t border-border bg-surface px-4 pt-3 pb-4 sm:mx-0 sm:rounded-card sm:border sm:shadow-raised">
        <ButtonLink href="/pro/onboarding" size="lg" block>
          {t.cta}
          <ArrowRight aria-hidden="true" className="size-5" />
        </ButtonLink>
      </div>
    </main>
  );
}
