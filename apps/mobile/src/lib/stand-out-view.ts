import { experienceYearsOf, parisToday, standOut, type DiplomeMetier } from "@menao/core";
import { fr } from "@/i18n/fr";

/**
 * Bloc « Pour vous démarquer » de l'écran du dossier (lot 81, ADR 0391), comme sur le site :
 * les points viennent de `standOut` (packages/core), l'aperçu de la fiche de ce qui est rempli.
 */
export type StandOutView = {
  summary: ReturnType<typeof standOut>;
  photoCount: number;
  certificationCount: number;
  budgetLabel: string | null;
  preview: {
    name: string;
    subtitle: string;
    imageUrl: string | null;
    diplomaLabel: string | null;
    certificationLabel: string | null;
    specialitesCount: number;
    photoUrls: string[];
    presentation: string | null;
  };
};

type CertificationType = keyof typeof fr.proTrades.certTypes;
type BudgetMinimum = keyof typeof fr.proTrades.budgetMinimumOptions;

export function standOutView(
  input: {
    avatarPath: string | null;
    photoPaths: string[];
    diploma: DiplomeMetier | null;
    experienceYears: number | null;
    dateCreation: string | null;
    workTypeCount: number;
    certificationTypes: string[];
    rge: boolean;
    budgetMinimum: string | null;
    name: string;
    tradeLabels: string[];
    city: string | null;
    presentation: string;
  },
  urlOf: (bucket: "avatars" | "portfolio", path: string) => string,
  today: string = parisToday(),
): StandOutView {
  const summary = standOut({
    hasAvatar: input.avatarPath !== null,
    photoCount: input.photoPaths.length,
    diploma: input.diploma !== null,
    experienceYears: experienceYearsOf(input.experienceYears, input.dateCreation, today),
    workTypeCount: input.workTypeCount,
    certificationCount: input.certificationTypes.length,
    rge: input.rge,
  });
  const firstCertification = input.certificationTypes[0] as CertificationType | undefined;
  return {
    summary,
    photoCount: input.photoPaths.length,
    certificationCount: input.certificationTypes.length,
    budgetLabel: input.budgetMinimum
      ? (fr.proTrades.budgetMinimumOptions[input.budgetMinimum as BudgetMinimum] ?? null)
      : null,
    preview: {
      name: input.name,
      subtitle: [input.tradeLabels.slice(0, 2).join(", "), input.city].filter(Boolean).join(" · "),
      imageUrl: input.avatarPath ? urlOf("avatars", input.avatarPath) : null,
      diplomaLabel: input.diploma ? fr.diplomesMetier[input.diploma] : null,
      certificationLabel: firstCertification
        ? (fr.proTrades.certTypes[firstCertification] ?? null)
        : input.rge
          ? fr.proTrades.certTypes.rge
          : null,
      specialitesCount: input.workTypeCount,
      photoUrls: input.photoPaths.slice(0, 3).map((path) => urlOf("portfolio", path)),
      presentation: input.presentation.trim() || null,
    },
  };
}
