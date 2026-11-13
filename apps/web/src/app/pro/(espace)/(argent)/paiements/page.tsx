import { DEFAULT_DEPOSIT_PERCENT, DEFAULT_START_PERCENT } from "@menao/core";
import type { Metadata } from "next";
import { PaymentDefaultsForm } from "@/components/pro/payment-defaults-form";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.payments;

export const metadata: Metadata = { title: t.metaTitle };

/**
 * Argent › « Mes paiements » (F-146, maquette lot 40) : échéancier par défaut proposé à chaque
 * devis. Patron et chef d'équipe, comme l'envoi des devis (ADR 0241).
 * TODO(legal) : délai de rétractation hors établissement et paiements avant sa fin (L221-10,
 * L221-25), à faire confirmer par l'avocat (ADR 0301).
 */
export default async function PaymentsPage() {
  const { supabase, artisanId } = await requireTeamPermission("money");
  const { data } = await supabase
    .from("artisans")
    .select("default_deposit_percent, default_start_percent")
    .eq("id", artisanId)
    .single();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 pb-10 sm:px-6">
      <h2 className="text-2xl font-bold">{t.title}</h2>
      <PaymentDefaultsForm
        deposit={data?.default_deposit_percent ?? DEFAULT_DEPOSIT_PERCENT}
        start={data?.default_start_percent ?? DEFAULT_START_PERCENT}
      />
    </main>
  );
}
