import type { Database } from "@menao/db";
import { FileText } from "lucide-react";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { DetailBlock } from "./detail";

const t = fr.pro.quote.sent;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type SentQuote = Pick<
  Database["public"]["Tables"]["quotes"]["Row"],
  | "id"
  | "status"
  | "numero"
  | "total_ttc_cents"
  | "sent_at"
  | "valid_until"
  | "refusal_reason"
  | "client_message"
  | "signed_at"
>;

/** Dernier devis envoyé du chantier (F-21) : numéro, montant, réponse du client, PDF envoyé. */
export function SentQuoteBlock({ quote }: { quote: SentQuote }) {
  return (
    <DetailBlock
      icon={<FileText />}
      title={t.title}
      action={
        <a
          href={`/devis/${quote.id}/pdf`}
          target="_blank"
          rel="noopener"
          className="rounded-sm text-sm font-medium text-primary-strong underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          {quote.status === "signe" ? t.viewSigned : t.viewPdf}
          <span className="sr-only"> {t.newTab}</span>
        </a>
      }
    >
      {quote.numero && (
        <p className="font-medium">
          {t.summary(quote.numero, euros.format(quote.total_ttc_cents / 100))}
        </p>
      )}
      {quote.sent_at && quote.valid_until && (
        <p className="text-sm text-muted-foreground">
          {t.sentOn(formatDay(quote.sent_at), formatDay(quote.valid_until))}
        </p>
      )}
      {quote.status === "envoye" && <p className="text-sm">{t.waiting}</p>}
      {quote.status === "signe" && quote.signed_at && (
        <p className="text-sm font-medium text-success">{t.signed(formatDay(quote.signed_at))}</p>
      )}
      {quote.status === "revision_demandee" && <p className="text-sm font-medium">{t.revision}</p>}
      {quote.status === "refuse" && quote.refusal_reason && (
        <p className="text-sm font-medium">
          {t.refused(fr.pro.quote.refusalReasons[quote.refusal_reason])}
        </p>
      )}
      {quote.client_message &&
        (quote.status === "revision_demandee" || quote.status === "refuse") && (
          <blockquote className="rounded-input bg-background px-3 py-2 text-sm whitespace-pre-line">
            {quote.client_message}
          </blockquote>
        )}
    </DetailBlock>
  );
}
