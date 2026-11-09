import { fr } from "@/i18n/fr";

/**
 * Pages par fonction de l'Espace Pro (lot 21, ADR 0267) : adresse, lignes du comparatif reprises
 * de la table plan_features (par libellé, valeurs lues en base) et questions de la FAQ des artisans.
 */
export const PRO_FEATURES = [
  {
    slug: "logiciel-devis",
    included: [
      "Devis et factures illimités",
      "Dictée intelligente du devis",
      "Signature électronique du client",
      "Brouillon de devis prêt dès la demande",
      "Devis préparé en conversation avec Camille",
      "Devis pré-générés selon vos paramètres",
    ],
    faq: [
      "Comment fonctionne la dictée du devis ?",
      "Quelles informations figurent sur le devis ?",
      "Quel taux de TVA appliquer, et si je suis en franchise ?",
      "Comment mon client signe-t-il le devis, et combien de temps est-il valable ?",
    ],
  },
  {
    slug: "secretaire-telephonique",
    included: [
      "Camille, secrétaire au téléphone",
      "Minutes de voix incluses par mois",
      "Lignes de secrétaire",
      "Devis préparé en conversation avec Camille",
      "Rappels de rendez-vous à vos clients",
      "Recharges de minutes",
    ],
    faq: [],
  },
  {
    slug: "acompte-en-ligne",
    included: [
      "Acompte et solde payés en ligne",
      "Relances automatiques du client",
      "Échéancier en plusieurs tranches",
    ],
    faq: [
      "Comment fixer l'acompte demandé au client ?",
      "Quand l'acompte et le solde sont-ils payés ?",
      "Quand et comment ouvrir mon compte de paiement Stripe ?",
      "Où suivre mon argent, les frais Stripe et les remboursements ?",
    ],
  },
  {
    slug: "facturation",
    included: [
      "Devis et factures illimités",
      "Dépenses : tickets lus automatiquement",
      "Envoi automatique au comptable",
      "Marge réelle par chantier",
      "Devis et factures fournisseurs rattachés aux chantiers",
    ],
    faq: [
      "Les factures sont-elles faites automatiquement ?",
      "Comment suivre mes dépenses de chantier ?",
      "Puis-je envoyer mes factures et mes dépenses à mon comptable ?",
    ],
  },
] as const;

export type ProFeatureSlug = (typeof PRO_FEATURES)[number]["slug"];

export function proFeature(slug: ProFeatureSlug) {
  const config = PRO_FEATURES.find((feature) => feature.slug === slug)!;
  return { ...config, text: fr.pro.landing.featurePages.pages[slug] };
}

type FaqItem = { q: string; a: string };

/** Questions de la FAQ des artisans, retrouvées par leur intitulé. */
export function proFaqItems(questions: readonly string[]): FaqItem[] {
  const groups: readonly { items: readonly FaqItem[] }[] = fr.pro.faqPage.groups;
  const all: FaqItem[] = [...fr.pro.landing.faq, ...groups.flatMap((group) => group.items)];
  return questions
    .map((question) => all.find((item) => item.q === question))
    .filter((item): item is FaqItem => item !== undefined);
}
