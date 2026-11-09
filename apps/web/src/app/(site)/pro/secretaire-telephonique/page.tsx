import type { Metadata } from "next";
import { FeaturePage } from "@/components/pro-landing/feature-page";
import { fr } from "@/i18n/fr";

const text = fr.pro.landing.featurePages.pages["secretaire-telephonique"];

export const metadata: Metadata = {
  title: `${text.metaTitle} — MENAO`,
  description: text.metaDescription,
  alternates: { canonical: "/pro/secretaire-telephonique" },
};

// Formules lues en base (comparatif), page régénérée toutes les heures (ADR 0267).
export const revalidate = 3600;

/** Page par fonction de l'Espace Pro (lot 21, ADR 0267). */
export default function Page() {
  return <FeaturePage slug="secretaire-telephonique" />;
}
