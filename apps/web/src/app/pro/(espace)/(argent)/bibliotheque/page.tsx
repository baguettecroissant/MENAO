import { formatCoefficient, formatRaise, formatRateBp, parisToday } from "@menao/core";
import { BookOpen, Plus, ReceiptText, Search, TrendingUp, Upload } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { LibrarySettingsForm } from "@/components/pro/library-settings-form";
import { LibrarySupplies } from "@/components/pro/library-supplies";
import { MenaoChip } from "@/components/pro/menao-chip";
import { MenaoLibraryStart } from "@/components/pro/menao-library-start";
import { RaiseUndo } from "@/components/pro/raise-undo";
import { ButtonLink, Card, CardTitle, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { type LibraryWork, loadLibrary, loadMenaoTrades, tradeLabels } from "@/lib/artisan/library";
import { loadInvoicePrices } from "@/lib/artisan/library-invoices";
import { loadUndoableRaise } from "@/lib/artisan/library-raise";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.library;
const m = t.menao;
const units = fr.pro.quote.unitsShort as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);

export const metadata: Metadata = { title: `${t.title} — MENAO` };

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR");
const hours = (milli: number) => `${(milli / 1000).toLocaleString("fr-FR")} h`;

/** Prix tiré de la seule fourchette indicative (ni prix à la main, ni prix d'achat complets). */
const fromRange = (w: LibraryWork) =>
  w.manual_price_cents === null &&
  w.pricing.computedPriceCents === null &&
  w.pricing.range !== null &&
  w.pricing.range.lowCents !== w.pricing.range.highCents;

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Bibliothèque d'ouvrages et marge (F-141, ADR 0293), onglet d'Argent : ouvrages (prix, coût,
 * marge en euros et en taux de marque), fournitures, réglages de chiffrage. Remplie avec les
 * anciens devis à la première ouverture. Patron et chef d'équipe seulement.
 */
