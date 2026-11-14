import { ArrowLeft, Check } from "lucide-react";
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
    supabase
      .from("projects")
      .select("id, trade_code, ville_nom, trades(label)")
      .eq("id", id)
      .maybeSingle(),
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
  // « Sélectionner cet artisan » (maquette FicheParcoursNette, lot 48) : retour aux artisans
  // trouvés avec cet artisan déjà coché.
  const selectHref = `/recherche/${id}/artisans?choisi=${profile.id}` as Route;
  const projectLine = [(project.trades as { label: string } | null)?.label, project.ville_nom]
    .filter(Boolean)
    .join(" · ");

  const selectCard = (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="text-base font-bold tracking-tight">{t.projectTitle}</h2>
      {projectLine && <p className="text-sm text-label">{projectLine}</p>}
      <ButtonLink href={selectHref} variant="dark" className="!min-h-12 !rounded-pill">
        <Check aria-hidden="true" className="size-4" />
        {t.select}
      </ButtonLink>
      <p className="text-center text-[0.8125rem] text-muted-foreground">{t.selectHint}</p>
      <p className="border-t border-border pt-3 text-center text-sm">
        <Link href={requestHref} className="font-semibold text-primary-strong hover:underline">
          {t.requestOnly}
        </Link>
      </p>
    </div>
  );

  // Refonte « Nette » (lot 48, ADR 0317) : retour aux artisans trouvés, en-tête de la fiche, puis
  // la fiche à gauche et « Votre projet » fixe à droite, comme la maquette FicheParcoursNette.
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
            <ButtonLink href={selectHref} size="sm" variant="dark" block={false}>
              {t.select}
            </ButtonLink>
          </div>
        }
      >
        <div className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
            <Link
              href={`/recherche/${id}/artisans` as Route}
              className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {t.backToResults}
            </Link>
            <ProfileHeader profile={profile} avatar={avatar} title={title} actions={null} />
          </div>
        </div>
      </StickyProfileBar>
      <ProfileBody
        profile={profile}
        photos={photos}
        reviews={reviews}
        canReport={canReport}
        layout="public"
        aside={<div className="hidden lg:block">{selectCard}</div>}
      />
      {/* Téléphone : la sélection toujours à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-1 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <ButtonLink href={selectHref} variant="dark" size="lg" block>
          <Check aria-hidden="true" className="size-4" />
          {t.select}
        </ButtonLink>
        <p className="text-center text-xs text-muted-foreground">{t.selectHint}</p>
      </div>
      <div className="h-28 lg:hidden" aria-hidden="true" />
    </main>
  );
}
