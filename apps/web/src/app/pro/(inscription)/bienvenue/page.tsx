import { REQUIRED_DOCUMENT_TYPES } from "@menao/core";
import {
  ArrowRight,
  Camera,
  CircleCheck,
  Clock,
  FileText,
  MapPin,
  PenLine,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
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
    // Refonte « Nette » (ADR 0254) : l'aperçu de la fiche à gauche, la dernière étape à droite.
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-12 lg:py-16">
      <ClearSignupDraft />
      <div className="flex flex-col gap-5">
        <span className="flex size-14 items-center justify-center rounded-full bg-success text-primary-foreground">
          <CircleCheck aria-hidden="true" className="size-7" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.75rem]">{t.title}</h1>
          <p className="max-w-lg leading-relaxed text-label sm:text-[1.0625rem]">{t.lead}</p>
        </div>

        {sirene && <Alert tone="info">{t.sirene[sirene]}</Alert>}

        <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
            >
              {initials(name)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-display text-xl font-bold tracking-tight">{name}</span>
              <span className="text-[0.9375rem] text-muted-foreground">
                {(trades ?? []).map((trade) => trade.label).join(" · ")}
              </span>
            </span>
          </div>
          {artisan.base_label && artisan.radius_km && (
            <p className="flex items-center gap-2 text-sm text-label">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {t.zone(artisan.base_label, artisan.radius_km)}
            </p>
          )}
          <span className="inline-flex items-center gap-1.5 self-start rounded-chip bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
            <Clock aria-hidden="true" className="size-3.5" />
            {t.toVerify}
          </span>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card lg:p-7">
        <h2 className="text-[1.1875rem] leading-snug">{t.nextTitle}</h2>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary-strong">
          <Camera aria-hidden="true" className="size-4 shrink-0" />
          {t.duration}
        </p>
        <ul className="flex flex-col divide-y divide-border border-t border-border text-[0.9375rem]">
          <NextItem icon={<PenLine aria-hidden="true" className="size-4" />}>{t.charter}</NextItem>
          {REQUIRED_DOCUMENT_TYPES.map((type) => (
            <NextItem key={type} icon={<FileText aria-hidden="true" className="size-4" />}>
              {documents[type]}
            </NextItem>
          ))}
          <NextItem icon={<UserRound aria-hidden="true" className="size-4" />}>{t.profil}</NextItem>
        </ul>
        <div className="sticky bottom-0 -mx-6 mt-1 border-t border-border bg-surface px-6 pt-3 pb-4 lg:static lg:mx-0 lg:border-0 lg:p-0">
          <ButtonLink href="/pro/onboarding" size="lg" block>
            {t.cta}
            <ArrowRight aria-hidden="true" className="size-5" />
          </ButtonLink>
          <p className="mt-2 text-center text-sm text-muted-foreground">{t.later}</p>
        </div>
      </section>
    </main>
  );
}

function NextItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-input bg-background text-label">
        {icon}
      </span>
      <span className="font-semibold">{children}</span>
    </li>
  );
}
