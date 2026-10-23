import { REQUIRED_DOCUMENT_TYPES, type RequiredDocumentType } from "@menao/core";
import { CircleCheck } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { DocumentReview } from "./review-forms";

const t = fr.admin.detail;
const docT = fr.pro.onboarding.documents;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export type AdminDocument = {
  id: string;
  type: string;
  storage_path: string;
  mime_type: string;
  status: string;
  created_at: string;
  date_emission: string | null;
  date_fin: string | null;
  numero: string | null;
  assureur: string | null;
  couverture: string | null;
  covered_trades: string[] | null;
  refusal_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
};

export type CompanyReference = {
  name: string | null;
  siret: string | null;
  signer: string | null;
  address: string | null;
};

const statusLabel = (status: string) =>
  status === "remplace"
    ? t.docReplaced
    : (docT.statuses[status as keyof typeof docT.statuses] ?? status);

/**
 * Documents du dossier dans le back-office (ADR 0120) : chaque document à vérifier côte à côte
 * avec ce que l'artisan a saisi, la fiche de l'entreprise et les points à contrôler ; motifs de
 * refus en liste ; versions précédentes et auteur de chaque décision.
 */
export function DocumentsSection({
  documents,
  urlByPath,
  reviewable,
  artisanId,
  decennaleExempt,
  company,
  declaredTrades,
  tradeLabel,
  reviewerName,
}: {
  documents: AdminDocument[];
  urlByPath: Map<string | null, string | null>;
  reviewable: boolean;
  artisanId: string;
  decennaleExempt: boolean;
  company: CompanyReference;
  declaredTrades: string[];
  tradeLabel: (code: string) => string;
  reviewerName: (userId: string | null) => string | null;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {REQUIRED_DOCUMENT_TYPES.map((type) => {
        const rows = documents
          .filter((d) => d.type === type)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const newest = rows[0];
        // En cours : documents à vérifier, document validé en vigueur, dernier dépôt refusé.
        const current = rows.filter(
          (d) =>
            d.status === "en_attente" ||
            d.status === "valide" ||
            (d === newest && d.status === "refuse"),
        );
        const history = rows.filter((d) => !current.includes(d));
        return (
          <li
            key={type}
            aria-label={docT.types[type]}
            className="flex flex-col gap-3 rounded-input border border-border p-3"
          >
            <span className="font-medium">{docT.types[type]}</span>
            {type === "decennale" && decennaleExempt && (
              <p className="text-sm font-medium text-warning">{t.decennaleExempt}</p>
            )}
            {current.length === 0 && <span className="text-sm">{t.docMissing}</span>}
            {current.map((d) =>
              reviewable && d.status === "en_attente" ? (
                <SideBySide
                  key={d.id}
                  type={type}
                  doc={d}
                  url={urlByPath.get(d.storage_path) ?? null}
                  artisanId={artisanId}
                  company={company}
                  coverage={
                    type === "decennale" && d.covered_trades ? (
                      <CoveredTrades
                        covered={d.covered_trades}
                        declared={declaredTrades}
                        labelOf={tradeLabel}
                      />
                    ) : null
                  }
                />
              ) : (
                <CompactRow
                  key={d.id}
                  doc={d}
                  url={urlByPath.get(d.storage_path) ?? null}
                  reviewer={reviewerName(d.verified_by)}
                  coverage={
                    type === "decennale" && d.covered_trades ? (
                      <CoveredTrades
                        covered={d.covered_trades}
                        declared={declaredTrades}
                        labelOf={tradeLabel}
                      />
                    ) : null
                  }
                />
              ),
            )}
            {history.length > 0 && (
              <details className="text-sm">
                <summary className="min-h-touch cursor-pointer font-medium text-primary-strong">
                  {t.docHistory(history.length)}
                </summary>
                <ul className="mt-2 flex flex-col gap-3 border-l-2 border-border pl-3">
                  {history.map((d) => (
                    <li key={d.id}>
                      <CompactRow
                        doc={d}
                        url={urlByPath.get(d.storage_path) ?? null}
                        reviewer={reviewerName(d.verified_by)}
                        coverage={null}
                      />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Valeurs saisies par l'artisan, selon le type de document. */
function enteredValues(type: RequiredDocumentType, d: AdminDocument): [string, string][] {
  const date = (v: string | null) => (v ? day.format(new Date(v)) : null);
  const rows: [string, string | null][] =
    type === "kbis"
      ? [[t.docEmission, date(d.date_emission)]]
      : type === "urssaf"
        ? [
            [t.docEmission, date(d.date_emission)],
            [t.docSecurityCode, d.numero],
            [t.docEnd, date(d.date_fin)],
          ]
        : type === "identite"
          ? [[t.docEnd, date(d.date_fin)]]
          : [
              [t.docInsurer, d.assureur],
              [t.docNumber, d.numero],
              [t.docEnd, date(d.date_fin)],
              [t.docCoverage, d.couverture],
            ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

function SideBySide({
  type,
  doc,
  url,
  artisanId,
  company,
  coverage,
}: {
  type: RequiredDocumentType;
  doc: AdminDocument;
  url: string | null;
  artisanId: string;
  company: CompanyReference;
  coverage: ReactNode;
}) {
  const entered = enteredValues(type, doc);
  const reference: [string, string | null][] = [
    [t.docCompanyName, company.name],
    [t.docCompanySiret, company.siret],
    [t.docCompanySigner, company.signer],
    [t.docCompanyAddress, company.address],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DocumentPreview url={url} mime={doc.mime_type} label={docT.types[type]} />
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-sm">
          <span className="font-medium">{statusLabel(doc.status)}</span>
          {" · "}
          <span className="text-muted-foreground">
            {t.docDeposited(dateTime.format(new Date(doc.created_at)))}
          </span>
        </p>
        <Facts title={t.docEntered} rows={entered} />
        {coverage}
        <Facts
          title={t.docCompany}
          rows={reference.filter((r): r is [string, string] => Boolean(r[1]))}
        />
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">{t.docChecks}</h4>
          <ul className="flex flex-col gap-1.5 text-sm">
            {t.checks[type].map((check) => (
              <li key={check} className="flex items-start gap-2">
                <CircleCheck
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                {check}
              </li>
            ))}
          </ul>
        </div>
        <DocumentReview documentId={doc.id} artisanId={artisanId} />
      </div>
    </div>
  );
}

function Facts({ title, rows }: { title: string; rows: [string, string][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Aperçu du document : photo affichée, PDF intégré (CSP du back-office), sinon lien. */
function DocumentPreview({
  url,
  mime,
  label,
}: {
  url: string | null;
  mime: string;
  label: string;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div className="overflow-hidden rounded-input border border-border bg-background">
        {url && mime.startsWith("image/") ? (
          <Image
            src={url}
            alt={t.docPreview(label)}
            width={900}
            height={1200}
            unoptimized
            className="h-auto max-h-[36rem] w-full object-contain"
          />
        ) : url && mime === "application/pdf" ? (
          <iframe src={url} title={t.docPreview(label)} className="h-[36rem] w-full" />
        ) : (
          <p className="p-4 text-sm text-muted-foreground">{t.docNoPreview}</p>
        )}
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="self-start text-sm font-medium text-primary underline"
        >
          {t.docOpen}
        </a>
      )}
    </figure>
  );
}

function CompactRow({
  doc,
  url,
  reviewer,
  coverage,
}: {
  doc: AdminDocument;
  url: string | null;
  reviewer: string | null;
  coverage: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        <span className="font-medium">{statusLabel(doc.status)}</span>
        {" · "}
        <span className="text-muted-foreground">
          {[
            t.docDeposited(dateTime.format(new Date(doc.created_at))),
            doc.assureur,
            doc.numero,
            doc.couverture,
            doc.date_emission && docT.issuedOn(day.format(new Date(doc.date_emission))),
            doc.date_fin && docT.validUntil(day.format(new Date(doc.date_fin))),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {url && (
          <>
            {" "}
            ·{" "}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline"
            >
              {docT.view}
            </a>
          </>
        )}
      </p>
      {doc.verified_at && (
        <p className="text-xs text-muted-foreground">
          {t.docDecidedBy(dateTime.format(new Date(doc.verified_at)), reviewer)}
        </p>
      )}
      {coverage}
      {doc.refusal_reason && (
        <p className="text-sm text-danger">{docT.refusedBecause(doc.refusal_reason)}</p>
      )}
    </div>
  );
}

/** Décennale : métiers couverts selon l'artisan, et métiers déclarés non couverts (ADR 0116). */
function CoveredTrades({
  covered,
  declared,
  labelOf,
}: {
  covered: string[];
  declared: string[];
  labelOf: (code: string) => string;
}) {
  const uncovered = declared.filter((code) => !covered.includes(code));
  return (
    <>
      {covered.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t.coverage(covered.map(labelOf).join(", "))}
        </p>
      )}
      {uncovered.length > 0 && (
        <p className="text-sm font-medium text-warning">
          {t.uncovered(uncovered.map(labelOf).join(", "))}
        </p>
      )}
    </>
  );
}