export default async function LibraryPage({ searchParams }: PageProps<"/pro/bibliotheque">) {
  const { vue, q, metier, menao, metiers, importe, maj, factures, ajouts, annule } =
    await searchParams;
  const view = vue === "fournitures" ? "fournitures" : "ouvrages";
  const query = typeof q === "string" ? q.slice(0, 100) : "";
  const { supabase, artisanId } = await requireTeamPermission("money");
  const library = await loadLibrary(supabase);

  // Premier passage (F-147) : bibliothèque MENAO, import ou devis, et les deux réglages.
  if (!library.onboarded) {
    const trades = await loadMenaoTrades(supabase, artisanId);
    return (
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
          <MenaoLibraryStart
            trades={trades}
            devisCount={library.works.length}
            hourPriceCents={library.settings.hourPriceCents}
            coef={formatCoefficient(library.settings.supplyCoefBp)}
          />
        </div>
      </main>
    );
  }

  const menaoWorks = library.works.filter((w) => w.source === "menao");
  // Prix d'achat repérés dans les factures lues dans Dépenses (F-149).
  const invoicePrices = await loadInvoicePrices(supabase, library);
  const invoiceDone =
    typeof factures === "string" && /^\d{1,3}$/.test(factures)
      ? {
          updated: Number(factures),
          added: typeof ajouts === "string" && /^\d{1,3}$/.test(ajouts) ? Number(ajouts) : 0,
        }
      : null;
  // Hausse en un geste encore annulable (F-149), ou annulation faite.
  const raise = await loadUndoableRaise(supabase);
  const undone = typeof annule === "string" && /^\d{1,5}$/.test(annule) ? Number(annule) : null;
  const labels = menaoWorks.length ? await tradeLabels(supabase) : [];
  const tradeOf = new Map(labels.map((l) => [l.code, l.label]));
  const tradeFilters = labels.filter((l) => menaoWorks.some((w) => w.trade_code === l.code));
  const filter =
    typeof metier === "string" && (metier === "miens" || tradeOf.has(metier)) ? metier : null;
  const words = plain(query).split(/\s+/).filter(Boolean);
  const works = library.works.filter(
    (w) =>
      words.every((x) => plain(w.designation).includes(x)) &&
      (filter === null || (filter === "miens" ? w.source !== "menao" : w.trade_code === filter)),
  );
  const withCost = library.works.filter((w) => w.pricing.costCents !== null).length;
  const added = typeof menao === "string" && /^\d{1,4}$/.test(menao) ? Number(menao) : null;
  const imported =
    typeof importe === "string" && /^\d{1,5}$/.test(importe)
      ? {
          added: Number(importe),
          updated: typeof maj === "string" && /^\d{1,5}$/.test(maj) ? Number(maj) : 0,
        }
      : null;
  const addedTrades =
    typeof metiers === "string" && /^\d{1,2}$/.test(metiers) ? Number(metiers) : 0;
  // Date du relevé de prix publics le plus récent utilisé par une fourchette affichée.
  const publicDates = library.supplies
    .map((s) => s.public_range?.on)
    .filter((d): d is string => Boolean(d))
    .sort();
  const latestPublic = works.some(fromRange) ? (publicDates.at(-1) ?? null) : null;
  const filterHref = (value: string | null) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value) params.set("metier", value);
    const qs = params.toString();
    return `/pro/bibliotheque${qs ? `?${qs}` : ""}` as Route;
  };

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
        {added !== null && (
          <p
            role="status"
            className="flex items-start gap-3.5 rounded-card bg-primary-soft px-[1.125rem] py-3.5 text-[0.90625rem] leading-[1.45]"
          >
            <BookOpen
              aria-hidden="true"
              className="mt-0.5 size-[1.375rem] shrink-0 text-primary-strong"
            />
            <span>
              <b>{m.added(added, addedTrades)}</b> {m.addedNext}
            </span>
          </p>
        )}
        {imported && (
          <p
            role="status"
            className="flex items-start gap-3 rounded-input bg-success-soft px-4 py-3 text-sm text-success"
          >
            <Upload aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t.importer.done(imported.added, imported.updated, view)}</span>
          </p>
        )}
        {undone !== null && (
          <p
            role="status"
            className="flex items-start gap-3 rounded-input bg-success-soft px-4 py-3 text-sm text-success"
          >
            <TrendingUp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t.raise.undone(undone)}</span>
          </p>
        )}
        {raise && (
          <RaiseUndo
            raiseId={raise.id}
            text={t.raise.done(formatRaise(raise.rateBp), raise.works, raise.supplies)}
            until={raise.until}
          />
        )}
        {invoiceDone && (
          <p
            role="status"
            className="flex items-start gap-3 rounded-input bg-success-soft px-4 py-3 text-sm text-success"
          >
            <ReceiptText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t.invoices.done(invoiceDone.updated, invoiceDone.added)}</span>
          </p>
        )}
        {!invoiceDone && (invoicePrices.changes.length > 0 || invoicePrices.fresh.length > 0) && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input bg-primary-soft px-4 py-3 text-sm text-primary-strong">
            <ReceiptText aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1">
              {t.invoices.banner(invoicePrices.changes.length, invoicePrices.fresh.length)}
            </span>
            <Link
              href={"/pro/bibliotheque/prix-factures" as Route}
              className="font-semibold underline-offset-2 hover:underline"
            >
              {t.invoices.bannerLink}
            </Link>
          </p>
        )}
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
                    {filter && <input type="hidden" name="metier" value={filter} />}
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
                  <ButtonLink
                    href={"/pro/bibliotheque/importer" as Route}
                    size="sm"
                    variant="secondary"
                  >
                    <Upload aria-hidden="true" className="size-4" />
                    {t.importer.button}
                  </ButtonLink>
                  <ButtonLink
                    href={"/pro/bibliotheque/augmenter" as Route}
                    size="sm"
                    variant="secondary"
                  >
                    <TrendingUp aria-hidden="true" className="size-4" />
                    {t.raise.button}
                  </ButtonLink>
                  <ButtonLink href={"/pro/bibliotheque/nouveau" as Route} size="sm">
                    <Plus aria-hidden="true" className="size-4" />
                    {t.newWork}
                  </ButtonLink>
                </div>
              )}
              {view === "fournitures" && (
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonLink
                    href={"/pro/bibliotheque/importer?type=fournitures" as Route}
                    size="sm"
                    variant="secondary"
                  >
                    <Upload aria-hidden="true" className="size-4" />
                    {t.importer.button}
                  </ButtonLink>
                  <ButtonLink
                    href={"/pro/bibliotheque/augmenter" as Route}
                    size="sm"
                    variant="secondary"
                  >
                    <TrendingUp aria-hidden="true" className="size-4" />
                    {t.raise.button}
                  </ButtonLink>
                </div>
              )}
            </div>

            {view === "ouvrages" && tradeFilters.length > 0 && (
              <nav aria-label={m.filtersLabel} className="flex flex-wrap gap-1.5">
                {[
                  { value: null, label: m.all(library.works.length) },
                  ...tradeFilters.map((l) => ({ value: l.code, label: l.label })),
                  {
                    value: "miens",
                    label: m.mine(library.works.length - menaoWorks.length),
                  },
                ].map((f) => (
                  <Link
                    key={f.value ?? "tous"}
                    href={filterHref(f.value)}
                    aria-current={filter === f.value ? "page" : undefined}
                    className="flex min-h-9 items-center rounded-pill border border-border bg-surface px-3.5 text-sm font-medium whitespace-nowrap hover:bg-background aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:font-semibold aria-[current=page]:text-surface"
                  >
                    {f.label}
                  </Link>
                ))}
              </nav>
            )}
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
                        {m.pose}
                      </th>
                      <th scope="col" className="px-2 py-3 text-right font-semibold">
                        {menaoWorks.length ? m.indicative : t.columns.price}
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
                          {w.trade_code && tradeOf.has(w.trade_code) && (
                            <span className="block text-[0.78125rem] text-muted-foreground">
                              {tradeOf.get(w.trade_code)}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {units[w.unit] ?? w.unit}
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                          {w.pricing.labor.hoursMilli > 0 ? hours(w.pricing.labor.hoursMilli) : "—"}
                        </td>
                        <td className="px-2 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                          {fromRange(w) && w.pricing.range
                            ? `${money(w.pricing.range.lowCents)} – ${money(w.pricing.range.highCents)}`
                            : w.pricing.priceCents === null
                              ? "—"
                              : money(w.pricing.priceCents)}
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
                          {w.source === "menao" ? (
                            <MenaoChip />
                          ) : (
                            <StatusBadge tone={w.components.length ? "primary" : "neutral"}>
                              {w.components.length ? t.origin.compose : t.origin[w.source]}
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                  <span>{t.count(works.length, library.works.length, withCost)}</span>
                  {latestPublic && (
                    <span className="text-xs">{m.sourceFooter(shortDate(latestPublic))}</span>
                  )}
                </p>
              </div>
            )}
          </section>
          <div className="flex flex-col gap-4">
            {menaoWorks.length > 0 && (
              <Card className="flex flex-col gap-2.5">
                <CardTitle title={m.whereTitle} />
                <p className="text-sm leading-normal text-label">
                  <b>{m.wherePose}</b>
                  {m.wherePoseText}
                </p>
                <p className="text-sm leading-normal text-label">
                  <b>{m.whereSupplies}</b>
                  {m.whereSuppliesText}
                </p>
                <p className="text-sm leading-normal text-label">{m.whereOwn}</p>
                <p className="rounded-input bg-background px-3 py-2.5 text-sm text-muted-foreground">
                  {m.whereNote}
                </p>
              </Card>
            )}
            <LibrarySettingsForm
              hourCostCents={library.settings.hourCostCents}
              hourPriceCents={library.settings.hourPriceCents}
              coef={formatCoefficient(library.settings.supplyCoefBp)}
              alertBp={library.settings.marginAlertBp}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
