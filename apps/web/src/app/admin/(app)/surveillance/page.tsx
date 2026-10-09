import { MONITORED_DOCUMENT_TYPES, daysUntil, expiryStatus, expiryWatchLimit } from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";

const t = fr.admin.watch;
const docT = fr.pro.onboarding.documents;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" });

type Row = {
  key: string;
  artisanId: string;
  artisan: string;
  label: string;
  dateFin: string | null;
};

export default async function WatchPage() {
  const { supabase } = await requireAdmin();
  const limit = expiryWatchLimit();

  const [renewals, expiringDocs, expiringCerts] = await Promise.all([
    supabase
      .from("artisan_documents")
      .select("id, type, date_fin, artisans!inner(id, raison_sociale, nom_commercial, status)")
      .eq("status", "en_attente")
      .in("artisans.status", ["valide", "suspendu"])
      .order("created_at"),
    supabase
      .from("artisan_documents")
      .select("id, type, date_fin, artisans!inner(id, raison_sociale, nom_commercial)")
      .eq("status", "valide")
      .in("type", [...MONITORED_DOCUMENT_TYPES])
      .lte("date_fin", limit)
      .order("date_fin"),
    supabase
      .from("certifications")
      .select("id, type, date_fin, artisans!inner(id, raison_sociale, nom_commercial)")
      .lte("date_fin", limit)
      .order("date_fin"),
  ]);

  const name = (a: { raison_sociale: string | null; nom_commercial: string | null; id: string }) =>
    a.nom_commercial ?? a.raison_sociale ?? a.id;
  const renewalRows: Row[] = (renewals.data ?? []).map((d) => ({
    key: d.id,
    artisanId: d.artisans.id,
    artisan: name(d.artisans),
    label: docT.types[d.type as keyof typeof docT.types] ?? d.type,
    dateFin: d.date_fin,
  }));
  const expiringRows: Row[] = [
    ...(expiringDocs.data ?? []).map((d) => ({
      key: d.id,
      artisanId: d.artisans.id,
      artisan: name(d.artisans),
      label: docT.types[d.type as keyof typeof docT.types] ?? d.type,
      dateFin: d.date_fin,
    })),
    ...(expiringCerts.data ?? []).map((c) => ({
      key: c.id,
      artisanId: c.artisans.id,
      artisan: name(c.artisans),
      label: t.certification(fr.certificationTypes[c.type]),
      dateFin: c.date_fin,
    })),
  ].sort((a, b) => (a.dateFin ?? "").localeCompare(b.dateFin ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
      <Card>
        <section aria-label={t.renewals} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.renewals}</h2>
          <RowsTable rows={renewalRows} empty={t.noRenewals} />
        </section>
      </Card>
      <Card>
        <section aria-label={t.expiring} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.expiring}</h2>
          <RowsTable
            rows={expiringRows}
            empty={t.noExpiring}
            status={(row) => {
              if (!row.dateFin) return null;
              const s = expiryStatus(row.dateFin);
              const days = daysUntil(row.dateFin);
              if (s === "ok") return null;
              return (
                <span className={s === "bientot" ? "text-warning" : "font-medium text-danger"}>
                  {s === "expire" ? docT.expiry.expire : docT.expiry[s](days)}
                </span>
              );
            }}
          />
        </section>
      </Card>
    </div>
  );
}

function RowsTable({
  rows,
  empty,
  status,
}: {
  rows: Row[];
  empty: string;
  status?: (row: Row) => ReactNode;
}) {
  if (rows.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="py-2 pr-4">
              {t.columns.artisan}
            </th>
            <th scope="col" className="py-2 pr-4">
              {t.columns.document}
            </th>
            <th scope="col" className="py-2 pr-4">
              {t.columns.date}
            </th>
            {status && (
              <th scope="col" className="py-2">
                {t.columns.status}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border">
              <td className="py-3 pr-4">
                <Link
                  href={`/admin/artisans/${row.artisanId}` as Route}
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
        </tbody>
      </table>
    </div>
  );
}
