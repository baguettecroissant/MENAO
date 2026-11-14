import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  artisanPageUrl,
  formatPlanMeasure,
  planPageTypes,
  planReadingFigures,
  planWorksFigures,
  traceControl,
  type PlanPage,
  type PlanTrace,
} from "@menao/core";
import { CheckCircle2, Layers, Ruler, TriangleAlert } from "lucide-react";
import { CopySnippet } from "@/components/copy-snippet";
import { PlanDpgfEditor } from "@/components/pro/plan-dpgf-editor";
import { PlanFinishes } from "@/components/pro/plan-finishes";
import { PlanMeasure } from "@/components/pro/plan-measure";
import { PlanReleve } from "@/components/pro/plan-releve";
import type { PlanFileLink } from "@/components/pro/plan-viewer";
import { PlanWorks } from "@/components/pro/plan-works";
import { PlanSteps, type PlanStep } from "@/components/pro/plan-steps";
import { QuantitiesCheck } from "@/components/pro/quantities-check";
import { RereadPlansForm } from "@/components/pro/reread-plans-form";
import { TenderEditor } from "@/components/pro/tender-editor";
import { Alert, Button, Card, CardTitle, Field, StatusBadge, inputClasses } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";
import { deleteTender, updateTender } from "@/lib/artisan/tender-actions";
import { getTender, getTenderRooms, getTenderWorks, planFiles } from "@/lib/artisan/tenders";
import { formatDay } from "@/lib/format";

const t = fr.pro.tenders;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUSES = ["en_cours", "envoye", "retenu", "perdu"] as const;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Un appel d'offres (F-136, ADR 0287) : résultat de la lecture du DPGF, postes à chiffrer, export
 * Excel au format de l'architecte et PDF, suivi de l'offre.
 */
