import type { Route } from "next";
import Link from "next/link";
import { ArtisanFilesHeader } from "@/components/admin/artisan-files";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getArtisanFileCounts } from "@/lib/admin/artisan-files";
import { requireAdmin } from "@/lib/admin/guard";

const t = fr.admin.stalled;
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});
const DAY_MS = 86_400_000;

/**
 * Dossiers artisans, onglet « Inscriptions en cours » (ADR 0283, ancienne page « Inscriptions
 * bloquées », ADR 0219) : dossier pas encore envoyé, compléments attendus, ou dossier
 * validé sans paiements ni formule ; étapes manquantes, attente et relances automatiques
 * envoyées depuis le début de l'attente. Les plus anciennes d'abord.
 */
export default async function AdminStalledSignupsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: rows }, { byStatus }] = await Promise.all([
    supabase.rpc("admin_stalled_signups"),
    getArtisanFileCounts(supabase),
  ]);
  const list = rows ?? [];
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <ArtisanFilesHeader current="inscriptions" byStatus={byStatus} stalled={list.length} />
      <p className="-mt-2 max-w-3xl text-[0.9375rem] text-label">{t.intro}</p>
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {t.count(list.length)}
        </p>
        {list.length === 0 ? (
          <p className="text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.company}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.state}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.missing}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.since}
                  </th>
                  <th scope="col" className="py-2">
                    {t.columns.reminders}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={`${row.artisan_id}-${row.etat}`} className="border-t border-border">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/artisans/${row.artisan_id}` as Route}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {row.entreprise ?? row.artisan_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{t.states[row.etat] ?? row.etat}</td>
                    <td className="py-3 pr-4">
                      {row.manque.length === 0
                        ? t.readyToSend
                        : row.manque.map((step) => t.steps[step] ?? step).join(", ")}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {t.days(
                        Math.floor((now.getTime() - new Date(row.depuis).getTime()) / DAY_MS),
                      )}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {t.reminders(
                        row.relances,
                        row.derniere_relance
                          ? dateFormat.format(new Date(row.derniere_relance))
                          : null,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
