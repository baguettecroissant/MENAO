import { dateLong, quotePdfData, type QuoteDocument } from "@menao/documents";
import { ArrowLeft, Check, Lock } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DepositPayButton } from "@/components/project/deposit-pay-button";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.clientQuote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = { title: `${t.deposit.title} — MENAO` };

/**
 * Paiement de l'acompte (F-31), maquettes « Paiement de l'acompte » : échéancier, bénéficiaire
 * (l'entreprise de l'artisan), paiement Stripe sur le compte de l'artisan.
 */
export default async function DepositPage({ params }: PageProps<"/mon-espace/devis/[id]/acompte">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/devis/${id}/acompte` as Route);
  }
  const quoteHref = `/mon-espace/devis/${id}`;
  const [{ data: document }, { data: payment }] = await Promise.all([
    supabase.rpc("quote_document", { p_quote_id: id }),
    supabase
      .from("payments")
      .select("status")
      .eq("quote_id", id)
      .eq("kind", "acompte")
      .in("status", ["en_attente", "en_cours", "paye"])
      .maybeSingle(),
  ]);
  if (!document) notFound();
  const doc = document as unknown as QuoteDocument;
  if (doc.quote.status !== "signe" || payment?.status === "paye") redirect(quoteHref as Route);
  const data = quotePdfData(doc);
  const [deposit, balance] = data.schedule;
  const depositAmount = euros.format((deposit?.amountCents ?? 0) / 100);

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={quoteHref as Route}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.backToQuote}
        </Link>
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.deposit.title}</h1>
        <nav aria-label={t.signature.tabs.label} className="flex border-b border-border">
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 pb-3 text-center text-sm text-success">
            <Check aria-hidden="true" className="size-4" />
            {t.signature.tabs.sign}
          </span>
          <span
            aria-current="step"
            className="flex-1 border-b-2 border-primary pb-3 text-center text-sm font-medium text-primary-strong"
          >
            {t.signature.tabs.deposit}
          </span>
        </nav>
        <p className="text-sm text-muted-foreground">{t.deposit.intro}</p>

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
          {data.startDate && (
            <p className="text-sm text-muted-foreground">
              {t.deposit.start(dateLong(data.startDate))}
            </p>
          )}
          <dl className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-medium">{t.deposit.today}</dt>
              <dd className="text-xl font-medium text-primary">{depositAmount}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
              <dt>{t.deposit.later}</dt>
              <dd>{euros.format((balance?.amountCents ?? 0) / 100)}</dd>
            </div>
          </dl>
          <p className="text-sm">{t.deposit.beneficiary(data.issuer.name)}</p>
          <p className="text-xs text-muted-foreground">{t.deposit.methods}</p>
        </section>

        {payment?.status === "en_cours" ? (
          <Alert tone="info">{t.depositInProgress}</Alert>
        ) : (
          <DepositPayButton quoteId={id} amount={depositAmount} />
        )}
        <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" />
          {t.deposit.secure}
        </p>
      </div>
    </main>
  );
}
