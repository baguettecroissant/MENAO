import "server-only";
import {
  ANNUAL_FREE_MONTHS,
  ENGAGEMENT_GUARANTEE,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  monthlyEquivalentCents,
  planComparison,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.pro.landing;
const k = fr.pro.assistant.knowledge;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const price = (cents: number) => euros.format(cents / 100);
const avantagesOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * Texte de référence de l'assistant des pages Pro (ADR 0218) : les textes publiés de la page Pro
 * (mêmes sources que la page), les formules et le comparatif lus en base. L'assistant ne répond
 * qu'à partir de ce texte : il suit le site sans copie à tenir à jour.
 */
export async function proAssistantKnowledge(): Promise<string> {
  const [{ data: plans }, { data: features }] = await Promise.all([
    createPublicClient()
      .from("plans")
      .select("code, nom, accroche, prix_mensuel_ht_centimes, avantages, ouverte")
      .order("ordre"),
    createPublicClient().from("plan_features").select("categorie, libelle, detail, valeurs, ordre"),
  ]);
  const planList = plans ?? [];
  const comparison = planComparison(
    features ?? [],
    planList.map((plan) => plan.code),
  );

  return [
    `# ${k.title}`,
    "",
    k.intro,
    "",
    `## ${k.presentation}`,
    t.teaser,
    t.hero.subtitle,
    ...t.hero.proofs.map((proof) => `- ${proof}`),
    "",
    `## ${k.steps}`,
    t.steps.subtitle,
    ...t.steps.items.map((step) => `- ${step.title} : ${step.text}`),
    "",
    `## ${k.features}`,
    `- ${t.features.voice.title} ${t.features.voice.text} ${t.features.voice.promise}`,
    `- ${t.features.request.title} ${t.features.request.text}`,
    ...t.features.items.map((item) => `- ${item.title} : ${item.text}`),
    "",
    `## ${k.commission}`,
    t.commission.text,
    ...t.commission.bullets.map((bullet) => `- ${bullet}`),
    t.commission.calculator.note,
    "",
    `## ${k.fairness}`,
    t.fairness.subtitle,
    ...t.fairness.items.map((item) => `- ${item.title} : ${item.text}`),
    "",
    `## ${k.plans}`,
    t.plansSubtitle,
    ...planList.flatMap((plan) => [
      `### ${plan.nom}`,
      plan.accroche,
      k.planPrice(
        plan.nom,
        price(plan.prix_mensuel_ht_centimes),
        price(monthlyEquivalentCents(annualPriceCents(plan.prix_mensuel_ht_centimes))),
      ),
      ...(plan.ouverte ? [] : [k.planSoon]),
      ...avantagesOf(plan.avantages).map((avantage) => `- ${avantage}`),
    ]),
    `- ${t.engagement.monthly.title} : ${t.engagement.monthly.text}`,
    `- ${t.engagement.yearly.title} : ${t.engagement.yearly.text(ENGAGEMENT_MONTHS, ANNUAL_FREE_MONTHS)}`,
    `- ${t.engagement.guarantee.title} : ${t.engagement.guarantee.text(
      ENGAGEMENT_GUARANTEE.minRequests,
      ENGAGEMENT_GUARANTEE.consecutiveMonths,
    )}`,
    t.plansNote,
    ...(comparison.length
      ? [
          "",
          `## ${k.compare}`,
          ...comparison.flatMap((group) => [
            `### ${group.categorie}`,
            ...group.items.map(
              (item) =>
                `- ${item.libelle}${item.detail ? ` (${item.detail})` : ""} : ${item.cells
                  .map((cell, i) => {
                    const value =
                      cell.kind === "inclus"
                        ? k.included
                        : cell.kind === "absent"
                          ? k.notIncluded
                          : cell.text;
                    return `${planList[i]?.nom ?? ""} ${value}`;
                  })
                  .join(", ")}`,
            ),
          ]),
        ]
      : []),
    "",
    `## ${k.faq}`,
    ...t.faq.flatMap((item) => [`### ${item.q}`, item.a]),
  ].join("\n");
}
