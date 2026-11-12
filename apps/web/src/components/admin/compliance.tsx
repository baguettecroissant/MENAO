import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminSectionHeader } from "@/components/admin/admin-tabs";
import { SummaryTile, SummaryTiles } from "@/components/admin/money";
import { ShowMoreTable } from "@/components/admin/show-more";
import { fr } from "@/i18n/fr";

const t = fr.admin.tabs.compliance;
const w = fr.admin.watch;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" });

export type ComplianceCounts = {
  renewals: number;
  expiring: number;
  expired: number;
  spotChecks: number;
  spotChecksLeft: number;
};

/**
 * En-tête de la rubrique « Conformité » (ADR 0283) : titre, phrase, chiffres des trois onglets
 * (renouvellements, échéances, contrôles du mois), onglets avec leur compteur, phrase de l'onglet.
 */
export function ComplianceHeader({
  current,
  counts,
  lead,
}: {
  current: "renewals" | "expiring" | "spotChecks";
  counts: ComplianceCounts;
  lead?: ReactNode;
}) {
  return (
    <AdminSectionHeader
      set="compliance"
      current={current}
      intro={t.intro}
      counts={{
        renewals: counts.renewals,
        expiring: counts.expiring,
        spotChecks: counts.spotChecksLeft,
      }}
      figures={
        <SummaryTiles label={t.figuresLabel} columns={3}>
          <SummaryTile
            label={t.renewalsLabel}
            value={String(counts.renewals)}
            hint={t.renewalsHint}
            tone={counts.renewals > 0 ? "warning" : "default"}
          />
          <SummaryTile
            label={t.expiring}
            value={String(counts.expiring)}
            hint={t.expiringHint(counts.expired)}
            tone={counts.expired > 0 ? "danger" : "default"}
          />
          <SummaryTile
            label={t.spotChecksLabel}
            value={String(counts.spotChecksLeft)}
            hint={t.spotChecksHint(counts.spotChecks)}
          />
        </SummaryTiles>
      }
      lead={lead}
    />
  );
}

export type ComplianceRow = {
  key: string;
  artisanId: string;
  artisan: string;
  label: string;
  dateFin: string | null;
};

/** Liste d'une rubrique de conformité : artisan, document, fin de validité, échéance. */
export function ComplianceRowsTable({
  rows,
  empty,
  status,
}: {
  rows: ComplianceRow[];
  empty: string;
  status?: (row: ComplianceRow) => ReactNode;
}) {
  if (rows.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  // Par lots de 20 lignes (ADR 0146) : la page reste courte même avec beaucoup d'échéances.
  return (
    <ShowMoreTable
      head={
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="py-2 pr-4">
              {w.columns.artisan}
            </th>
            <th scope="col" className="py-2 pr-4">
              {w.columns.document}
            </th>
            <th scope="col" className="py-2 pr-4">
              {w.columns.date}
            </th>
            {status && (
              <th scope="col" className="py-2">
                {w.columns.status}
              </th>
            )}
          </tr>
        </thead>
      }
      rows={rows.map((row) => (
        <tr key={row.key} className="border-t border-border">
          <td className="py-3 pr-4">
            <Link
              href={`/admin/artisans/${row.artisanId}?onglet=verification#documents` as Route}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {row.artisan}
            </Link>
          </td>
          <td className="py-3 pr-4">{row.label}</td>
          <td className="py-3 pr-4">{row.dateFin ? day.format(new Date(row.dateFin)) : "—"}</td>
          {status && <td className="py-3">{status(row)}</td>}
        </tr>
      ))}
    />
  );
}

/** Nom affiché d'un artisan dans les listes de conformité. */
export const artisanName = (a: {
  raison_sociale: string | null;
  nom_commercial: string | null;
  id: string;
}) => a.nom_commercial ?? a.raison_sociale ?? a.id;