export default async function TenderPage({
  params,
  searchParams,
}: PageProps<"/pro/demandes/appels-offres/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const query = (await searchParams) as Record<string, string | undefined>;
  const { supabase, artisanId } = await requireTeamPermission("money");
  const [found, { data: artisan }] = await Promise.all([
    getTender(supabase, id),
    supabase
      .from("artisans")
      .select("assujetti_tva, slug, nom_commercial, raison_sociale")
      .eq("id", artisanId)
      .maybeSingle(),
  ]);
  if (!found) notFound();
  const { tender, lines } = found;
  const vatOptions = artisan?.assujetti_tva === false ? [0] : [2000, 1000, 550];
  // Passage en devis (ADR 0289) : le client arrive par la fiche publique, en demande directe.
  const pageUrl = artisan?.slug ? artisanPageUrl(env.NEXT_PUBLIC_SITE_URL, artisan.slug) : null;
  const company = artisan?.nom_commercial ?? artisan?.raison_sociale ?? "";
  const reading = query.lecture;
  // Appel d'offres créé depuis les plans (F-140, ADR 0291) : relevé des pièces.
  const isPlan = tender.source_kind === "plan";
  const warningTexts = isPlan ? t.plan.warnings : t.warnings;
  const warnings = (query.alertes ?? "").split(",").filter((w) => warningTexts[w]);
  const plan = isPlan ? { ...(await planData(supabase, tender)), ...linesToVerify(lines) } : null;

  // Étapes (maquette du lot 35) : relevé, revêtements, DPGF ; par défaut, la plus avancée.
  // Plan de terrain (lot 52) : des ouvrages mesurés sans pièces, donc sans revêtements.
  const asked = query.etape;
  const step: PlanStep | null = !plan
    ? null
    : asked === "revetements" && plan.rooms.length > 0
      ? "revetements"
      : asked === "releve" || lines.length === 0
        ? "releve"
        : "dpgf";
  // Métré à la main (F-159 lot 3) : un écran du relevé, sur les photos de plans.
  const measuring = !!plan && asked === "mesure";
  const reachable: PlanStep[] = [
    "releve",
    ...(plan && plan.rooms.length > 0 ? (["revetements"] as const) : []),
    ...(lines.length > 0 ? (["dpgf"] as const) : []),
  ];
  const summaryCard = plan && (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="text-lg font-semibold">{t.plan.summaryTitle}</h2>
      <ul className="flex flex-col gap-2.5 text-sm">
        {plan.summary.map(({ icon: Icon, tone, text }) => (
          <li key={text} className="flex items-start gap-2.5">
            <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${tone}`} />
            <span>{text}</span>
          </li>
        ))}
        {plan.trades.length > 0 && (plan.rooms.length > 0 || plan.works.length === 0) && (
          <li className="flex items-start gap-2.5">
            <Layers aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
            <span>
              {t.plan.tradesTitle} : {plan.trades.map((tr) => tr.label).join(", ")}
            </span>
          </li>
        )}
      </ul>
      {plan.rooms.length === 0 && plan.works.length === 0 && (
        <RereadPlansForm tenderId={tender.id} label={t.plan.retry} />
      )}
    </section>
  );

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/pro/demandes/appels-offres" as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {t.back}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            {(tender.client_name || tender.due_on || isPlan) && (
              <p className="text-sm font-semibold text-muted-foreground">
                {[
                  tender.client_name,
                  tender.due_on ? t.dueOn(formatDay(`${tender.due_on}T12:00:00Z`)) : null,
                  isPlan ? t.plan.withoutDpgf : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2.25rem]">{tender.name}</h1>
          </div>
          <StatusBadge tone="primary">{t.plan.planBadge}</StatusBadge>
        </div>
        {plan && step && (
          <PlanSteps
            tenderId={tender.id}
            current={step}
            reachable={reachable}
            checked={!!tender.quantities_checked_at}
            withFinishes={plan.rooms.length > 0 || plan.works.length === 0}
          />
        )}

        {query.dpgf === "ok" && (
          <Alert tone="success">
            {t.plan.created(
              Number(query.lots ?? 0),
              Number(query.postes ?? 0),
              Number(query.manque ?? 0),
            )}
          </Alert>
        )}
        {query.export === "verifier" && <Alert tone="error">{t.plan.exportBlocked}</Alert>}
        {Number(query.mesures ?? 0) > 0 && (
          <Alert tone="success">{t.plan.measure.saved(Number(query.mesures))}</Alert>
        )}
        {reading === "ok" ? (
          <Alert tone="success">
            {!isPlan
              ? t.importOk(Number(query.postes ?? 0), Number(query.prix ?? 0))
              : Number(query.ouvrages ?? 0) > 0
                ? t.plan.works.readOk(Number(query.ouvrages), Number(query.pieces ?? 0))
                : t.plan.readOk(Number(query.pieces ?? 0))}
          </Alert>
        ) : reading ? (
          <Alert tone="error">
            {isPlan
              ? (t.plan.status[reading] ?? t.plan.status.error)
              : (t.importStatus[reading] ?? t.importStatus.error)}
          </Alert>
        ) : null}
        {tender.source_kind === "pdf" && lines.length > 0 && (
          <Alert tone="info">{t.warnings.pdf}</Alert>
        )}
        {warnings.map((w) => (
          <Alert key={w} tone="info">
            {warningTexts[w]}
          </Alert>
        ))}

        {plan && measuring && (
          <PlanMeasure
            tenderId={tender.id}
            files={plan.files}
            traces={plan.traces}
            rooms={plan.rooms.map((r) => ({ id: r.id, name: r.name }))}
            trades={plan.trades}
          />
        )}
        {plan && step === "releve" && !measuring && (
          <>
            <Alert tone="info">{t.plan.responsibility}</Alert>
            {plan.rooms.length > 0 ? (
              <PlanReleve
                tenderId={tender.id}
                rooms={plan.rooms}
                counts={plan.counts}
                files={plan.files}
                traces={plan.traces}
                canMeasure={plan.files.some((f) =>
                  f.kind === "pdf" ? (f.pages ?? []).some((p) => p.url) : !!f.url,
                )}
                summary={
                  <>
                    {summaryCard}
                    {plan.control.length > 0 && (
                      <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
                        <h2 className="text-lg font-semibold">{t.plan.measure.controlTitle}</h2>
                        <p className="text-sm text-muted-foreground">
                          {t.plan.measure.controlLead(plan.control.length)}
                        </p>
                        <ul className="flex flex-col">
                          {plan.control.map((row) => (
                            <li
                              key={row.name}
                              className="flex items-center justify-between gap-3 border-t border-border py-1.5 text-sm"
                            >
                              <span className="min-w-0 flex-1 truncate">{row.name}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {t.plan.measure.controlRow(row.measured, row.traced)}
                              </span>
                              <b
                                className={`w-14 text-right tabular-nums ${row.wide ? "text-warning" : "text-success"}`}
                              >
                                {row.gap}
                              </b>
                            </li>
                          ))}
                        </ul>
                        <p className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                          <span>{t.plan.measure.controlMean}</span>
                          <span className="tabular-nums">{plan.controlMean}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t.plan.measure.controlNote}
                        </p>
                      </section>
                    )}
                  </>
                }
              />
            ) : plan.works.length === 0 ? (
              <div className="max-w-xl">{summaryCard}</div>
            ) : null}
            {plan.works.length > 0 && (
              <PlanWorks
                tenderId={tender.id}
                works={plan.works}
                trades={plan.trades}
                files={plan.files}
                pages={plan.pages}
                summary={summaryCard}
                withViewer={plan.rooms.length === 0}
                hasDpgf={lines.length > 0}
              />
            )}
          </>
        )}
        {plan && step === "revetements" && (
          <PlanFinishes tenderId={tender.id} rooms={plan.rooms} hasDpgf={lines.length > 0} />
        )}
        {plan && step === "dpgf" && (
          <p
            role="status"
            className="flex items-start gap-2.5 rounded-input border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t.plan.toVerify(plan.missing, plan.photo)}</span>
          </p>
        )}

        {plan && step === "dpgf" && (
          <PlanDpgfEditor
            tenderId={tender.id}
            lines={lines}
            vatRateBp={tender.vat_rate_bp}
            vatOptions={vatOptions}
            exportLocked={!tender.quantities_checked_at}
            checkSlot={
              <QuantitiesCheck tenderId={tender.id} checked={!!tender.quantities_checked_at} />
            }
          />
        )}
        {lines.length > 0 && !plan && (
          <TenderEditor
            tenderId={tender.id}
            lines={lines}
            vatRateBp={tender.vat_rate_bp}
            vatOptions={vatOptions}
            sourceKind={
              tender.source_kind === "xlsx" || tender.source_kind === "pdf"
                ? tender.source_kind
                : null
            }
          />
        )}

        {lines.length > 0 && (!plan || step === "dpgf") && (
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.toQuote.title} />
            <ol className="ml-5 flex list-decimal flex-col gap-1.5 text-sm text-label">
              {t.toQuote.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {pageUrl ? (
              <div className="flex flex-col gap-3">
                <CopySnippet
                  id="lien-fiche"
                  label={t.toQuote.link}
                  value={pageUrl}
                  copyLabel={t.toQuote.copy}
                  copiedLabel={t.toQuote.copied}
                />
                <a
                  href={`mailto:?subject=${encodeURIComponent(t.toQuote.subject(tender.name))}&body=${encodeURIComponent(t.toQuote.body(tender.name, pageUrl, company))}`}
                  className="self-start text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
                >
                  {t.toQuote.email}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.toQuote.noPage}</p>
            )}
          </Card>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.followTitle} />
            <form action={updateTender} className="flex flex-col gap-4">
              <input type="hidden" name="tenderId" value={tender.id} />
              <Field
                label={t.fields.name}
                name="name"
                required
                maxLength={160}
                defaultValue={tender.name}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t.fields.client}
                  name="client"
                  maxLength={160}
                  defaultValue={tender.client_name ?? ""}
                />
                <Field
                  label={t.fields.due}
                  name="due"
                  type="date"
                  defaultValue={tender.due_on ?? ""}
                />
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t.columns.status}
                <select name="status" defaultValue={tender.status} className={inputClasses}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t.status[s]}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="secondary" block={false} className="self-start">
                {t.followSave}
              </Button>
            </form>
          </Card>
          <Card className="flex flex-col gap-3">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-danger">
                {t.deleteTitle}
              </summary>
              <form action={deleteTender} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="tenderId" value={tender.id} />
                <p className="text-sm text-label">{t.deleteConfirm}</p>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  block={false}
                  className="self-start"
                >
                  {t.deleteYes}
                </Button>
              </form>
            </details>
          </Card>
        </div>
      </div>
    </main>
  );
}

/** Relevé, plans (liens signés d'une heure) et métiers d'un appel d'offres créé depuis les plans. */
async function planData(
  supabase: Awaited<ReturnType<typeof requireTeamPermission>>["supabase"],
  tender: {
    id: string;
    plan_files: unknown;
    plan_trades: string[];
    plan_counts: unknown;
    plan_scale: string | null;
    plan_pages: unknown;
    plan_levels: unknown;
    plan_traces: unknown;
  },
) {
  const entries = planFiles(tender.plan_files);
  const [rooms, works, { data: signed }, { data: trades }] = await Promise.all([
    getTenderRooms(supabase, tender.id),
    getTenderWorks(supabase, tender.id),
    entries.length
      ? supabase.storage.from("tender-files").createSignedUrls(
          // Plans, puis pages de PDF rendues en images, dans le même appel.
          [...entries.map((f) => f.path), ...entries.flatMap((f) => f.pages.map((p) => p.path))],
          3600,
        )
      : Promise.resolve({ data: [] as { signedUrl: string | null }[] }),
    supabase.from("trades").select("code, label").in("code", tender.plan_trades),
  ]);
  let next = entries.length;
  const files: PlanFileLink[] = entries.map((f, i) => ({
    name: f.name,
    kind: f.kind,
    url: signed?.[i]?.signedUrl ?? null,
    pages: f.pages.map((p) => ({ page: p.page, url: signed?.[next++]?.signedUrl ?? null })),
  }));
  const figures = planReadingFigures(
    rooms.map((r) => ({
      areaCm2: r.area_cm2,
      perimeterMm: r.perimeter_mm,
      heightMm: r.height_mm,
      source: r.source,
      uncertain: r.uncertain,
    })),
  );
  // Ouvrages mesurés (F-158) : types de pages reconnus, altitudes lues, origine des quantités.
  const pages = (Array.isArray(tender.plan_pages) ? tender.plan_pages : []) as PlanPage[];
  const levels = (Array.isArray(tender.plan_levels) ? tender.plan_levels : []) as {
    name: string;
    altitudeMm: number;
  }[];
  const measured = planWorksFigures(
    works.map((x) => ({
      quantityMilli: x.quantity_milli,
      source: x.source,
      uncertain: x.uncertain,
    })),
  );
  const tw = t.plan.works;
  // Mesure à l'échelle (F-159, lot 2) : tracés, pièces estimées, écart avec les pièces cotées.
  const traces = (Array.isArray(tender.plan_traces) ? tender.plan_traces : []) as PlanTrace[];
  const percent = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  });
  const m2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tenth = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  const gaps = traceControl(
    rooms.map((r) => ({
      name: r.name,
      file: r.file_index,
      page: r.page,
      areaCm2: r.area_cm2,
      source: r.source,
    })),
    traces,
  );
  const control = gaps.map((g) => ({
    name: g.name,
    measured: m2.format(g.areaCm2 / 10_000),
    traced: m2.format(g.tracedCm2 / 10_000),
    gap: `${percent.format(g.gapBp / 100)} %`,
    // Au-delà de 5 %, l'écart est signalé : le contour ou la cote est à regarder.
    wide: Math.abs(g.gapBp) > 500,
  }));
  const controlMean = gaps.length
    ? `${tenth.format(gaps.reduce((sum, g) => sum + Math.abs(g.gapBp), 0) / gaps.length / 100)} %`
    : "";
  const widest = traces.reduce((max, x) => Math.max(max, x.spreadBp), 0);
  const anchorCount = traces.reduce((sum, x) => sum + x.anchors.length, 0);
  const ok = { icon: CheckCircle2, tone: "text-success" };
  const warn = { icon: TriangleAlert, tone: "text-warning" };
  const ruler = { icon: Ruler, tone: "text-primary-strong" };
  const summary = [
    works.length && pages.length
      ? {
          ...ok,
          text: tw.summary.pages(
            pages.length,
            planPageTypes(pages)
              .map((type) => tw.pageTypes[type] ?? type)
              .join(", "),
          ),
        }
      : null,
    tender.plan_scale ? { ...ok, text: t.plan.summary.scale(tender.plan_scale) } : null,
    measured.written ? { ...ok, text: tw.summary.written(measured.written) } : null,
    works.length && levels.length
      ? {
          ...ok,
          text: tw.summary.levels(
            levels
              .map((l) => `${l.name.toLowerCase()} ${formatPlanMeasure(l.altitudeMm)}`)
              .join(", "),
          ),
        }
      : null,
    measured.computed ? { ...ruler, text: tw.summary.computed(measured.computed) } : null,
    measured.counted ? { ...ok, text: tw.summary.counted(measured.counted) } : null,
    measured.toCheck ? { ...warn, text: tw.summary.toCheck(measured.toCheck) } : null,
    measured.missing ? { ...warn, text: tw.summary.missing(measured.missing) } : null,
    figures.read ? { ...ok, text: t.plan.summary.read(figures.read) } : null,
    figures.computed
      ? {
          icon: Ruler,
          tone: "text-primary-strong",
          text: t.plan.summary.computed(figures.computed),
        }
      : null,
    traces.length
      ? {
          ...ok,
          text: t.plan.measure.summaryScale(anchorCount, tenth.format(widest / 100)),
        }
      : null,
    figures.estimated
      ? {
          icon: Ruler,
          tone: "text-warning",
          text: t.plan.measure.summaryEstimated(figures.estimated),
        }
      : null,
    figures.toCheck ? { ...warn, text: t.plan.summary.toCheck(figures.toCheck) } : null,
    figures.missing ? { ...warn, text: t.plan.summary.missing(figures.missing) } : null,
  ].filter((x): x is { icon: typeof CheckCircle2; tone: string; text: string } => x !== null);
  const counts =
    tender.plan_counts && typeof tender.plan_counts === "object"
      ? (tender.plan_counts as Record<string, number | null>)
      : {};
  const labels = new Map((trades ?? []).map((tr) => [tr.code, tr.label]));
  return {
    rooms,
    works,
    traces,
    control,
    controlMean,
    pages,
    files,
    counts,
    summary,
    trades: tender.plan_trades.map((code) => ({ code, label: labels.get(code) ?? code })),
  };
}

/** Postes à compléter et quantités tirées d'une photo (DPGF créé depuis les plans). */
function linesToVerify(
  lines: { kind: string; quantity_milli: number | null; quantity_source?: string | null }[],
) {
  const posts = lines.filter((l) => l.kind === "poste");
  return {
    missing: posts.filter((l) => l.quantity_milli === null).length,
    photo: posts.filter((l) => l.quantity_source === "photo").length,
  };
}
