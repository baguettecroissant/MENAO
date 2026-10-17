import type { Database } from "@menao/db";
import type { Route } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";

type Status = Database["public"]["Enums"]["artisan_status"];
const STATUSES: Status[] = [
  "en_verification",
  "brouillon",
  "valide",
  "refuse",
  "suspendu",
  "radie",
];
const t = fr.admin.list;
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});

export default async function AdminArtisansPage({ searchParams }: PageProps<"/admin/artisans">) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.statut) ?? "en_verification";
  const { supabase } = await requireAdmin();

  const { data: artisans } = await supabase
    .from("artisans")
    .select(
      "id, raison_sociale, nom_commercial, siret, submitted_at, ape_eligible, artisan_trades(trade_code)",
    )
    .eq("status", status)
    .order("submitted_at", { ascending: true, nullsFirst: false });
  const { data: trades } = await supabase.from("trades").select("code, label");
  const tradeLabel = new Map((trades ?? []).map((tr) => [tr.code, tr.label]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
      <nav aria-label={t.filters}>
        <ul className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <li key={s}>
              <Link
                href={`/admin/artisans?statut=${s}` as Route}
                aria-current={s === status ? "page" : undefined}
                className={`inline-flex min-h-touch items-center rounded-chip border px-4 text-sm ${
                  s === status
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface"
                }`}
              >
                {fr.admin.statuses[s]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Card>
        {!artisans?.length ? (
          <p className="text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.company}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.siret}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.trades}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {t.columns.submitted}
                  </th>
                  <th scope="col" className="py-2">
                    {t.columns.alerts}
                  </th>
                </tr>
              </thead>
              <tbody>
                {artisans.map((a) => {
                  const name = a.nom_commercial ?? a.raison_sociale ?? a.siret ?? a.id;
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/artisans/${a.id}` as Route}
                          aria-label={t.open(name)}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 font-mono">{a.siret ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {a.artisan_trades
                          .map((tr) => tradeLabel.get(tr.trade_code) ?? tr.trade_code)
                          .join(", ") || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {a.submitted_at ? dateFormat.format(new Date(a.submitted_at)) : "—"}
                      </td>
                      <td className="py-3">
                        {a.ape_eligible === false && (
                          <span className="rounded-chip bg-warning-soft px-2 py-1 text-warning">
                            {t.apeWarning}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
