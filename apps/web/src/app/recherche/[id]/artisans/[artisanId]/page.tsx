import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AvailabilityBadge,
  ProfileBody,
  ProfileHeader,
  formatProfileDay,
  profileTrade,
} from "@/components/artisan-profile/profile-view";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import type { PublicReview } from "@/components/review/review-list";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getArtisanProfile, getArtisanReviews, publicUrl } from "@/lib/project/artisans";
import { sendPagePath } from "@/lib/project/paths";
import { createClient } from "@/lib/supabase/server";
import { StickyProfileBar } from "./sticky-bar";

const t = fr.search.profile;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const publishedFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

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
    receivedOn: formatProfileDay(row.experience_on),
    score: row.score,
    comment: row.comment,
    reply: row.reply,
  }));
  const photos = profile.photos.map((p) => publicUrl(supabase, "portfolio", p));
  const avatar = profile.avatar_path ? publicUrl(supabase, "avatars", profile.avatar_path) : null;
  const title = t.title(profile.display_name, profileTrade(profile, project.trade_code));
  const requestHref = sendPagePath(id, [profile.id]) as Route;

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
                <div className="hidden sm:block">
                  <AvailabilityBadge profile={profile} />
                </div>
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
            <ProfileHeader
              profile={profile}
              avatar={avatar}
              title={title}
              actions={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <ButtonLink href={requestHref} size="lg" className="sm:w-auto">
                    {t.request}
                  </ButtonLink>
                  <p className="rounded-input bg-primary-softer px-3 py-2 text-xs text-primary-strong">
                    {t.requestHint}
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </StickyProfileBar>
      <ProfileBody profile={profile} photos={photos} reviews={reviews} canReport={canReport} />
    </main>
  );
}
