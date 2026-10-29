import { apeLabel } from "@menao/core";
import { ChevronLeft, ChevronRight, List, Map as MapIcon, Search } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProspectMap, type ProspectPoint } from "@/components/commercial/prospect-map";
import { EmptyState } from "@/components/empty-state";
import { ListFilters, ListPanel, ListRow, type ListTone } from "@/components/list-kit";
import { Alert, Tag, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDayMonthShort } from "@/lib/format";

const t = fr.commercialProspects;
const PATH = "/commercial/prospects";
const PAGE_SIZE = 50;
/** La carte montre au plus 500 résultats du filtre en cours (limite de la base). */
const MAP_LIMIT = 500;
const FILTERS = ["tous", "miens", "relances", "libres"] as const;
type Filter = (typeof FILTERS)[number];

export const metadata: Metadata = { title: `${t.list.title} — MENAO`, robots: { index: false } };

const STATUS_TONES: Record<string, ListTone> = {
  a_contacter: "primary",
  rdv_pris: "success",
  demo_faite: "success",
  pas_interesse: "neutral",
};

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

/** Adresse de la liste avec ses paramètres utiles (valeurs par défaut omises). */
function listHref(params: { q: string | null; filtre: Filter; vue: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.filtre !== "tous") search.set("filtre", params.filtre);
  if (params.vue === "carte") search.set("vue", "carte");
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return (qs ? `${PATH}?${qs}` : PATH) as Route;
}

/**
 * Prospects des commerciaux (F-65, lot 2, ADR 0206) : recherche, filtres (tous, les miens, à
 * relancer, libres), liste paginée ou carte des 500 premiers résultats. Un prospect suivi par un
 * collègue est signalé sans plus de détails.
 */
