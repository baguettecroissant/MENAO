import { profileTips } from "@menao/core";
import type { Metadata } from "next";
import { formatProfileDay } from "@/components/artisan-profile/profile-view";
import { PublicProfileScreen } from "@/components/artisan-profile/public-profile-screen";
import { WebPresence } from "@/components/pro/web-presence";
import type { PublicReview } from "@/components/review/review-list";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
import { parseArtisanProfile, publicUrl } from "@/lib/project/artisans";

const t = fr.pro.publicProfile;
const publishedFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * « Ma fiche publique » (F-10) : la fiche telle que la voient les particuliers, même tant que
 * l'artisan n'est pas visible, avec les conseils pour la rendre plus convaincante.
 */
export default async function MyPublicProfilePage() {
  const space = await requireProSpace();
  const { supabase } = space;
  const [{ data }, { data: reviewRows }, { count: certifications }, { data: page }] =
    await Promise.all([
      supabase.rpc("my_public_profile"),
      supabase
        .from("reviews")
        .select("id, author_name, score, comment, experience_on, created_at, reply")
        .eq("artisan_id", space.artisanId)
        .eq("status", "publie")
        .order("created_at", { ascending: false })
        .limit(20),
      // Certifications déclarées, même en cours de vérification (la fiche n'affiche que les vérifiées).
      supabase
        .from("certifications")
        .select("id", { count: "exact", head: true })
        .eq("artisan_id", space.artisanId),
      // Adresse publique et choix pour Google (ADR 0144).
      supabase
        .from("artisans")
        .select("slug, indexable, nom_commercial, raison_sociale, sirene_partial")
        .eq("id", space.artisanId)
        .single(),
    ]);
  const profile = parseArtisanProfile(data);
  if (!profile) {
    return (
      <main className="flex-1">
        <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground sm:px-6">
          {t.unavailable}
        </p>
      </main>
    );
  }

  const reviews: PublicReview[] = (reviewRows ?? []).map((row) => ({
    id: row.id,
    author: row.author_name,
    publishedOn: publishedFormat.format(new Date(row.created_at)),
    receivedOn: formatProfileDay(row.experience_on),
    score: row.score,
    comment: row.comment,
    reply: row.reply,
  }));
  const photos = profile.photos.map((p) => publicUrl(supabase, "portfolio", p));
  const avatar = profile.avatar_path ? publicUrl(supabase, "avatars", profile.avatar_path) : null;
  const tips = profileTips({
    hasAvatar: profile.avatar_path !== null,
    presentationLength: profile.presentation?.length ?? 0,
    photoCount: profile.photos.length,
    workTypeCount: profile.work_types.length,
    // Domaines RGE lus dans l'annuaire officiel (ADR 0118) : comptent comme une certification.
    certificationCount: (certifications ?? 0) + profile.rge.length,
    verified: profile.verified,
  });
  return (
    <PublicProfileScreen
      profile={profile}
      avatar={avatar}
      photos={photos}
      reviews={reviews}
      tips={tips}
      structurallyVisible={space.visibility.visible}
      availability={space.availability}
      webPresence={
        page && (
          <WebPresence
            siteUrl={env.NEXT_PUBLIC_SITE_URL}
            slug={page.slug}
            // Même règle que la fiche publique : jamais la raison sociale en diffusion partielle.
            name={
              page.nom_commercial ||
              (!page.sirene_partial && page.raison_sociale) ||
              profile.display_name
            }
            visible={space.visibility.visible}
            indexable={page.indexable}
            verified={profile.verified}
          />
        )
      }
    />
  );
}
