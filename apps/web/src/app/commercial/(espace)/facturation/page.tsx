import { suggestedInvoicePrefix } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { BillingForm, type BillingValues } from "@/components/commercial/gains/billing-form";
import { DocumentUpload } from "@/components/commercial/field/document-upload";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDay } from "@/lib/format";

const t = fr.commercialGains.billing;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Informations de facturation du conseiller (F-197, lot 86, ADR 0397), depuis « Bien démarrer » :
 * elles servent à préparer sa facture chaque mois. Le RIB déposé reste à côté.
 */
export default async function CommercialBillingPage() {
  const space = await getCommercialSpace("/commercial/facturation");
  const live = space.active && !space.demo;
  const [{ data: billing }, { data: onboarding }, { data: issued }] = live
    ? await Promise.all([
        space.supabase.from("commercial_billing").select("*").maybeSingle(),
        space.supabase.from("commercial_onboarding").select("rib_depose_le").maybeSingle(),
        space.supabase
          .from("commercial_invoices")
          .select("id")
          .eq("mode", "preparee")
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }, { data: null }];
  const name =
    [space.account.firstName, space.account.lastName].filter(Boolean).join(" ").trim() ||
    space.commercial?.nom ||
    "";
  const initial: BillingValues = billing
    ? {
        name: billing.legal_name,
        siret: billing.siret,
        address: billing.address,
        vatMode: billing.vat_mode === "assujetti" ? "assujetti" : "franchise",
        vatNumber: billing.vat_number ?? "",
        iban: billing.iban,
        prefix: billing.invoice_prefix,
        number: billing.next_number,
      }
    : {
        name,
        siret: "",
        address: "",
        vatMode: "franchise",
        vatNumber: "",
        iban: "",
        prefix: suggestedInvoicePrefix(name, new Date().getFullYear()),
        number: 1,
      };

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/commercial/demarrer" as Route}
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight sm:text-[2rem]">
            {t.title}
          </h1>
          <p className="text-[0.9375rem] text-label">{t.intro}</p>
        </div>
        {!space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : (
          <>
            <BillingForm initial={initial} locked={Boolean(issued)} />
            <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="text-[0.90625rem]">{t.rib}</b>
                <span className="text-[0.78125rem] text-muted-foreground">
                  {onboarding?.rib_depose_le
                    ? t.ribDone(formatDay(onboarding.rib_depose_le))
                    : t.ribTodo}
                </span>
              </span>
              <DocumentUpload
                kind="rib"
                label={onboarding?.rib_depose_le ? t.ribReplace : t.ribAction}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
