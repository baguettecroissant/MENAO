import type { AvailabilityStatus, ProfileTip } from "@menao/core";
import { ArrowRight, Check, ExternalLink, Eye, EyeOff } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicReview } from "@/components/review/review-list";
import { ExampleLock } from "@/components/pro/examples";
import { MoneyFigures } from "@/components/pro/money-figures";
import { sheetCard } from "@/components/pro/sheet";
import { ButtonLink, TextLink, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDuration } from "@/lib/format";
import type { ArtisanProfile } from "@/lib/project/artisans";
import { ProfileBody, ProfileHeader, profileTrade } from "./profile-view";

const t = fr.pro.publicProfile;

/** Étape de « Mon dossier » où suivre chaque conseil. */
const TIP_HREF: Record<ProfileTip, string> = {
  assure_verifie: "/pro/onboarding/documents",
  photo_profil: "/pro/onboarding/profil",
  realisations: "/pro/onboarding/profil",
  presentation: "/pro/onboarding/profil",
  specialites: "/pro/onboarding/metiers",
  certifications: "/pro/onboarding/metiers",
};
const EDIT_LINKS = [
  { href: "/pro/onboarding/profil", label: t.edit.profil },
  { href: "/pro/onboarding/metiers", label: t.edit.metiers },
  { href: "/pro/onboarding/zone", label: t.edit.zone },
] as const;

/**
 * Écran « Ma fiche publique » (F-10), refonte « Nette » (ADR 0250) : chiffres clés, aperçu encadré
 * (visible ou non, et pourquoi, liens de modification, en-tête identique à celui des
 * particuliers), liste à cocher pour une fiche convaincante, adresse web, puis la suite de la
 * fiche telle que la voient les particuliers.
 */
