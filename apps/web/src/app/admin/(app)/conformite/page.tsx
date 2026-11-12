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
 * Conformité, onglet « Renouvellements » (ADR 0283, ancienne page « À surveiller ») : documents
 * déposés par des artisans validés ou suspendus, à vérifier sur leur fiche. Les plus anciens
 * d'abord.
 */
export default async function ComplianceRenewalsPage() {
  const { supabase } = await requireVerifier();
  const [counts, { data: renewals }] = await Promise.all([
    getComplianceCounts(supabase),
    supabase
      .from("artisan_documents")
      .select("id, type, date_fin, artisans!inner(id, raison_sociale, nom_commercial, status)")
      .eq("status", "en_attente")
      .in("artisans.status", ["valide", "suspendu"])
      .order("created_at"),
  ]);
  const rows: ComplianceRow[] = (renewals ?? []).map((d) => ({
    key: d.id,
    artisanId: d.artisans.id,
    artisan: artisanName(d.artisans),
    label: docT.types[d.type as keyof typeof docT.types] ?? d.type,
    dateFin: d.date_fin,
  }));

  return (
    <div className="flex flex-col gap-6">
      <ComplianceHeader current="renewals" counts={counts} />
      <Card>
        <section aria-label={t.renewals} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.renewals}</h2>
          <ComplianceRowsTable rows={rows} empty={t.noRenewals} />
        </section>
      </Card>
    </div>
  );
}
