import type { AvailabilityStatus, ProfileTip } from "@menao/core";
import { ArrowRight, Eye, EyeOff, Lightbulb, PartyPopper } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { PublicReview } from "@/components/review/review-list";
import { TextLink, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
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
 * Écran « Ma fiche publique » (F-10) : bandeau d'aperçu (visible ou non, et pourquoi), liens de
 * modification, fiche identique à celle des particuliers, conseils pour la rendre convaincante.
 */
export function PublicProfileScreen({
  profile,
  avatar,
  photos,
  reviews,
  tips,
  structurallyVisible,
  availability,
}: {
  profile: ArtisanProfile;
  avatar: string | null;
  photos: string[];
  reviews: PublicReview[];
  tips: ProfileTip[];
  /** Validé, abonné, paiements actifs (hors pause et congés). */
  structurallyVisible: boolean;
  availability: AvailabilityStatus;
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

  return (
    <main className="flex-1 bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <div
            className={`flex flex-col gap-3 rounded-card border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 ${
              visible ? "border-primary/20 bg-primary-softer" : "border-warning/25 bg-warning-soft"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                  visible ? "bg-primary-soft text-primary-strong" : "bg-surface text-warning"
                }`}
              >
                {visible ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-medium">{t.title}</h1>
                <p className="text-sm text-foreground/80">{intro}</p>
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
            <nav aria-label={t.editLabel} className="flex flex-col gap-1 sm:items-end">
              <p className="text-xs font-medium text-muted-foreground">{t.editLabel}</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
                {EDIT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href as Route}
                      className="text-sm font-medium text-primary-strong underline-offset-2 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

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
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <section
          aria-labelledby="conseils"
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="conseils" className="flex items-center gap-2 text-[1.0625rem] font-medium">
            {tips.length > 0 ? (
              <Lightbulb aria-hidden="true" className="size-[1.125rem] text-warning" />
            ) : (
              <PartyPopper aria-hidden="true" className="size-[1.125rem] text-success" />
            )}
            {t.tipsTitle}
          </h2>
          {tips.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {tips.map((tip) => (
                <li
                  key={tip}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm text-foreground/85">{t.tips[tip].text}</p>
                  <Link
                    href={TIP_HREF[tip] as Route}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-strong underline-offset-2 hover:underline"
                  >
                    {t.tips[tip].action}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-success">{t.tipsDone}</p>
          )}
        </section>
      </div>

      <ProfileBody profile={profile} photos={photos} reviews={reviews} canReport={false} />
    </main>
  );
}
