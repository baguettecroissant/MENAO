import { parisToday, profileStrength, type ProfileTip } from "@menao/core";
import {
  parseArtisanProfile,
  parseGrade,
  parseReferral,
  parseReferralRows,
  type Referral,
  type ReferralRow,
  type WelcomeGift,
} from "@menao/validation";
import { loadDossier, type Dossier } from "./artisan-dossier";
import { countReviewsToAnswer } from "./pro-reviews";
import { hubStatuses, type HubRow, type HubStatus } from "./profile-hub-status";
import { publicUrl } from "./project";
import type { ArtisanPage } from "./requests";
import { supabase } from "./supabase";
import { loadWelcomeGift } from "./welcome-gift";

/**
 * « Mon profil » de l'artisan (ADR 0129) : en-tête (photo, nom, entreprise, badges, score), jauge
 * de la fiche et état de chaque rubrique, à partir du dossier (`loadDossier`) et de la fiche
 * (`my_public_profile`), lus en parallèle.
 */
export type ProfileHub = {
  name: string;
  initials: string;
  company: string | null;
  city: string | null;
  avatarUrl: string | null;
  email: string | null;
  status: Dossier["status"];
  verified: boolean;
  score: { percent: number; count: number } | null;
  strength: { percent: number; next: ProfileTip | null };
  /** Éléments du dossier encore à terminer avant l'envoi (dossier en brouillon). */
  itemsLeft: number;
  statuses: Record<HubRow, HubStatus>;
  /** Parrainage (F-60) : code à partager, artisans validés seulement. */
  referral: Referral | null;
  /** Suivi de chaque filleul (ADR 0161). */
  referrals: ReferralRow[];
  /** Cadeau de bienvenue du filleul (ADR 0154). */
  welcomeGift: WelcomeGift | null;
};

export async function loadProfileHub(): Promise<ProfileHub | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const [
    dossier,
    { data: page },
    reviewsToAnswer,
    { data: grade },
    certifications,
    account,
    { data: referral },
    welcomeGift,
    { data: referralRows },
  ] = await Promise.all([
    loadDossier(),
    supabase.rpc("my_public_profile"),
    countReviewsToAnswer(),
    supabase.rpc("artisan_grade"),
    // Les siennes seulement (RLS), même en cours de vérification.
    supabase.from("certifications").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase.rpc("my_referral"),
    loadWelcomeGift(),
    supabase.rpc("my_referrals"),
  ]);
  const profile = parseArtisanProfile(page);
  if (!dossier || !profile) return null;

  const first = account.data?.first_name?.trim() ?? "";
  const last = account.data?.last_name?.trim() ?? "";
  const name = [first, last].filter(Boolean).join(" ") || profile.display_name;
  const initials = (first.charAt(0) + last.charAt(0)).toUpperCase() || name.charAt(0).toUpperCase();
  const facts = {
    hasAvatar: profile.avatar_path !== null,
    presentationLength: profile.presentation?.trim().length ?? 0,
    photoCount: profile.photos.length,
    workTypeCount: profile.work_types.length,
    // Domaines RGE de l'annuaire officiel (ADR 0118) : comptent comme une certification.
    certificationCount: (certifications.count ?? 0) + profile.rge.length,
    verified: profile.verified,
  };
  return {
    name,
    initials,
    company: profile.company_name,
    city: profile.zone.city,
    avatarUrl: profile.avatar_path ? publicUrl("avatars", profile.avatar_path) : null,
    email: auth.user.email ?? null,
    status: dossier.status,
    verified: profile.verified,
    score: profile.score
      ? { percent: Math.round(profile.score.global), count: profile.score.review_count }
      : null,
    strength: profileStrength(facts),
    itemsLeft: dossier.itemsLeft,
    statuses: hubStatuses({
      snapshot: dossier.snapshot,
      validated: dossier.status === "valide" || dossier.status === "suspendu",
      documents: dossier.documents,
      photoCount: profile.photos.length,
      reviewsToAnswer,
      reviewCount: profile.score?.review_count ?? 0,
      level: parseGrade(grade)?.level ?? null,
      hasRge: profile.rge.length > 0,
      paused: profile.paused,
      availableFrom: profile.available_from,
      today: parisToday(),
    }),
    referral: parseReferral(referral),
    referrals: parseReferralRows(referralRows),
    welcomeGift,
  };
}

/**
 * « Voir ma fiche » (ADR 0129) : la fiche telle que la voient les particuliers, même tant que
 * l'artisan n'est pas visible (`my_public_profile`), avec ses derniers avis publiés.
 */
export async function loadMyPage(): Promise<ArtisanPage | null> {
  const { data } = await supabase.rpc("my_public_profile");
  const profile = parseArtisanProfile(data);
  if (!profile) return null;
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, author_name, score, comment, experience_on, created_at, reply")
    .eq("artisan_id", profile.id)
    .eq("status", "publie")
    .order("created_at", { ascending: false })
    .limit(20);
  return {
    profile,
    avatarUrl: profile.avatar_path ? publicUrl("avatars", profile.avatar_path) : null,
    photoUrls: profile.photos.map((path) => publicUrl("portfolio", path)),
    reviews: (reviews ?? []).map((row) => ({
      id: row.id,
      author: row.author_name,
      createdAt: row.created_at,
      experienceOn: row.experience_on,
      score: row.score,
      comment: row.comment,
      reply: row.reply,
    })),
  };
}
