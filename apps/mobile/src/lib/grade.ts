import type { GradeLevel } from "@menao/core";
import { parseGrade, type Grade, type RewardClaim } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";
import { exampleGradeView } from "./example-data";
import { examplesActive } from "./examples";

export type GradeView = {
  xp: number;
  level: number;
  levels: GradeLevel[];
  objectives: Grade["objectives"];
  badges: Grade["badges"];
  claimedLevels: number[];
};

/** « Mon grade MENAO » (F-24) : progression de l'artisan connecté (artisan_grade, RLS). */
export async function loadGrade(): Promise<GradeView | null> {
  const { data, error } = await supabase.rpc("artisan_grade");
  if (error) return null;
  const grade = parseGrade(data);
  if (!grade) return null;
  // Exemples (ADR 0184) : le vrai barème, avec une progression fictive.
  if (examplesActive()) return exampleGradeView(grade);
  return {
    xp: grade.xp,
    level: grade.level,
    levels: grade.levels.map((l) => ({
      level: l.level,
      xpMin: l.xp_min,
      reward: l.reward,
      rewardDetail: l.reward_detail,
    })),
    objectives: grade.objectives,
    badges: grade.badges,
    claimedLevels: grade.claims.map((c) => c.level),
  };
}

/** Écran « Nouveau badge débloqué » montré : les badges obtenus ne le déclenchent plus. */
export async function markBadgesSeen(): Promise<void> {
  await supabase.rpc("artisan_mark_badges_seen");
}

/** Adresse de l'entreprise et téléphone du compte, pour pré-remplir la livraison (RLS). */
export async function loadDeliveryDefaults(): Promise<{
  firstName: string | null;
  address: string;
  city: string;
  phone: string;
}> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id ?? "";
  const [{ data: artisan }, { data: profile }] = await Promise.all([
    supabase
      .from("artisans")
      .select("adresse_ligne, adresse_code_postal, adresse_commune")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("first_name, phone").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    firstName: profile?.first_name ?? null,
    address: artisan?.adresse_ligne ?? "",
    city: [artisan?.adresse_code_postal, artisan?.adresse_commune].filter(Boolean).join(" "),
    phone: profile?.phone ?? "",
  };
}

/** « Recevoir ma récompense » : demande transmise à l'équipe (artisan_claim_reward). */
export async function claimReward(level: number, input: RewardClaim): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_claim_reward", {
    p_level: level,
    p_jacket_size: input.jacket_size,
    p_pants_size: input.pants_size,
    p_address: input.address,
    p_city: input.city,
    p_country: input.country,
    p_phone: input.phone,
  });
  if (!error) return null;
  return error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;
}
