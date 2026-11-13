import {
  artisanPageUrl,
  parseTeam,
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
  parseReferralRows,
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
import { qrSvg } from "@/lib/qr";

export const metadata: Metadata = { title: `${fr.pro.hub.title} — MENAO` };

/**
 * « Mon profil » de l'artisan sur le site (ADR 0131), comme dans l'application (ADR 0129) :
 * mêmes règles (`profileStrength`, `profileHubStatuses`), mêmes rubriques, plus l'abonnement.
 */
export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet } = await searchParams;
  const space = await requireProSpace();
  const [
    ctx,
    shell,
    { data: page },
    { data: gradeData },
    { data: referralData },
    { data: giftData },
    { data: referralRows },
    { data: teamData },
  ] = await Promise.all([
    // Membre de l'équipe (ADR 0240) : fiche de l'entreprise en lecture.
    getOnboardingContext(true),
    getProShell(),
    space.supabase.rpc("my_public_profile"),
    space.supabase.rpc("artisan_grade"),
    // Parrainage (F-60) : code créé à la première visite d'un artisan validé.
    space.supabase.rpc("my_referral"),
    // Cadeau de bienvenue du filleul (ADR 0154).
    space.supabase.rpc("my_welcome_gift"),
    // Suivi de chaque filleul (ADR 0161).
    space.supabase.rpc("my_referrals"),
    // « Mon équipe » (ADR 0240) : réservé au patron.
    space.teamPosition === "patron"
      ? space.supabase.rpc("my_team")
      : Promise.resolve({ data: null }),
  ]);
  const team = parseTeam(teamData);
  const referral = parseReferral(referralData);
  const referralLink = referral ? partnerLinks(env.NEXT_PUBLIC_SITE_URL, referral.code).pros : null;
  // Carte de visite (ADR 0191) : même règle que les cartes à imprimer, artisan validé.
  const pageUrl =
    ctx.artisan.status === "valide" && ctx.artisan.slug
      ? artisanPageUrl(env.NEXT_PUBLIC_SITE_URL, ctx.artisan.slug)
      : null;
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
    // Logo des documents (ADR 0300) : rappelé tant qu'il manque.
    hasLogo: Boolean(ctx.artisan.logo_path),
    today: space.today,
  });

  return (
    <ProfileHubView
      shareTab={onglet === "parrainage" ? "referral" : "card"}
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
        card: pageUrl ? { url: pageUrl, qr: qrSvg(pageUrl) } : null,
        referral:
          referral && referralLink
            ? {
                link: referralLink,
                code: referral.code,
                joined: referral.joined,
                rewarded: referral.rewarded,
                monthsThisYear: referral.months_this_year,
                qr: qrSvg(referralLink),
                referrals: parseReferralRows(referralRows),
              }
            : null,
        welcomeGift: parseWelcomeGift(giftData),
        team: team ? { used: team.used, seats: team.seats } : null,
        teamPosition: space.teamPosition,
      }}
    />
  );
}