export function PublicProfileScreen({
  profile,
  avatar,
  photos,
  reviews,
  tips,
  structurallyVisible,
  availability,
  webPresence,
  publicHref = null,
  example = false,
  strength,
}: {
  /** Fiche complétée, en % (`profileStrength`). */
  strength: number;
  profile: ArtisanProfile;
  avatar: string | null;
  photos: string[];
  reviews: PublicReview[];
  tips: ProfileTip[];
  /** Validé, abonné, paiements actifs (hors pause et congés). */
  structurallyVisible: boolean;
  availability: AvailabilityStatus;
  /** « Votre fiche sur internet » (ADR 0144), sous les conseils. */
  webPresence?: ReactNode;
  /** Adresse de la fiche publique, quand elle est en ligne : bouton « Ouvrir ma fiche » en haut. */
  publicHref?: string | null;
  /** Exemple (ADR 0184) : liens « Modifier » inactifs. */
  example?: boolean;
}) {
  const status = availability.kind;
  const visible = structurallyVisible && status !== "pause" && status !== "conges";
  const intro = !structurallyVisible
    ? t.previewHidden
    : status === "pause"
      ? t.previewPaused
      : status === "conges"
        ? t.previewConges
        : t.previewVisible;

  const allTips = Object.keys(TIP_HREF) as ProfileTip[];
  const response = profile.response_minutes;
  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6 sm:px-6">
        <MoneyFigures
          label={t.figuresLabel}
          dense
          cells={[
            {
              label: t.completion,
              short: t.completionShort,
              value: `${strength} %`,
              hint: t.completionHint(tips.length),
            },
            {
              label: t.rating,
              short: t.ratingShort,
              value: profile.score ? `${Math.round(profile.score.global)} %` : "—",
              hint: profile.score ? t.ratingHint(profile.score.review_count) : t.noRating,
            },
            {
              label: t.responseTime,
              short: t.responseShort,
              value: response === null ? "—" : formatDuration(response),
              hint: response === null ? t.noResponse : t.responseHint,
            },
          ]}
        />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            aria-labelledby="fiche-publique"
            className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card"
          >
            <div
              className={`flex flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-6 ${
                visible ? "border-border bg-background" : "border-warning/25 bg-warning-soft"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {visible ? (
                  <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-label" />
                ) : (
                  <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                )}
                <div className="flex flex-col gap-1">
                  <h2 id="fiche-publique" className="font-sans text-sm font-semibold">
                    {t.title}
                  </h2>
                  <p className="text-[0.8125rem] text-label">{intro}</p>
                  {visible && publicHref && (
                    <ButtonLink
                      href={publicHref as Route}
                      target="_blank"
                      variant="outline"
                      size="sm"
                      className="mt-1 self-start"
                    >
                      {t.web.open}
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </ButtonLink>
                  )}
                  {!structurallyVisible ? (
                    <TextLink href="/pro/onboarding" className="self-start text-sm">
                      {t.completeFile}
                    </TextLink>
                  ) : (
                    (status === "pause" || status === "conges") && (
                      <TextLink href="/pro/agenda/disponibilites" className="self-start text-sm">
                        {t.manageAvailability}
                      </TextLink>
                    )
                  )}
                </div>
              </div>
              <ExampleLock locked={example}>
                <nav aria-label={t.editLabel} className="flex flex-col gap-1 sm:items-end">
                  <p className="text-xs font-semibold text-muted-foreground">{t.editLabel}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
                    {EDIT_LINKS.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href as Route}
                          className="text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </ExampleLock>
            </div>
            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <ProfileHeader
                profile={profile}
                avatar={avatar}
                title={fr.search.profile.title(profile.display_name, profileTrade(profile))}
                titleAs="h2"
                actions={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Bouton des particuliers, montré à l'identique mais inactif dans l'aperçu. */}
                    <span
                      aria-hidden="true"
                      className={`${buttonClasses({ size: "lg", block: false })} pointer-events-none`}
                    >
                      {fr.search.profile.request}
                    </span>
                    <p className="text-xs text-muted-foreground">{t.ctaHint}</p>
                  </div>
                }
              />
            </div>
          </section>
          {/* Téléphone : la liste à cocher avant l'aperçu, comme la maquette. */}
          <div className="flex min-w-0 flex-col gap-4 max-lg:order-first">
            <section aria-labelledby="conseils" className={sheetCard}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="conseils" className="text-lg">
                  {t.tipsTitle}
                </h2>
                <span className="font-display text-xl font-bold tabular-nums">{strength} %</span>
              </div>
              <span
                role="meter"
                aria-label={t.completion}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={strength}
                className="h-2 overflow-hidden rounded-pill bg-background"
              >
                <span
                  className="block h-full rounded-pill bg-primary"
                  style={{ width: `${strength}%` }}
                />
              </span>
              <p className="text-sm text-label">{t.tipsLead(tips.length)}</p>
              <ul className="flex flex-col divide-y divide-border">
                {allTips.map((tip) => {
                  const todo = tips.includes(tip);
                  return (
                    <li key={tip} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                      <span
                        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                          todo
                            ? "border-2 border-dashed border-border-strong"
                            : "bg-success-soft text-success"
                        }`}
                      >
                        {!todo && <Check aria-hidden="true" className="size-3.5" />}
                        <span className="sr-only">{todo ? "" : t.tipDone}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={`font-semibold ${todo ? "" : "text-muted-foreground"}`}>
                          {t.tipLabels[tip]}
                        </span>
                        {todo && (
                          <span className="text-[0.8125rem] text-muted-foreground">
                            {t.tips[tip].text}
                          </span>
                        )}
                        {todo && (
                          <Link
                            href={TIP_HREF[tip] as Route}
                            className="inline-flex items-center gap-1 self-start text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
                          >
                            {t.tips[tip].action}
                            <ArrowRight aria-hidden="true" className="size-3.5" />
                          </Link>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
            {webPresence}
          </div>
        </div>
      </div>

      <ProfileBody profile={profile} photos={photos} reviews={reviews} canReport={false} />
    </main>
  );
}
