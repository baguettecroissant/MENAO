import { availability, parisToday, responseTimeBucket } from "@menao/core";
import {
  BadgeCheck,
  Briefcase,
  CircleCheck,
  Clock,
  Leaf,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { ReviewList, type PublicReview } from "@/components/review/review-list";
import { StatusBadge, Tag, VerifiedBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { ArtisanProfile } from "@/lib/project/artisans";
import { PhotoGallery } from "./photo-gallery";

const t = fr.search.profile;
const r = fr.search.results;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
/** Date AAAA-MM-JJ → « 20 février 2026 ». */
export const formatProfileDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));
const SCORE_ROWS = ["quality", "delays", "communication", "value_for_money"] as const;

/** Métier affiché : celui recherché s'il est exercé, sinon le premier de l'artisan. */
export function profileTrade(profile: ArtisanProfile, tradeCode?: string | null): string {
  return (
    profile.trades.find((tr) => tr.code === tradeCode)?.label ?? profile.trades[0]?.label ?? ""
  );
}

/** « Dispo immédiate », « Disponible à partir du … » ou « Indisponible pour le moment ». */
export function AvailabilityBadge({ profile }: { profile: ArtisanProfile }) {
  const avail = availability(
    { paused: profile.paused, availableFrom: profile.available_from },
    parisToday(),
  );
  return avail.kind === "paused" ? (
    <StatusBadge tone="neutral">{t.unavailable}</StatusBadge>
  ) : avail.kind === "from" ? (
    <StatusBadge tone="neutral">{r.availableFrom(formatProfileDay(avail.date))}</StatusBadge>
  ) : (
    <StatusBadge>{r.availableNow}</StatusBadge>
  );
}

/**
 * En-tête de la fiche (F-10) : photo, titre, disponibilité, temps de réponse moyen (publié à
 * partir de 3 réponses), expérience, zone, assurance, puis les actions de la page.
 */
