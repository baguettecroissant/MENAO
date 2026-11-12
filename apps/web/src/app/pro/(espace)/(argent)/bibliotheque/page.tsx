import { formatCoefficient, formatRateBp, parisToday } from "@menao/core";
import { BookOpen, Plus, Search } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { LibrarySettingsForm } from "@/components/pro/library-settings-form";
import { LibrarySupplies } from "@/components/pro/library-supplies";
import { ButtonLink, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { loadLibrary } from "@/lib/artisan/library";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.library;
const units = fr.pro.quote.unitsShort as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);

export const metadata: Metadata = { title: `${t.title} — MENAO` };

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Bibliothèque d'ouvrages et marge (F-141, ADR 0293), onglet d'Argent : ouvrages (prix, coût,
 * marge en euros et en taux de marque), fournitures, réglages de chiffrage. Remplie avec les
 * anciens devis à la première ouverture. Patron et chef d'équipe seulement.
 */
export default async function LibraryPage({ searchParams }: PageProps<"/pro/bibliotheque">) {
  const { vue, q } = await searchParams;
  const view = vue === "fournitures" ? "fournitures" : "ouvrages";
  const query = typeof q === "string" ? q.slice(0, 100) : "";
  const { supabase } = await requireTeamPermission("money");
  const library = await loadLibrary(supabase);
  const words = plain(query).split(/\s+/).filter(Boolean);
  const works = library.works.filter((w) => words.every((x) => plain(w.designation).includes(x)));
  const withCost = library.works.filter((w) => w.pricing.costCents !== null).length;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
        {library.seededCount !== null && (
          <p
            role="status"
            className="flex items-start gap-3 rounded-input bg-primary-soft px-4 py-3 text-sm text-primary-strong"
          >
            <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t.seeded(library.seededCount)}</span>
          </p>
        )}
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
          <section className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav
                aria-label={t.viewsLabel}
                className="flex gap-1 rounded-pill border border-border bg-surface p-1"
              >
                {(["ouvrages", "fournitures"] as const).map((v) => (
                  <Link
                    key={v}
                    href={
                      (v === "ouvrages"
                        ? "/pro/bibliotheque"
                        : "/pro/bibliotheque?vue=fournitures") as Route
                    }
                    aria-current={view === v ? "page" : undefined}
                    className="flex min-h-9 items-center rounded-pill px-4 text-sm font-medium whitespace-nowrap hover:bg-background aria-[current=page]:bg-foreground aria-[current=page]:font-semibold aria-[current=page]:text-surface"
                  >
                    {t.views[v]} (
                    {v === "ouvrages" ? library.works.length : library.supplies.length})
                  </Link>
                ))}
              </nav>
              {view === "ouvrages" && (
                <div className="flex flex-wrap items-center gap-2">
                  <form role="search" className="relative">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="search"
                      name="q"
                      defaultValue={query}
                      placeholder={t.search}
                      aria-label={t.searchLabel}
                      className={`${inputClasses} !min-h-10 !w-56 pl-9`}
                    />
                  </form>
                  <ButtonLink href={"/pro/bibliotheque/nouveau" as Route} size="sm">
                    <Plus aria-hidden="true" className="size-4" />
                    {t.newWork}
                  </ButtonLink>
                </div>
              )}
            </div>

            {view === "fournitures" ? (
              <LibrarySupplies
                supplies={library.supplies}
                today={parisToday()}
                maxAgeMonths={library.settings.priceMaxAgeMonths}
              />
            ) : library.works.length === 0 ? (
              <p className="rounded-card border border-border bg-surface p-6 text-sm text-muted-foreground">
                {t.empty}
              </p>
            ) : works.length === 0 ? (
              <p className="rounded-card border border-border bg-surface p-6 text-sm text-muted-foreground">
                {t.noResult}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <caption className="sr-only">{t.title}</caption>
                  <thead className="border-b border-border bg-background text-[0.8125rem] text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.columns.work}
                      </th>
                      <th scope="col" className="px-2 py-3 font-semibold">
                        {t.columns.unit}
                      </th>
                      <th scope="col" className="px-2 py-3 text-right font-semibold">
                        {t.columns.price}
                      </th>
                      <th scope="col" className="px-2 py-3 text-right font-semibold">
                        {t.columns.cost}
                      </th>
                      <th scope="col" className="px-2 py-3 font-semibold">
                        {t.columns.margin}
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.columns.origin}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {works.map((w) => (
                      <tr key={w.id} className="border-t border-border hover:bg-background">
                        <td className="px-4 py-3">
                          <Link
                            href={`/pro/bibliotheque/${w.id}` as Route}
                            className="font-semibold hover:underline"
                          >
                            {w.designation}
                          </Link>
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {units[w.unit] ?? w.unit}
                        </td>
                        <td className="px-2 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                          {w.pricing.priceCents === null ? "—" : money(w.pricing.priceCents)}
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                          {w.pricing.costCents === null ? "—" : money(w.pricing.costCents)}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {w.pricing.marginCents === null || w.pricing.markupBp === null ? (
                            <StatusBadge tone="neutral">{t.costMissing}</StatusBadge>
                          ) : (
                            <StatusBadge tone={w.pricing.marginCents < 0 ? "danger" : "success"}>
                              {money(w.pricing.marginCents)} · {formatRateBp(w.pricing.markupBp)}
                            </StatusBadge>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge tone={w.components.length ? "primary" : "neutral"}>
                            {w.components.length ? t.origin.compose : t.origin[w.source]}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                  {t.count(works.length, library.works.length, withCost)}
                </p>
              </div>
            )}
          </section>
          <LibrarySettingsForm
            hourCostCents={library.settings.hourCostCents}
            hourPriceCents={library.settings.hourPriceCents}
            coef={formatCoefficient(library.settings.supplyCoefBp)}
            alertBp={library.settings.marginAlertBp}
          />
        </div>
      </div>
    </main>
  );
}
