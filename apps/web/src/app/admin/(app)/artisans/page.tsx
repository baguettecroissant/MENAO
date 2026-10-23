import type { Database } from "@menao/db";
import type { Route } from "next";
import Link from "next/link";
import { Pagination, listHref } from "@/components/admin/list-controls";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { PAGE_SIZE, parsePage } from "@/lib/admin/follow-up";
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
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();

  // 50 dossiers par page (ADR 0146), les plus anciens envois d'abord.
  const { data: artisans, count } = await supabase
    .from("artisans")
    .select(
      "id, raison_sociale, nom_commercial, siret, submitted_at, ape_eligible, artisan_trades(trade_code)",
      { count: "exact" },
    )
    .eq("status", status)
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data: trades } = await supabase.from("trades").select("code, label");
  const tradeLabel = new Map((trades ?? []).map((tr) => [tr.code, tr.label]));
  // Nombre de dossiers par statut, sur chaque onglet : rien ne passe inaperçu derrière un onglet.
  const counts = new Map(
    await Promise.all(
      STATUSES.map(async (s) => {
        const { count: n } = await supabase
          .from("artisans")
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        return [s, n ?? 0] as const;
      }),
    ),
  );
  const elsewhere = STATUSES.filter((s) => s !== status && (counts.get(s) ?? 0) > 0);

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
                aria-label={t.tab(fr.admin.statuses[s], counts.get(s) ?? 0)}
                className={`inline-flex min-h-touch items-center gap-2 rounded-chip border px-4 text-sm ${
                  s === status
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface"
                }`}
              >
                {fr.admin.statuses[s]}
                {(counts.get(s) ?? 0) > 0 && (
                  <span
                    aria-hidden="true"
                    className={`rounded-pill px-2 text-xs font-semibold tabular-nums ${
                      s === status
                        ? "bg-white/20 text-primary-foreground"
                        : "bg-primary-soft text-primary-strong"
                    }`}
                  >
                    {counts.get(s)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {fr.admin.followUp.results(count ?? 0)}
        </p>
        {!artisans?.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">{t.empty}</p>
            {/* Onglet vide : les catégories où des dossiers attendent. */}
            {elsewhere.length > 0 && (
              <p className="text-sm">
                {t.elsewhere}{" "}
                {elsewhere.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ", "}
                    <Link
                      href={`/admin/artisans?statut=${s}` as Route}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {t.elsewhereItem(fr.admin.statuses[s], counts.get(s) ?? 0)}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
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
        <Pagination
          page={page}
          total={count ?? 0}
          hrefFor={(p) => listHref("/admin/artisans", { statut: status, page: p })}
        />
      </Card>
    </div>
  );
}
