import type { ReceptionDocumentModel } from "@menao/documents";
import { Check } from "lucide-react";
import { DocumentLogo } from "@/components/document-logo";

/** Le PV de réception en HTML, issu du même modèle que le PDF (maquette « Signature du PV »). */
export function ReceptionPaper({
  model,
  label,
  logoUrl = null,
}: {
  model: ReceptionDocumentModel;
  label: string;
  /** Logo de l'entreprise (URL signée), s'il y en a un. */
  logoUrl?: string | null;
}) {
  const last = model.financial.length - 1;
  return (
    <figure className="w-full overflow-hidden rounded-chip border border-border bg-surface shadow-card">
      <figcaption className="sr-only">{label}</figcaption>
      <div className="@container flex flex-col gap-3 p-5 text-xs leading-snug sm:p-6">
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
            <p className="text-base font-semibold text-primary">{model.title}</p>
            <p>{model.numberLine}</p>
            <p>{model.dateLine}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-semibold">{model.partiesTitle}</p>
          {model.parties.map(([labelText, text]) => (
            <p key={labelText}>
              <span className="font-medium">{labelText} :</span> {text}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">{model.siteTitle}</p>
          {model.siteLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {model.references.map((line) => (
            <p key={line} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">{model.natureTitle}</p>
          <p>{model.nature}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{model.receptionTitle}</p>
          <ul className="flex flex-col gap-1">
            {model.choices.map((choice) => (
              <li key={choice.label} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`flex size-3.5 items-center justify-center rounded-[3px] border ${choice.checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong"}`}
                >
                  {choice.checked && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className={choice.checked ? "font-medium" : "text-muted-foreground"}>
                  {choice.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">{model.observationsTitle}</p>
          {model.observations.map((line, i) => (
            <p key={i} className="whitespace-pre-line">
              {line}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{model.financialTitle}</p>
          <table className="w-full border-collapse overflow-hidden rounded-chip border border-border">
            <tbody>
              {model.financial.map(([labelText, value], i) => (
                <tr
                  key={labelText}
                  className={
                    i === last
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "border-b border-border"
                  }
                >
                  <th
                    scope="row"
                    className={`px-2 py-1.5 text-left ${i === last ? "font-semibold" : "font-normal"}`}
                  >
                    {labelText}
                  </th>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground">{model.insuranceLine}</p>
        <p>{model.placeLine}</p>
        <div className="ml-auto flex h-20 w-full max-w-60 flex-col rounded-chip border border-border p-2">
          <p className="font-medium">{model.signatureLabel}</p>
        </div>
      </div>
    </figure>
  );
}
