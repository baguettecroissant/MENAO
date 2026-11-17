import { exampleProfile, exampleSecretary } from "@menao/core";
import type { Metadata } from "next";
import { SecretaryView, type SecretaryViewName } from "@/components/pro/secretary-view";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.secretaryPage.title} — MENAO` };

/**
 * Secrétaire d'exemple (ADR 0364) : un appel urgent à rappeler, un rendez-vous pris, l'historique
 * et les réglages. Rien n'est enregistré, les boutons sont inactifs.
 */
export default async function ExampleSecretaryPage({
  searchParams,
}: PageProps<"/pro/decouvrir/secretaire">) {
  const { vue } = await searchParams;
  const view: SecretaryViewName =
    vue === "traites" ? "traites" : vue === "reglages" ? "reglages" : "a-traiter";
  await requireExampleViewer();
  const example = exampleSecretary();
  const company = exampleProfile(null).company_name;
  return (
    <SecretaryView
      view={view}
      name={fr.pro.onboarding.plans.secretary.title}
      company={company}
      gauge={example.gauge}
      topUps={false}
      settings={example.settings}
      hours
      todo={example.todo}
      done={example.done}
      month={example.month}
      base={EXAMPLES_BASE}
      example
    />
  );
}
