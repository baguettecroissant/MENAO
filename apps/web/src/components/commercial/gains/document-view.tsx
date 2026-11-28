import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { PrintButton } from "@/app/pro/cartes-de-visite/print-button";
import { fr } from "@/i18n/fr";
import type { Statement } from "@/lib/commercial/gains";
import { InvoiceSheet, StatementSheet } from "./statement-document";

const t = fr.commercialGains.document;

/**
 * Relevé ou facture d'un conseiller au format A4, hors de la coque (comme le mémo, ADR 0347) :
 * imprimé ou enregistré en PDF depuis le navigateur. Partagé par l'espace et le back-office.
 */
export function DocumentView({
  statement,
  type,
  back,
}: {
  statement: Statement;
  type: "releve" | "facture";
  back: string;
}) {
  const showInvoice = type === "facture" && statement.invoice?.mode !== "deposee";
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 bg-background px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:bg-white print:p-0">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href={back as Route}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col items-start gap-1">
          <PrintButton label={t.print} />
          <p className="text-[0.8125rem] text-muted-foreground">{t.printHint}</p>
        </div>
      </div>
      {showInvoice ? (
        <InvoiceSheet statement={statement} />
      ) : (
        <StatementSheet statement={statement} />
      )}
    </main>
  );
}
