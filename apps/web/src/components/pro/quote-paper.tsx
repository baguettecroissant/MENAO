import { QUOTE_TEXTS, type QuoteDocumentModel } from "@menao/documents";
import { DocumentLogo } from "@/components/document-logo";

const t = QUOTE_TEXTS;

/**
 * Le devis en HTML, issu du même modèle que le PDF. Miniature (maquette « Aperçu du devis ») :
 * coupée en bas, le document complet s'ouvre avec « Voir le PDF ». Sinon, en entier.
 */
export function QuotePaper({
  model,
  label,
  clipped = true,
  logoUrl = null,
}: {
  model: QuoteDocumentModel;
  label: string;
  clipped?: boolean;
  /** Logo de l'entreprise (URL signée), s'il y en a un. */
  logoUrl?: string | null;
}) {
  const last = model.totals.length - 1;
  return (
    <figure
      className={`relative w-full overflow-hidden rounded-chip border border-border bg-surface shadow-card ${clipped ? "max-w-md" : "max-w-2xl"}`}
    >
      <figcaption className="sr-only">{label}</figcaption>
      <div
        className={`@container flex flex-col gap-3 p-5 leading-snug ${clipped ? "max-h-[38rem] overflow-hidden text-[0.6875rem]" : "text-xs sm:p-8 sm:text-[0.8125rem]"}`}
      >
        {/* Étroit : titre et références au-dessus de l'artisan ; sinon côte à côte, comme le PDF. */}
        <div className="flex flex-col gap-2 @sm:flex-row @sm:items-start @sm:justify-between @sm:gap-4">
          <div className="min-w-0">
            <DocumentLogo url={logoUrl} name={model.issuerName} />
            <p className="text-[0.8125rem] font-semibold">{model.issuerName}</p>
            {model.issuerLines.map((line, i) => (
              <p key={i} className="text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
          <div className="order-first @sm:order-none @sm:shrink-0 @sm:text-right">
            <p className="text-lg font-semibold text-primary">{model.title}</p>
            <p>{model.numberLine}</p>
            <p>{model.dateLine}</p>
            <p className="text-muted-foreground">{model.validityLine}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-chip bg-primary-softer p-3">
          <div>
            <p className="font-medium text-muted-foreground">{t.client}</p>
            {model.clientLines.map((line, i) => (
              <p key={i} className={i === 0 ? "font-medium" : undefined}>
                {line}
              </p>
            ))}
          </div>
          <div>
            <p className="font-medium text-muted-foreground">{t.site}</p>
            {model.siteLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold">{model.subjectLine}</p>
          <p className="text-muted-foreground">{model.insuranceLine}</p>
          <p className="text-muted-foreground">{model.datesLine}</p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-primary-softer text-left text-muted-foreground">
              <th scope="col" className="px-2 py-1 font-medium">
                {t.columns.designation}
              </th>
              <th scope="col" className="px-2 py-1 text-right font-medium">
                {t.columns.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="px-2 py-1.5">
                  <p className="font-medium">{row.designation}</p>
                  {row.description && <p className="text-muted-foreground">{row.description}</p>}
                  <p className="text-muted-foreground">
                    {row.quantity} {row.unit} × {row.unitPrice}
                    {!model.vatExempt && ` · ${t.columns.vat} ${row.vat}`}
                  </p>
                </td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto flex w-3/5 flex-col gap-0.5">
          {model.totals.map(([name, value], i) => (
            <div
              key={name}
              className={`flex justify-between gap-3 px-2 ${
                i === last ? "rounded-chip bg-primary-softer py-1 font-semibold" : ""
              }`}
            >
              <dt>{name}</dt>
              <dd className="whitespace-nowrap">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="font-semibold">{t.scheduleTitle}</p>
          {model.scheduleLines.map((line, i) => (
            <p key={i}>• {line}</p>
          ))}
          {model.scheduleNote && <p>{model.scheduleNote}</p>}
        </div>
        <div className="text-muted-foreground">
          {model.mentions.map((mention, i) => (
            <p key={i}>{mention}</p>
          ))}
        </div>
      </div>
      {clipped && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent"
        />
      )}
    </figure>
  );
}
