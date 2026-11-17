import { exampleMoneyOverview } from "@menao/core";
import type { Metadata } from "next";
import { MoneyOverviewView } from "@/components/pro/money-overview-view";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.moneyOverview.title} — MENAO` };

/**
 * Suivi d'exemple (ADR 0364) : le mois en cours comparé au précédent, un solde en retard déjà
 * relancé, un acompte récent et un paiement reçu sans facture.
 */
export default async function ExampleMoneyOverviewPage() {
  await requireExampleViewer();
  const now = new Date();
  return (
    <MoneyOverviewView
      overview={exampleMoneyOverview(now)}
      now={now}
      base={EXAMPLES_BASE}
      example
    />
  );
}
