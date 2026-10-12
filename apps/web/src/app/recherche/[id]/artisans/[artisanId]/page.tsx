import { availability, parisToday, responseTimeBucket } from "@menao/core";
import {
  BadgeCheck,
  Briefcase,
  ChevronRight,
  CircleCheck,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { ReviewList, type PublicReview } from "@/components/review/review-list";
import { ButtonLink, StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getArtisanProfile, getArtisanReviews, publicUrl } from "@/lib/project/artisans";
import { sendPagePath } from "@/lib/project/paths";
import { createClient } from "@/lib/supabase/server";
import { PhotoGallery } from "./photo-gallery";
import { StickyProfileBar } from "./sticky-bar";

const t = fr.search.profile;
const r = fr.search.results;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));
const publishedFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});
const SCORE_ROWS = ["quality", "delays", "communication", "value_for_money"] as const;

export const metadata: Metadata = { robots: { index: false } };

/** Fiche artisan (F-10), maquette « Fiche artisan ». Jamais de téléphone ni d'e-mail. */
export default async function ArtisanProfilePage({
  params,
}: PageProps<"/recherche/[id]/artisans/[artisanId]">) {
  const { id, artisanId } = await params;
  if (!UUID.test(id) || !UUID.test(artisanId)) notFound();
  const supabase = await createClient();
  const [{ data: project }, profile, reviewRows, { data: auth }] = await Promise.all([
    supabase.from("projects").select("id, trade_code").eq("id", id).maybeSingle(),
    getArtisanProfile(supabase, artisanId),
    getArtisanReviews(supabase, artisanId),
    supabase.auth.getClaims(),
  ]);
  if (!project || !profile) notFound();
  // Signalement d'un avis depuis un compte connecté (pas une session anonyme de recherche).
  const canReport = Boolean(auth && !auth.claims.is_anonymous);
  const reviews: PublicReview[] = reviewRows.map((row) => ({
    id: row.review_id,
    author: row.author_name,
    publishedOn: publishedFormat.format(new Date(row.created_at)),
    receivedOn: formatDay(row.experience_on),
    score: row.score,
    comment: row.comment,
    reply: row.reply,
  }));

  const response =
    profile.response_minutes !== null ? responseTimeBucket(profile.response_minutes) : null;
  const avail = availability(
    { paused: profile.paused, availableFrom: profile.available_from },
    parisToday(),
  );
  const trade =
    profile.trades.find((tr) => tr.code === project.trade_code)?.label ??
    profile.trades[0]?.label ??
    "";
  const zone =
    profile.zone.mode === "rayon" && profile.zone.radius_km
      ? r.zoneRadius(profile.zone.radius_km, profile.zone.city)
      : r.zoneCommunes(profile.zone.communes);
  const photos = profile.photos.map((p) => publicUrl(supabase, "portfolio", p));
  const avatar = profile.avatar_path ? publicUrl(supabase, "avatars", profile.avatar_path) : null;
  const title = t.title(profile.display_name, trade);
  const score = profile.score;
  const requestHref = sendPagePath(id, [profile.id]) as Route;
  const badge =
    avail.kind === "paused" ? (
      <StatusBadge tone="neutral">{t.unavailable}</StatusBadge>
    ) : avail.kind === "from" ? (
      <StatusBadge tone="neutral">{r.availableFrom(formatDay(avail.date))}</StatusBadge>
    ) : (
      <StatusBadge>{r.availableNow}</StatusBadge>
    );

  return (
    <main className="bg-background">
      <StickyProfileBar
        bar={
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <ArtisanPhoto
                url={avatar}
                name={profile.display_name}
                className="size-10 shrink-0 rounded-lg"
                initialsClassName="text-sm"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{title}</p>
                <div className="hidden sm:block">{badge}</div>
              </div>
            </div>
            <ButtonLink href={requestHref} size="sm">
              {t.request}
            </ButtonLink>
          </div>
        }
      >
        <div className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <nav aria-label={t.breadcrumb.label} className="text-xs text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li className="inline-flex items-center gap-1.5">
                  <Link href={`/recherche/${id}` as Route} className="hover:text-foreground">
                    {t.breadcrumb.criteria}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Link
                    href={`/recherche/${id}/artisans` as Route}
                    className="hover:text-foreground"
                  >
                    {t.breadcrumb.selection}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                </li>
                <li aria-current="page" className="text-foreground">
                  {title}
                </li>
              </ol>
            </nav>

            <div className="grid gap-6 md:grid-cols-[17.5rem_1fr] md:items-center">
              <ArtisanPhoto
                url={avatar}
                name={profile.display_name}
                className="aspect-[4/3] w-full rounded-card"
              />
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {badge}
                    {/* Temps de réponse moyen (F-10), publié à partir de 3 réponses. */}
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
                    {profile.experience_years !== null
                      ? t.experienceValue(profile.experience_years)
                      : "—"}
                  </InfoBox>
                  <InfoBox icon={<MapPin />} label={t.zone}>
                    {zone}
                  </InfoBox>
                  <InfoBox icon={<ShieldCheck />} label={t.insurance}>
                    {t.insuranceValue}
                  </InfoBox>
                </dl>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <ButtonLink href={requestHref} size="lg" className="sm:w-auto">
                    {t.request}
                  </ButtonLink>
                  <p className="rounded-input bg-primary-softer px-3 py-2 text-xs text-primary-strong">
                    {t.requestHint}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StickyProfileBar>

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
              <Guarantee icon={<ShieldCheck />} title={t.decennaleTitle}>
                {profile.decennale?.valid_until
                  ? t.decennaleUntil(
                      formatDay(profile.decennale.valid_until),
                      profile.decennale.insurer,
                    )
                  : null}
              </Guarantee>
              {profile.certifications.map((c) => (
                <Guarantee
                  key={`${c.type}-${c.numero}`}
                  icon={<CircleCheck />}
                  title={t.certificationTitle(
                    fr.certificationTypes[c.type as keyof typeof fr.certificationTypes] ?? c.type,
                  )}
                >
                  {t.certificationDetail(c.numero, formatDay(c.valid_until))}
                </Guarantee>
              ))}
            </ul>
          </Section>
          <Section title={t.score}>
            {score ? (
              <>
                <dl className="flex flex-col gap-3">
                  {SCORE_ROWS.map((row) => (
                    <div key={row} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <dt className="text-muted-foreground">{t.scoreRows[row]}</dt>
                        <dd className="font-medium text-primary-strong">
                          {fr.review.percent(score[row])}
                        </dd>
                      </div>
                      <div aria-hidden="true" className="h-1.5 rounded-full bg-primary-soft">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${score[row]}%` }}
                        />
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
            ) : (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t.scoreEmpty}
              </p>
            )}
          </Section>
        </div>
      </div>
    </main>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
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
