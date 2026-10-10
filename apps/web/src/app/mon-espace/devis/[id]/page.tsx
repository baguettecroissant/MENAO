import { quoteDocumentModel, quotePdfData, type QuoteDocument } from "@menao/documents";
import { ArrowLeft, Eye } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuoteResponse } from "@/components/project/quote-response";
import { QuotePaper } from "@/components/pro/quote-paper";
import { Alert, StatusBadge, TextLink, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const t = fr.clientQuote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const tone = {
  brouillon: "neutral",
  envoye: "primary",
  signe: "success",
  refuse: "danger",
  revision_demandee: "warning",
  remplace: "neutral",
} as const;

export const metadata: Metadata = { title: `${t.titleFallback} — MENAO` };

/**
 * Devis reçu par le client (F-21) : contenu figé à l'envoi, PDF, puis demande de modification ou
 * refus. quote_document ne renvoie rien aux autres comptes.
 */
export default async function ClientQuotePage({ params }: PageProps<"/mon-espace/devis/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous)
    redirect(`/connexion?next=/mon-espace/devis/${id}` as Route);

  const [{ data: document }, { data: quote }] = await Promise.all([
    supabase.rpc("quote_document", { p_quote_id: id }),
    supabase
      .from("quotes")
      .select("id, status, valid_until, client_message")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!document || !quote || quote.status === "brouillon") notFound();
  const data = quotePdfData(document as unknown as QuoteDocument);
  const { data: newer } =
    quote.status === "remplace"
      ? await supabase
          .from("quotes")
          .select("id")
          .eq("supersedes_id", id)
          .neq("status", "brouillon")
          .maybeSingle()
      : { data: null };
  const artisan = data.issuer.tradeName ?? data.issuer.name;

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/mon-espace"
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {artisan ? t.title(artisan) : t.titleFallback}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={tone[quote.status]}>{t.statuses[quote.status]}</StatusBadge>
            {quote.status === "envoye" && quote.valid_until && (
              <span className="text-sm text-muted-foreground">
                {t.validUntil(formatDay(quote.valid_until))}
              </span>
            )}
          </div>
        </div>
        {quote.status === "revision_demandee" && (
          <Alert tone="info">
            {t.revisionNotice} {quote.client_message}
          </Alert>
        )}
        {quote.status === "refuse" && <Alert tone="info">{t.refusedNotice}</Alert>}
        {quote.status === "remplace" && (
          <Alert tone="info">
            {t.replacedNotice}{" "}
            {newer && (
              <TextLink href={`/mon-espace/devis/${newer.id}` as Route}>{t.seeNewVersion}</TextLink>
            )}
          </Alert>
        )}
        <QuotePaper model={quoteDocumentModel(data)} label={t.document} clipped={false} />
        <a
          href={`/devis/${id}/pdf`}
          target="_blank"
          rel="noopener"
          className={`${buttonClasses({ variant: "outline", block: false })} self-start`}
        >
          <Eye aria-hidden="true" className="size-4" />
          {t.viewPdf}
          <span className="sr-only"> {t.newTab}</span>
        </a>
        {quote.status === "envoye" && <QuoteResponse quoteId={id} />}
      </div>
    </main>
  );
}
