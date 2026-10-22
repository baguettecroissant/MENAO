import {
  partnerLinks,
  profileHubStatuses,
  profileStrength,
  subscriptionGrantsAccess,
  type SubscriptionStatus,
} from "@menao/core";
import {
  parseArtisanProfile,
  parseGrade,
  parseReferral,
  parseWelcomeGift,
} from "@menao/validation";
import type { Metadata } from "next";
import { ProfileHubView } from "@/components/pro/profile-hub-view";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { hubStatusTexts } from "@/lib/artisan/profile-hub";
import { getProShell, requireProSpace } from "@/lib/artisan/space";
import { publicUrl } from "@/lib/project/artisans";

export const metadata: Metadata = { title: `${fr.pro.hub.title} — MENAO` };

/**
 * « Mon profil » de l'artisan sur le site (ADR 0131), comme dans l'application (ADR 0129) :
 * mêmes règles (`profileStrength`, `profileHubStatuses`), mêmes rubriques, plus l'abonnement.
 */
export default async function MyProfilePage() {
  const space = await requireProSpace();
  const [
    ctx,
    shell,
    { data: page },
    { data: gradeData },
    { data: referralData },
    { data: giftData },
  ] = await Promise.all([
    getOnboardingContext(),
    getProShell(),
    space.supabase.rpc("my_public_profile"),
    space.supabase.rpc("artisan_grade"),
    // Parrainage (F-60) : code créé à la première visite d'un artisan validé.
    space.supabase.rpc("my_referral"),
    // Cadeau de bienvenue du filleul (ADR 0154).
    space.supabase.rpc("my_welcome_gift"),
  ]);
  const referral = parseReferral(referralData);
  const profile = parseArtisanProfile(page);
  if (!profile) {
    return (
      <main className="flex-1">
        <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground sm:px-6">
          {fr.pro.publicProfile.unavailable}
        </p>
      </main>
    );
  }

  const name =
    [space.firstName, space.lastName].filter(Boolean).join(" ").trim() || profile.display_name;
  const statuses = profileHubStatuses({
    snapshot: ctx.snapshot,
    validated: ctx.artisan.status === "valide" || ctx.artisan.status === "suspendu",
    documents: ctx.documents,
    photoCount: profile.photos.length,
    reviewsToAnswer: shell.badges.reviews,
    reviewCount: profile.score?.review_count ?? 0,
    level: parseGrade(gradeData)?.level ?? null,
    hasRge: profile.rge.length > 0,
    paused: space.paused,
    availableFrom: space.availableFrom,
    today: space.today,
  });

  return (
    <ProfileHubView
      hub={{
        name,
        company: profile.company_name,
        city: profile.zone.city,
        avatarUrl: profile.avatar_path
          ? publicUrl(space.supabase, "avatars", profile.avatar_path)
          : null,
        status: ctx.artisan.status,
        verified: profile.verified,
        score: profile.score
          ? { percent: Math.round(profile.score.global), count: profile.score.review_count }
          : null,
        strength: profileStrength({
          hasAvatar: profile.avatar_path !== null,
          presentationLength: profile.presentation?.trim().length ?? 0,
          photoCount: profile.photos.length,
          workTypeCount: profile.work_types.length,
          // Domaines RGE de l'annuaire officiel (ADR 0118) : comptent comme une certification.
          certificationCount: ctx.certifications.length + profile.rge.length,
          verified: profile.verified,
        }),
        statuses: hubStatusTexts(statuses),
        subscriptionActive: subscriptionGrantsAccess(
          (ctx.subscription?.status as SubscriptionStatus | undefined) ?? null,
          ctx.subscription?.past_due_since ?? null,
        ),
        referral: referral && {
          link: partnerLinks(env.NEXT_PUBLIC_SITE_URL, referral.code).pros,
          code: referral.code,
          joined: referral.joined,
          monthsThisYear: referral.months_this_year,
        },
        welcomeGift: parseWelcomeGift(giftData),
      }}
    />
  );
}
