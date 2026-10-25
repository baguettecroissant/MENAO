import { availabilityStatus, exampleProfile, exampleReviews, parisToday } from "@menao/core";
import type { Metadata } from "next";
import { formatProfileDay } from "@/components/artisan-profile/profile-view";
import { PublicProfileScreen } from "@/components/artisan-profile/public-profile-screen";
import { fr } from "@/i18n/fr";
import { examplePhotoUrl, requireExampleViewer } from "@/lib/artisan/examples";

const publishedFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export const metadata: Metadata = { title: `${fr.pro.publicProfile.title} — MENAO` };

/**
 * « Ma fiche » d'exemple (ADR 0184) : la fiche telle que la verront les particuliers, complète,
 * au nom de l'artisan, avec les avis d'exemple.
 */
export default async function ExamplePublicProfilePage() {
  const { account } = await requireExampleViewer();
  const now = new Date();
  const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || null;
  const profile = exampleProfile(name, now);
  return (
    <PublicProfileScreen
      profile={profile}
      avatar={account.avatarUrl}
      photos={profile.photos.flatMap((path) => {
        const url = examplePhotoUrl(path);
        return url ? [url] : [];
      })}
      reviews={exampleReviews(now)
        .filter((r) => r.status === "publie")
        .map((r) => ({
          id: r.id,
          author: r.author_name,
          publishedOn: publishedFormat.format(new Date(r.created_at)),
          receivedOn: formatProfileDay(r.experience_on),
          score: r.score,
          comment: r.comment,
          reply: r.reply,
        }))}
      tips={[]}
      structurallyVisible
      availability={availabilityStatus({
        paused: false,
        availableFrom: null,
        absences: [],
        today: parisToday(now),
      })}
      example
    />
  );
}
