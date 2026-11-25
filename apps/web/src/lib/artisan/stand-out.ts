import "server-only";
import { experienceYearsOf, parisToday, standOut } from "@menao/core";
import type { StandOutCardProps } from "@/components/pro/stand-out-card";
import { fr } from "@/i18n/fr";
import type { OnboardingContext } from "./context";

/**
 * Données du bloc « Pour vous démarquer » (lot 81, ADR 0391) : les faits de la fiche, les points
 * calculés par `standOut` (packages/core) et l'aperçu de la fiche (images publiques).
 */
export async function standOutProps(context: OnboardingContext): Promise<StandOutCardProps> {
  const { supabase, artisan, avatarPath, photos, tradeCodes, workTypeCodes, certifications } =
    context;
  const today = parisToday();
  const [trades, rge] = await Promise.all([
    supabase
      .from("trades")
      .select("label")
      .in("code", tradeCodes.length ? tradeCodes : ["-"])
      .order("sort_order"),
    // Qualification RGE trouvée à l'annuaire avec le SIRET (ADR 0118), comptée par le Score.
    supabase
      .from("artisan_rge_qualifications")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisan.id)
      .gte("date_fin", today),
  ]);
  const hasRge = (rge.count ?? 0) > 0;
  const summary = standOut({
    hasAvatar: avatarPath !== null,
    photoCount: photos.length,
    diploma: artisan.diplome_metier !== null,
    experienceYears: experienceYearsOf(
      artisan.experience_years,
      artisan.date_creation_entreprise,
      today,
    ),
    workTypeCount: workTypeCodes.length,
    certificationCount: certifications.length,
    rge: hasRge,
  });
  const publicUrl = (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const tradeLabels = (trades.data ?? []).map((trade) => trade.label);
  const firstCertification = certifications[0];
  return {
    summary,
    photoCount: photos.length,
    certificationCount: certifications.length,
    budgetLabel: artisan.budget_minimum
      ? (fr.pro.onboarding.trades.budgetMinimumOptions[
          artisan.budget_minimum as keyof typeof fr.pro.onboarding.trades.budgetMinimumOptions
        ] ?? null)
      : null,
    preview: {
      name: artisan.nom_commercial ?? artisan.raison_sociale ?? "",
      subtitle: [tradeLabels.slice(0, 2).join(", "), artisan.adresse_commune]
        .filter(Boolean)
        .join(" · "),
      imageUrl: avatarPath ? publicUrl("avatars", avatarPath) : null,
      diplomaLabel: artisan.diplome_metier ? fr.diplomesMetier[artisan.diplome_metier] : null,
      certificationLabel: firstCertification
        ? fr.certificationTypes[firstCertification.type]
        : hasRge
          ? fr.certificationTypes.rge
          : null,
      specialitesCount: workTypeCodes.length,
      photoUrls: photos.slice(0, 3).map((photo) => publicUrl("portfolio", photo.storage_path)),
      presentation: artisan.presentation?.trim() || null,
    },
  };
}
