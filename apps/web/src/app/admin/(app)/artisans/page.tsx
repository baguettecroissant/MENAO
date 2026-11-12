import type { Database } from "@menao/db";
import { Check, Clock, Minus, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtisanFilesHeader } from "@/components/admin/artisan-files";
import { Pagination, listHref } from "@/components/admin/list-controls";
import { SheetChip } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";
import { PAGE_SIZE, parsePage } from "@/lib/admin/follow-up";
import { ARTISAN_FILE_STATUSES, getArtisanFileCounts } from "@/lib/admin/artisan-files";
import { requireTeam } from "@/lib/admin/guard";

type DocType = Database["public"]["Enums"]["document_type"];
const DOC_TYPES: DocType[] = ["kbis", "decennale", "rc_pro", "identite", "urssaf"];
const STATUSES = ARTISAN_FILE_STATUSES;
const t = fr.admin.list;
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});

export default async function AdminArtisansPage({ searchParams }: PageProps<"/admin/artisans">) {
  const params = await searchParams;
  // Les brouillons sont dans l'onglet « Inscriptions en cours » (ADR 0283).
  if (params.statut === "brouillon") redirect("/admin/artisans/inscriptions" as Route);
  const status = STATUSES.find((s) => s === params.statut) ?? "en_verification";
  const page = parsePage(params.page);
  const { supabase } = await requireTeam();

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
  const ids = (artisans ?? []).map((a) => a.id);
  const [{ data: trades }, { data: docs }] = await Promise.all([
    supabase.from("trades").select("code, label"),
    // État de chaque document des dossiers affichés (refonte « Nette », ADR 0252).
    ids.length
      ? supabase
          .from("artisan_documents")
          .select("artisan_id, type, status")
          .in("artisan_id", ids)
          .neq("status", "remplace")
      : Promise.resolve({ data: [] as { artisan_id: string; type: DocType; status: string }[] }),
  ]);
  const docState = new Map<string, Map<DocType, string>>();
  for (const d of docs ?? []) {
    const byType = docState.get(d.artisan_id) ?? new Map<DocType, string>();
    byType.set(d.type, d.status);
    docState.set(d.artisan_id, byType);
  }
  const tradeLabel = new Map((trades ?? []).map((tr) => [tr.code, tr.label]));
  // Nombre de dossiers par statut, sur chaque onglet : rien ne passe inaperçu derrière un onglet.
  const { byStatus: counts, stalled } = await getArtisanFileCounts(supabase);
  const elsewhere = STATUSES.filter((s) => s !== status && (counts.get(s) ?? 0) > 0);

  const docChip = (state: string | undefined) =>
    state === "valide"
      ? { tone: "success" as const, Icon: Check }
      : state === "refuse"
        ? { tone: "danger" as const, Icon: X }
        : state === "en_attente"
          ? { tone: "warning" as const, Icon: Clock }
          : { tone: "neutral" as const, Icon: Minus };
  return (
    <div className="flex flex-col gap-6">
      <ArtisanFilesHeader current={status} byStatus={counts} stalled={stalled} />
      <p className="-mt-2 text-sm text-muted-foreground" role="status">
        {fr.admin.followUp.results(count ?? 0)}
      </p>
      {!artisans?.length ? (
        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
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
                    className="font-semibold text-primary-strong underline-offset-2 hover:underline"
                  >
                    {t.elsewhereItem(fr.admin.statuses[s], counts.get(s) ?? 0)}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
          <table className="admin-table w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-border bg-background text-[0.8125rem] text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.columns.company}
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  {t.documents}
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  {t.columns.submitted}
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.columns.alerts}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {artisans.map((a) => {
                const name = a.nom_commercial ?? a.raison_sociale ?? a.siret ?? a.id;
                const states = docState.get(a.id);
                return (
                  <tr key={a.id} className="align-middle hover:bg-background">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary-strong">
                          {name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <Link
                            href={`/admin/artisans/${a.id}` as Route}
                            aria-label={t.open(name)}
                            className="font-bold text-foreground underline-offset-2 hover:underline"
                          >
                            {name}
                          </Link>
                          <span className="text-[0.8125rem] text-muted-foreground">
                            {[
                              a.artisan_trades
                                .map((tr) => tradeLabel.get(tr.trade_code) ?? tr.trade_code)
                                .join(", "),
                              a.siret,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <ul className="flex flex-wrap gap-1">
                        {DOC_TYPES.map((type) => {
                          const state = states?.get(type);
                          const { tone, Icon } = docChip(state);
                          return (
                            <li key={type}>
                              <SheetChip tone={tone}>
                                <Icon aria-hidden="true" className="size-3" />
                                {t.docShort[type]}
                                <span className="sr-only">
                                  {" "}
                                  : {t.docState[state ?? "manquant"]}
                                </span>
                              </SheetChip>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-label">
                      {a.submitted_at ? dateFormat.format(new Date(a.submitted_at)) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {a.ape_eligible === false && (
                        <SheetChip tone="warning" dot>
                          {t.apeWarning}
                        </SheetChip>
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
    </div>
  );
}
