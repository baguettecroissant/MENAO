import {
  exampleHubFacts,
  exampleProfile,
  exampleScore,
  profileHubStatuses,
  profileStrength,
} from "@menao/core";
import type { Metadata } from "next";
import { ProfileHubView } from "@/components/pro/profile-hub-view";
import { fr } from "@/i18n/fr";
import { requireExampleViewer } from "@/lib/artisan/examples";
import { hubStatusTexts } from "@/lib/artisan/profile-hub";

export const metadata: Metadata = { title: `${fr.pro.hub.title} — MENAO` };

/** « Mon profil » d'exemple (ADR 0184) : dossier complet et vérifié, au nom de l'artisan. */
export default async function ExampleProfileHubPage() {
  const { account } = await requireExampleViewer();
  const now = new Date();
  const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || null;
  const profile = exampleProfile(name, now);
  const score = exampleScore();
  return (
    <ProfileHubView
      example
      hub={{
        name: profile.display_name,
        company: profile.company_name,
        city: profile.zone.city,
        avatarUrl: account.avatarUrl,
        status: "valide",
        verified: true,
        score: { percent: score.global_score, count: score.review_count },
        strength: profileStrength({
          hasAvatar: true,
          presentationLength: profile.presentation.length,
          photoCount: profile.photos.length,
          workTypeCount: profile.work_types.length,
          certificationCount: 0,
          verified: true,
        }),
        statuses: hubStatusTexts(profileHubStatuses(exampleHubFacts(now), now)),
        subscriptionActive: true,
        referral: null,
        welcomeGift: null,
      }}
    />
  );
}
