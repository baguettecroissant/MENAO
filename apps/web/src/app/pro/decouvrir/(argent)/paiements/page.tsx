import { DEFAULT_DEPOSIT_PERCENT, DEFAULT_START_PERCENT } from "@menao/core";
import type { Metadata } from "next";
import { PaymentDefaultsForm } from "@/components/pro/payment-defaults-form";
import { fr } from "@/i18n/fr";
import { requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.pro.payments;

export const metadata: Metadata = { title: t.metaTitle };

/**
 * « Mes paiements » d'exemple (ADR 0364) : l'échéancier se règle et l'exemple chiffré suit, mais
 * rien ne s'enregistre.
 */
export default async function ExamplePaymentsPage() {
  await requireExampleViewer();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 pb-10 sm:px-6">
      <h2 className="text-2xl font-bold">{t.title}</h2>
      <PaymentDefaultsForm
        deposit={DEFAULT_DEPOSIT_PERCENT}
        start={DEFAULT_START_PERCENT}
        example
      />
    </main>
  );
}