export default async function CommercialProspectsPage({
  searchParams,
}: PageProps<"/commercial/prospects">) {
  const params = await searchParams;
  const query = one(params.q)?.trim().slice(0, 100) || null;
  const filter: Filter = FILTERS.find((f) => f === one(params.filtre)) ?? "tous";
  const view = one(params.vue) === "carte" ? "carte" : "liste";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one(params.page) ?? "", 10) || 1));
  const done = one(params.retire) === "1";
  const href = (next: { filtre?: Filter; vue?: string; page?: number }) =>
    listHref({
      q: query,
      filtre: next.filtre ?? filter,
      vue: next.vue ?? view,
      page: next.page,
    });

  const space = await getCommercialSpace();
  const { data, error } = space.active
    ? await space.supabase.rpc("commercial_prospects", {
        p_search: query ?? undefined,
        p_filter: filter,
        p_limit: view === "carte" ? MAP_LIMIT : PAGE_SIZE,
        p_offset: view === "carte" ? 0 : (page - 1) * PAGE_SIZE,
      })
    : { data: null, error: null };
  const rows = data ?? [];
  const total = rows[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Page au-delà de la dernière (liste qui a rétréci) : retour à la première.
  if (space.active && !error && view === "liste" && rows.length === 0 && page > 1) {
    redirect(href({ page: 1 }));
  }

  const points: ProspectPoint[] = rows.flatMap((r) =>
    r.lon !== null && r.lat !== null
      ? [
          {
            id: r.id,
            nom: r.nom,
            lon: r.lon,
            lat: r.lat,
            kind: r.mine ? "mine" : r.followed_by_other ? "other" : "free",
          },
        ]
      : [],
  );

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.list.title}</h1>
          <p className="text-sm text-muted-foreground">{t.list.intro}</p>
        </div>

        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : (
          <>
            {done && <Alert tone="success">{t.detail.doNotContactDone}</Alert>}

            <form role="search" action={PATH} className="flex gap-2">
              {filter !== "tous" && <input type="hidden" name="filtre" value={filter} />}
              {view === "carte" && <input type="hidden" name="vue" value="carte" />}
              <div className="relative flex-1">
                <label htmlFor="prospect-search" className="sr-only">
                  {t.list.searchLabel}
                </label>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle-foreground"
                />
                <input
                  id="prospect-search"
                  type="search"
                  name="q"
                  defaultValue={query ?? ""}
                  maxLength={100}
                  placeholder={t.list.searchPlaceholder}
                  className={`${inputClasses} min-h-11 bg-surface pl-11`}
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 shrink-0 items-center rounded-button bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                {t.list.search}
              </button>
            </form>

            <ListFilters
              label={t.list.filtersLabel}
              items={FILTERS.map((key) => ({
                href: href({ filtre: key, page: 1 }),
                label: t.list.filters[key] ?? key,
                active: key === filter,
              }))}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" role="status">
                {error ? t.errors.unavailable : t.list.count(total)}
              </p>
              <nav
                aria-label={t.list.viewsLabel}
                className="inline-flex shrink-0 rounded-button border border-border bg-surface p-0.5"
              >
                {(["liste", "carte"] as const).map((key) => {
                  const Icon = key === "carte" ? MapIcon : List;
                  return (
                    <Link
                      key={key}
                      href={href({ vue: key, page: 1 })}
                      aria-current={view === key ? "page" : undefined}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-button px-3 text-sm text-muted-foreground hover:text-foreground aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium aria-[current=page]:text-primary-strong"
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {t.list.views[key]}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {error ? null : rows.length === 0 ? (
              <EmptyState illustration="documents">
                {!query && filter === "tous" ? t.list.emptyBase : t.list.empty}
              </EmptyState>
            ) : view === "carte" ? (
              <div className="flex flex-col gap-2">
                {points.length > 0 ? (
                  <ProspectMap points={points} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t.list.mapEmpty}</p>
                )}
                {total > rows.length && (
                  <p className="text-xs text-muted-foreground">{t.list.mapLimit(rows.length)}</p>
                )}
              </div>
            ) : (
              <>
                <ListPanel label={t.list.listLabel}>
                  {rows.map((r) => {
                    const place = [r.commune, r.code_postal ? `(${r.code_postal})` : null]
                      .filter(Boolean)
                      .join(" ");
                    const detail = [
                      r.mine && r.next_action_at
                        ? t.list.nextAction(formatDayMonthShort(r.next_action_at))
                        : null,
                      apeLabel(r.ape_code) ?? r.ape_code,
                      place,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const status = r.mine
                      ? {
                          text: t.status[r.status] ?? r.status,
                          tone: STATUS_TONES[r.status] ?? "neutral",
                        }
                      : r.followed_by_other
                        ? { text: t.list.followedByOther, tone: "warning" as const }
                        : r.stage
                          ? { text: t.stage[r.stage] ?? r.stage, tone: "success" as const }
                          : { text: t.list.free, tone: "neutral" as const };
                    return (
                      <ListRow
                        key={r.id}
                        href={`${PATH}/${r.id}`}
                        title={r.nom}
                        detail={detail}
                        status={status}
                        badge={
                          r.rge ? (
                            <Tag tone="neutral" className="shrink-0">
                              {t.list.rge}
                            </Tag>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </ListPanel>
                {pages > 1 && (
                  <nav
                    aria-label={t.list.pageOf(page, pages)}
                    className="flex items-center justify-between gap-3"
                  >
                    {page > 1 ? (
                      <Link
                        href={href({ page: page - 1 })}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong underline-offset-2 hover:underline"
                      >
                        <ChevronLeft aria-hidden="true" className="size-4" />
                        {t.list.previous}
                      </Link>
                    ) : (
                      <span />
                    )}
                    <p className="text-sm text-muted-foreground">{t.list.pageOf(page, pages)}</p>
                    {page < pages ? (
                      <Link
                        href={href({ page: page + 1 })}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong underline-offset-2 hover:underline"
                      >
                        {t.list.next}
                        <ChevronRight aria-hidden="true" className="size-4" />
                      </Link>
                    ) : (
                      <span />
                    )}
                  </nav>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