export function ProfileHeader({
  profile,
  avatar,
  title,
  actions,
  titleAs: Title = "h1",
}: {
  profile: ArtisanProfile;
  avatar: string | null;
  title: string;
  actions: ReactNode;
  /** Niveau du titre : h2 dans l'aperçu de l'artisan, dont la page a son propre titre. */
  titleAs?: "h1" | "h2";
}) {
  const response =
    profile.response_minutes !== null ? responseTimeBucket(profile.response_minutes) : null;
  const zone =
    profile.zone.mode === "rayon" && profile.zone.radius_km
      ? r.zoneRadius(profile.zone.radius_km, profile.zone.city)
      : r.zoneCommunes(profile.zone.communes);
  return (
    <div className="grid gap-6 md:grid-cols-[17.5rem_1fr] md:items-center">
      <ArtisanPhoto
        url={avatar}
        name={profile.display_name}
        className="aspect-[4/3] w-full rounded-card"
      />
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Title className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{title}</Title>
          <div className="flex flex-wrap items-center gap-2">
            {profile.verified && <VerifiedBadge>{t.verifiedBadge}</VerifiedBadge>}
            <AvailabilityBadge profile={profile} />
            {response && (
              <Tag>
                <Clock aria-hidden="true" className="size-3.5" />
                {t.responseTime[response]}
              </Tag>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-1 divide-y divide-border rounded-input border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <InfoBox icon={<Briefcase />} label={t.experience}>
            {profile.experience_years !== null ? t.experienceValue(profile.experience_years) : "—"}
          </InfoBox>
          <InfoBox icon={<MapPin />} label={t.zone}>
            {zone}
          </InfoBox>
          {profile.decennale_exempt ? (
            <InfoBox icon={<ShieldCheck />} label={t.insuranceRcPro}>
              {t.insuranceRcProValue}
            </InfoBox>
          ) : (
            <InfoBox icon={<ShieldCheck />} label={t.insurance}>
              {t.insuranceValue}
            </InfoBox>
          )}
        </dl>
        {actions}
      </div>
    </div>
  );
}

/**
 * Contenu de la fiche (F-10) : présentation, chantiers récents et avis ; spécialités, garanties
 * et assurances, score MENAO.
 */
export function ProfileBody({
  profile,
  photos,
  reviews,
  canReport,
}: {
  profile: ArtisanProfile;
  photos: string[];
  reviews: PublicReview[];
  canReport: boolean;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex min-w-0 flex-col gap-5">
        {profile.presentation && (
          <Section title={t.about(profile.display_name)}>
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {profile.presentation}
            </p>
            {profile.company_name && (
              <p className="text-xs text-muted-foreground">
                {t.company} : {profile.company_name}
              </p>
            )}
          </Section>
        )}
        <Section title={t.recent}>
          {photos.length ? (
            <PhotoGallery urls={photos} name={profile.display_name} />
          ) : (
            <p className="text-sm text-muted-foreground">{t.recentEmpty}</p>
          )}
        </Section>
        <Section title={t.reviews}>
          {reviews.length ? (
            <ReviewList
              reviews={reviews}
              artisanName={profile.display_name}
              canReport={canReport}
            />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star aria-hidden="true" className="size-4" />
              {t.reviewsEmpty}
            </p>
          )}
        </Section>
      </div>

      <div className="flex flex-col gap-5">
        {profile.work_types.length > 0 && (
          <Section title={t.expertise}>
            <ul className="flex flex-wrap gap-1.5">
              {profile.work_types.map((w) => (
                <li key={w.code}>
                  <Tag tone="neutral">{w.label}</Tag>
                </li>
              ))}
            </ul>
          </Section>
        )}
        <Section title={t.guarantees}>
          <ul className="flex flex-col gap-4">
            {profile.verified && (
              <Guarantee icon={<BadgeCheck />} title={t.verifiedTitle}>
                {t.verifiedDetail(profile.decennale_exempt)}
              </Guarantee>
            )}
            {profile.decennale_exempt ? (
              <Guarantee icon={<ShieldCheck />} title={t.decennaleExemptTitle}>
                {t.decennaleExemptDetail}
              </Guarantee>
            ) : (
              <Guarantee icon={<ShieldCheck />} title={t.decennaleTitle}>
                {profile.decennale?.valid_until
                  ? t.decennaleUntil(
                      formatProfileDay(profile.decennale.valid_until),
                      profile.decennale.insurer,
                    )
                  : null}
              </Guarantee>
            )}
            {profile.rc_pro?.valid_until && (
              <Guarantee icon={<ShieldCheck />} title={t.rcProTitle}>
                {t.decennaleUntil(
                  formatProfileDay(profile.rc_pro.valid_until),
                  profile.rc_pro.insurer,
                )}
              </Guarantee>
            )}
            {profile.certifications.map((c) => (
              <Guarantee
                key={`${c.type}-${c.numero}`}
                icon={<CircleCheck />}
                title={t.certificationTitle(
                  fr.certificationTypes[c.type as keyof typeof fr.certificationTypes] ?? c.type,
                )}
              >
                {t.certificationDetail(c.numero, formatProfileDay(c.valid_until))}
              </Guarantee>
            ))}
            {profile.rge.length > 0 && (
              <Guarantee icon={<Leaf />} title={t.rgeTitle}>
                <span className="flex flex-col gap-2">
                  <span>{t.rgeDetail}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {profile.rge.map((q) => (
                      <Tag key={q.domain} tone="neutral">
                        {q.domain}
                      </Tag>
                    ))}
                  </span>
                </span>
              </Guarantee>
            )}
          </ul>
        </Section>
        <Section title={t.score}>
          {profile.score ? (
            <ScoreBreakdown score={profile.score} />
          ) : (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t.scoreEmpty}
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

/** Score MENAO (F-28) : barres par critère, score global et nombre d'avis. */
export function ScoreBreakdown({ score }: { score: NonNullable<ArtisanProfile["score"]> }) {
  return (
    <>
      <dl className="flex flex-col gap-3">
        {SCORE_ROWS.map((row) => (
          <div key={row} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <dt className="text-muted-foreground">{t.scoreRows[row]}</dt>
              <dd className="font-medium text-primary-strong">{fr.review.percent(score[row])}</dd>
            </div>
            <div aria-hidden="true" className="h-1.5 rounded-full bg-primary-soft">
              <div className="h-full rounded-full bg-primary" style={{ width: `${score[row]}%` }} />
            </div>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <dt className="text-sm font-medium">{t.scoreGlobal}</dt>
          <dd className="text-2xl font-medium text-primary-strong">
            {fr.review.percent(score.global)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">{t.scoreBasis(score.review_count)}</p>
    </>
  );
}

function InfoBox({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <h2 className="text-[1.0625rem] font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Guarantee({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 text-success [&>svg]:size-[1.125rem]">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        {children && <span className="text-xs text-muted-foreground">{children}</span>}
      </div>
    </li>
  );
}
