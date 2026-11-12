import { MONITORED_DOCUMENT_TYPES, daysUntil, expiryStatus, expiryWatchLimit } from "@menao/core";
import { Card } from "@/components/ui";
import {
  ComplianceHeader,
  ComplianceRowsTable,
  type ComplianceRow,
  artisanName,
} from "@/components/admin/compliance";
import { fr } from "@/i18n/fr";
import { getComplianceCounts } from "@/lib/admin/compliance";
import { requireVerifier } from "@/lib/admin/guard";

const t = fr.admin.watch;
const docT = fr.pro.onboarding.documents;

/**
 * Conformité, onglet « Échéances » (ADR 0283) : documents surveillés et certifications qui
 * arrivent à échéance sous 30 jours ou déjà expirés, les plus proches d'abord.
 */
export default async function ComplianceExpiringPage() {
  const { supabase } = await requireVerifier();
  const limit = expiryWatchLimit();
  const [counts, expiringDocs, expiringCerts] = await Promise.all([
    getComplianceCounts(supabase),
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
  const rows: ComplianceRow[] = [
    ...(expiringDocs.data ?? []).map((d) => ({
      key: d.id,
      artisanId: d.artisans.id,
      artisan: artisanName(d.artisans),
      label: docT.types[d.type as keyof typeof docT.types] ?? d.type,
      dateFin: d.date_fin,
    })),
    ...(expiringCerts.data ?? []).map((c) => ({
      key: c.id,
      artisanId: c.artisans.id,
      artisan: artisanName(c.artisans),
      label: t.certification(fr.certificationTypes[c.type]),
      dateFin: c.date_fin,
    })),
  ].sort((a, b) => (a.dateFin ?? "").localeCompare(b.dateFin ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <ComplianceHeader current="expiring" counts={counts} />
      <Card>
        <section aria-label={t.expiring} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.expiring}</h2>
          <ComplianceRowsTable
            rows={rows}
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
