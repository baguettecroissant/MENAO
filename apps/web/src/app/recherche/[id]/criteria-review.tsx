"use client";

import {
  BUDGET_TRANCHES,
  canSearchArtisans,
  detectUrgency,
  LIEU_TYPES,
  MAX_PROJECT_LOTS,
  MAX_PROJECT_PHOTOS,
  PROJECT_TEXT_MAX_LENGTH,
  SURFACE_TRANCHES,
  type CompletedSection,
} from "@menao/core";
import type { ProjectCriteriaInput } from "@menao/validation";
import {
  CalendarDays,
  Camera,
  Check,
  CircleCheck,
  CircleQuestionMark,
  Clock,
  FileText,
  House,
  type LucideIcon,
  MapPin,
  Paperclip,
  PenLine,
  Plus,
  Ruler,
  Search,
  Siren,
  TriangleAlert,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useState, useTransition, type ReactNode } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { TokenPicker } from "@/components/project/token-picker";
import { Alert, Button, Hint, Select, Tag, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  searchAddresses,
  searchCommunes,
  type AddressSuggestion,
  type CommuneSuggestion,
} from "@/lib/geo/geoplateforme";
import {
  deleteProjectPhoto,
  launchSearch,
  saveProjectCriteria,
  saveProjectLots,
  setProjectUrgency,
} from "@/lib/project/actions";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { PHOTO_ACCEPT, selectPhotos, uploadProjectPhoto } from "@/lib/project/photos";

const t = fr.search.review;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

type Labeled = { code: string; label: string };
type Section = "description" | "address" | "date" | "works" | "place" | "size" | "photos";
export type Criteria = ProjectCriteriaInput;
/** Urgence de la demande (ADR 0279) ; `manual` : choix du particulier, null s'il n'a rien réglé. */
export type Urgency = { active: boolean; manual: boolean | null };
/** Délai affiché : l'urgence passe avant le début souhaité. */
type Delay = "urgent" | Criteria["dateMode"];
type Status = { tone: "success" | "info"; text: string };
type ReanalysisResult =
  { status: "ok"; analysed: boolean; completed: CompletedSection[] } | { status: string };

const SECTION_TITLES: Record<CompletedSection, string> = {
  trade: t.trade.title,
  site: t.groups.site.title,
  address: t.address.title,
  date: t.date.title,
};

const DELAYS: { value: Delay; icon: LucideIcon; title: string; help: string }[] = [
  { value: "urgent", icon: Siren, title: t.date.urgent, help: t.date.urgentHelp },
  { value: "des_que_possible", icon: Zap, title: t.date.asap, help: t.date.asapHelp },
  { value: "date", icon: CalendarDays, title: t.date.from, help: t.date.fromHelp },
  { value: "inconnue", icon: CircleQuestionMark, title: t.date.later, help: t.date.laterHelp },
];

/**
 * Vérification des critères (F-07, refonte F-128, ADR 0279) : l'urgence en tête, puis deux groupes.
 * « L'essentiel » (métier, ville, délai) suffit pour lancer la recherche ; « Votre chantier » tient
 * en lignes : une information, sa valeur, une action. Chaque ligne s'ouvre sur place (Annuler /
 * Enregistrer). La description se modifie aussi : la nouvelle analyse complète les critères encore
 * vides (ADR 0044).
 */
export function CriteriaReview({
  projectId,
  description,
  analyzedAt,
  initial,
  urgency,
  trades,
  workTypes,
  rooms,
  photos,
  advisePhotos,
  suggestedLots,
  lotTrades,
  today,
}: {
  projectId: string;
  description: string;
  analyzedAt: string | null;
  initial: Criteria;
  urgency: Urgency;
  trades: Labeled[];
  workTypes: (Labeled & { trade: string })[];
  rooms: Labeled[];
  photos: { id: string; url: string | null }[];
  /** Description encore vague, sans photo (ADR 0163) : photos conseillées. */
  advisePhotos: boolean;
  /** Autres métiers proposés d'après la description (ADR 0167). */
  suggestedLots: string[];
  /** Autres métiers choisis par le particulier. */
  lotTrades: string[];
  today: string;
}) {
  const router = useRouter();
  const delayLabel = useId();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [urgent, setUrgent] = useState(urgency.active);
  const [manualUrgency, setManualUrgency] = useState(urgency.manual);
  const [text, setText] = useState(description);
  const [editing, setEditing] = useState<Section | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, startTransition] = useTransition();

  // Nouvelle analyse après une description modifiée : les critères complétés sont relus.
  const [analysis, setAnalysis] = useState(analyzedAt);
  if (analysis !== analyzedAt) {
    setAnalysis(analyzedAt);
    setSaved(initial);
    setDraft(initial);
    setUrgent(urgency.active);
    setManualUrgency(urgency.manual);
  }

  const label = (list: Labeled[], code: string | null | undefined) =>
    list.find((i) => i.code === code)?.label;

  function edit(section: Section) {
    setDraft(saved);
    setText(description);
    setEditing(section);
    setError(null);
    setStatus(null);
  }

  function done() {
    setEditing(null);
    setError(null);
    setStatus({ tone: "success", text: t.saved });
  }

  function persist(next: Criteria, after?: () => void) {
    startTransition(async () => {
      const result = await saveProjectCriteria(projectId, next);
      if (!result.ok) return setError(result.error);
      setSaved(next);
      setDraft(next);
      setError(null);
      setStatus({ tone: "success", text: t.saved });
      after?.();
    });
  }

  // Description : enregistrée et analysée de nouveau par analyze-need (ADR 0044).
  function saveDescription() {
    const next = text.trim();
    if (!next || next.length > PROJECT_TEXT_MAX_LENGTH) return setError(fr.search.errors.invalid);
    if (next === description.trim()) return setEditing(null);
    startTransition(async () => {
      const session = await ensureSession();
      if (!session) return setError(fr.search.errors.session);
      const result = await invokeFunction<ReanalysisResult>(session.supabase, "analyze-need", {
        projectId,
        description: next,
      });
      if (result.status !== "ok" || !("completed" in result)) {
        const key = result.status as keyof typeof fr.search.errors;
        return setError(
          result.status === "locked"
            ? t.text.locked
            : (fr.search.errors[key] ?? fr.search.errors.unavailable),
        );
      }
      setEditing(null);
      setError(null);
      setStatus(
        !result.analysed
          ? { tone: "info", text: t.text.notAnalysed }
          : {
              tone: "success",
              text: result.completed.length
                ? t.text.completed(result.completed.map((s) => SECTION_TITLES[s]).join(", "))
                : t.text.saved,
            },
      );
      router.refresh();
    });
  }

  // Métier : enregistré dès qu'il change (champ toujours visible).
  function changeTrade(tradeCode: string | null) {
    const allowed = new Set(workTypes.filter((w) => w.trade === tradeCode).map((w) => w.code));
    persist({
      ...saved,
      tradeCode,
      workTypeCodes: saved.workTypeCodes.filter((c) => allowed.has(c)),
    });
  }

  // Urgence retirée (bandeau, ou autre délai choisi) : le choix du particulier est gardé en base.
  async function clearUrgency(): Promise<boolean> {
    const result = await setProjectUrgency(projectId, false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setUrgent(false);
    setManualUrgency(false);
    return true;
  }

  // Délai : enregistré dès le choix, sauf « À partir d'une date » qui attend le jour.
  function chooseDelay(value: Delay) {
    setStatus(null);
    setError(null);
    if (value === "date") {
      setDraft({ ...saved, dateMode: "date" });
      return setEditing("date");
    }
    startTransition(async () => {
      if (value === "urgent") {
        const result = await setProjectUrgency(projectId, true);
        if (!result.ok) return setError(result.error);
        const next: Criteria = { ...saved, dateMode: "des_que_possible", dateSouhaitee: null };
        setSaved(next);
        setDraft(next);
        setUrgent(true);
        setManualUrgency(true);
        return done();
      }
      const next: Criteria = { ...saved, dateMode: value, dateSouhaitee: null };
      const result = await saveProjectCriteria(projectId, next);
      if (!result.ok) return setError(result.error);
      setSaved(next);
      setDraft(next);
      if (urgent && !(await clearUrgency())) return;
      done();
    });
  }

  function saveDate() {
    startTransition(async () => {
      const result = await saveProjectCriteria(projectId, draft);
      if (!result.ok) return setError(result.error);
      setSaved(draft);
      if (urgent && !(await clearUrgency())) return;
      done();
    });
  }

  function notUrgent() {
    setStatus(null);
    setError(null);
    startTransition(async () => {
      if (await clearUrgency()) done();
    });
  }

  function search() {
    startTransition(async () => {
      const result = await launchSearch(projectId);
      if (result && !result.ok) setError(result.error);
    });
  }

  const cancel = () => {
    setEditing(null);
    setError(null);
  };
  const rowProps = (section: Section) => ({
    editing: editing === section,
    locked: editing !== null && editing !== section,
    onEdit: () => edit(section),
    onCancel: cancel,
    onSave: () => persist(draft, () => setEditing(null)),
    pending,
    error: editing === section ? error : null,
  });

  const ready = canSearchArtisans({
    tradeCode: saved.tradeCode,
    villeCodeInsee: saved.ville?.code ?? null,
  });
  const workTags = saved.workTypeCodes
    .map((c) => label(workTypes, c))
    .filter((v): v is string => Boolean(v));
  const placeTags = [
    saved.lieuType ? fr.search.lieux[saved.lieuType] : null,
    ...saved.roomCodes.map((c) => label(rooms, c)),
  ].filter((v): v is string => Boolean(v));
  const sizeTags: string[] = [
    ...(saved.surface ? [fr.search.surfacesShort[saved.surface]] : []),
    ...(saved.budget ? [fr.search.budgets[saved.budget]] : []),
  ];
  const siteTags = [...workTags, ...placeTags, ...sizeTags];
  const cityLabel = saved.ville
    ? `${saved.ville.nom}${saved.ville.codePostal ? ` (${saved.ville.codePostal})` : ""}`
    : null;
  const startLabel =
    saved.dateMode === "date" && saved.dateSouhaitee
      ? t.date.startsOn(dayFormat.format(new Date(`${saved.dateSouhaitee}T00:00:00Z`)))
      : null;
  const delay: Delay = editing === "date" ? "date" : urgent ? "urgent" : saved.dateMode;
  const delayLocked = pending || (editing !== null && editing !== "date");
  // D'où vient l'urgence : le particulier l'a réglée, ou sa description la dit.
  const urgencyExcerpt = manualUrgency ? null : (detectUrgency(description)?.excerpt ?? null);
  const empty = <span className="font-medium text-muted-foreground">{t.optional}</span>;
  const tags = (list: string[]) => list.map((tag) => <Tag key={tag}>{tag}</Tag>);

  const searchButton = (
    <Button
      type="button"
      size="lg"
      onClick={search}
      disabled={!ready || editing !== null || pending}
    >
      {t.submit}
      <Search aria-hidden="true" className="size-4" />
    </Button>
  );

  return (
    <div className="grid items-start gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-7 lg:pb-0">
      <div className="flex min-w-0 flex-col gap-4">
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        {editing === null && error && <Alert tone="error">{error}</Alert>}

        {urgent && (
          <section
            aria-label={t.urgency.title}
            className="flex flex-col gap-3 rounded-[1.25rem] border border-danger/20 bg-danger-soft p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-[0.875rem] bg-surface text-danger sm:size-12"
              >
                <Siren className="size-5 sm:size-6" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-[1.0625rem] font-bold text-danger sm:text-lg">
                  {t.urgency.title}
                </h2>
                <p className="text-sm leading-snug text-label">
                  {manualUrgency
                    ? t.urgency.manual
                    : urgencyExcerpt
                      ? t.urgency.fromText(urgencyExcerpt)
                      : t.urgency.fromAnalysis}{" "}
                  {t.urgency.body}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={notUrgent}
              disabled={pending || editing !== null}
              className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-full border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-background disabled:opacity-50 sm:self-center"
            >
              {t.urgency.notUrgent}
            </button>
          </section>
        )}

        <Group title={t.groups.essential.title} description={t.groups.essential.description}>
          <Row
            icon={Wrench}
            title={t.trade.title}
            ok={Boolean(saved.tradeCode)}
            value={
              <div className="flex w-full max-w-sm flex-col gap-1.5 font-normal">
                <label htmlFor="tradeCode" className="sr-only">
                  {t.trade.label}
                </label>
                <Select
                  id="tradeCode"
                  value={saved.tradeCode ?? ""}
                  disabled={pending || editing !== null}
                  onChange={(e) => changeTrade(e.target.value || null)}
                >
                  <option value="">{t.trade.placeholder}</option>
                  {trades.map((trade) => (
                    <option key={trade.code} value={trade.code}>
                      {trade.label}
                    </option>
                  ))}
                </Select>
                {!saved.tradeCode && <Hint>{t.trade.help}</Hint>}
              </div>
            }
          />

          <Row
            icon={MapPin}
            title={t.address.title}
            label={saved.adresse ? t.address.title : t.summaryPlace}
            ok={Boolean(saved.ville)}
            value={
              saved.adresse ? (
                saved.adresse.label
              ) : cityLabel ? (
                <>
                  {cityLabel}
                  <span className="text-[0.8125rem] font-medium text-muted-foreground">
                    · {t.address.noStreet}
                  </span>
                </>
              ) : (
                <span className="font-medium text-muted-foreground">{t.notSet}</span>
              )
            }
            action={saved.adresse ? t.edit : saved.ville ? t.address.specify : t.add}
            plainAction={!saved.adresse && Boolean(saved.ville)}
            {...rowProps("address")}
          >
            <AddressEditor draft={draft} setDraft={setDraft} />
          </Row>

          <section aria-label={t.date.title} className="py-4 sm:py-[1.125rem]">
            <div className="flex items-center gap-3 sm:gap-4">
              <IconTile icon={Clock} tone={urgent ? "danger" : "primary"} />
              <p id={delayLabel} className="text-[0.8125rem] text-muted-foreground sm:text-sm">
                {t.date.legend}
              </p>
            </div>
            <div
              role="radiogroup"
              aria-labelledby={delayLabel}
              className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5 sm:pl-[3.75rem]"
            >
              {DELAYS.map(({ value, icon: Icon, title, help }) => {
                const checked = delay === value;
                const red = value === "urgent";
                return (
                  <label
                    key={value}
                    className={`flex min-h-14 cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 sm:gap-3 sm:px-4 sm:py-3.5 ${
                      checked
                        ? red
                          ? "border-danger bg-danger-soft ring-1 ring-danger"
                          : "border-primary bg-primary-soft ring-1 ring-primary"
                        : "border-border-strong bg-surface hover:bg-background"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delay"
                      value={value}
                      checked={checked}
                      disabled={delayLocked}
                      onChange={() => chooseDelay(value)}
                      className="sr-only"
                    />
                    <Icon
                      aria-hidden="true"
                      className={`size-5 shrink-0 ${checked && red ? "text-danger" : "text-foreground"}`}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={`text-sm leading-tight font-bold sm:text-[0.9375rem] ${
                          checked && red ? "text-danger" : "text-foreground"
                        }`}
                      >
                        {title}
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:block">{help}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`hidden size-[1.375rem] shrink-0 items-center justify-center rounded-full min-[26rem]:flex ${
                        checked
                          ? red
                            ? "bg-danger text-white"
                            : "bg-primary text-primary-foreground"
                          : "border border-border-strong"
                      }`}
                    >
                      {checked && <Check strokeWidth={3.2} className="size-3" />}
                    </span>
                  </label>
                );
              })}
            </div>
            {editing === "date" ? (
              <div className="mt-4 flex flex-col gap-3 sm:pl-[3.75rem]">
                <div className="flex max-w-xs flex-col gap-1.5">
                  <label htmlFor="dateSouhaitee" className="text-sm font-medium">
                    {t.date.pick}
                  </label>
                  <input
                    id="dateSouhaitee"
                    type="date"
                    min={today}
                    value={draft.dateSouhaitee ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, dateSouhaitee: e.target.value || null }))
                    }
                    className={`${inputClasses} bg-surface`}
                  />
                </div>
                {error && <Alert tone="error">{error}</Alert>}
                <EditorButtons onCancel={cancel} onSave={saveDate} pending={pending} />
              </div>
            ) : (
              delay === "date" &&
              startLabel && (
                <p className="mt-3 flex flex-wrap items-center gap-x-3 text-[0.9375rem] font-semibold sm:pl-[3.75rem]">
                  {startLabel}
                  <RowAction
                    label={t.edit}
                    aria={t.editLabel(t.date.title)}
                    onClick={() => edit("date")}
                    disabled={delayLocked}
                  />
                </p>
              )
            )}
          </section>
        </Group>

        <Group title={t.groups.site.title} description={t.groups.site.description}>
          <Row
            icon={FileText}
            title={t.yourText}
            value={<DescriptionText text={description} />}
            action={t.edit}
            {...rowProps("description")}
            onSave={saveDescription}
            savingLabel={t.text.analyzing}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="projectText" className="sr-only">
                {t.text.label}
              </label>
              <textarea
                id="projectText"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={PROJECT_TEXT_MAX_LENGTH}
                className={`${inputClasses} min-h-36 resize-y bg-surface py-3 leading-relaxed`}
              />
              <Hint>{t.text.help}</Hint>
            </div>
          </Row>

          <Row
            icon={PenLine}
            title={t.site.works}
            value={workTags.length ? tags(workTags) : empty}
            action={workTags.length ? t.edit : t.add}
            {...rowProps("works")}
          >
            {draft.tradeCode ? (
              <TokenPicker
                label={t.site.works}
                description={t.site.worksHelp}
                placeholder={t.site.worksFilter}
                options={workTypes.filter((w) => w.trade === draft.tradeCode)}
                selected={draft.workTypeCodes}
                onChange={(workTypeCodes) => setDraft((d) => ({ ...d, workTypeCodes }))}
              />
            ) : (
              <Hint>{t.site.worksNeedTrade}</Hint>
            )}
          </Row>

          <Row
            icon={House}
            title={t.site.place}
            value={
              placeTags.length ? (
                <>
                  {tags(placeTags)}
                  {!saved.lieuType && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {t.site.placeMissing}
                    </span>
                  )}
                </>
              ) : (
                empty
              )
            }
            action={!placeTags.length ? t.add : saved.lieuType ? t.edit : t.complete}
            {...rowProps("place")}
          >
            <Subsection title={t.site.lieu} description={t.site.lieuHelp}>
              <label htmlFor="lieuType" className="sr-only">
                {t.site.lieu}
              </label>
              <Select
                id="lieuType"
                value={draft.lieuType ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    lieuType: (e.target.value || null) as Criteria["lieuType"],
                  }))
                }
              >
                <option value="">{t.site.lieuPlaceholder}</option>
                {LIEU_TYPES.map((lieu) => (
                  <option key={lieu} value={lieu}>
                    {fr.search.lieux[lieu]}
                  </option>
                ))}
              </Select>
            </Subsection>
            <Subsection>
              <TokenPicker
                label={t.site.rooms}
                description={t.site.roomsHelp}
                placeholder={t.site.roomsFilter}
                options={rooms}
                selected={draft.roomCodes}
                onChange={(roomCodes) => setDraft((d) => ({ ...d, roomCodes }))}
              />
            </Subsection>
          </Row>

          <Row
            icon={Ruler}
            title={t.site.size}
            value={sizeTags.length ? tags(sizeTags) : empty}
            action={sizeTags.length ? t.edit : t.add}
            {...rowProps("size")}
          >
            <Subsection title={t.site.surface} description={t.site.surfaceHelp}>
              <label htmlFor="surface" className="sr-only">
                {t.site.surface}
              </label>
              <Select
                id="surface"
                value={draft.surface ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    surface: (e.target.value || null) as Criteria["surface"],
                  }))
                }
              >
                <option value="">{t.site.surfacePlaceholder}</option>
                {SURFACE_TRANCHES.map((s) => (
                  <option key={s} value={s}>
                    {fr.search.surfaces[s]}
                  </option>
                ))}
              </Select>
            </Subsection>
            <Subsection title={t.site.budget} description={t.site.budgetHelp}>
              <label htmlFor="budget" className="sr-only">
                {t.site.budget}
              </label>
              <Select
                id="budget"
                value={draft.budget ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    budget: (e.target.value || null) as Criteria["budget"],
                  }))
                }
              >
                <option value="">{t.site.budgetPlaceholder}</option>
                {BUDGET_TRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {fr.search.budgets[b]}
                  </option>
                ))}
              </Select>
            </Subsection>
          </Row>

          <PhotosRow
            projectId={projectId}
            photos={photos}
            advise={advisePhotos}
            onChange={() => router.refresh()}
            {...rowProps("photos")}
          />
        </Group>

        {saved.tradeCode && (
          <LotsCard
            projectId={projectId}
            mainTrade={saved.tradeCode}
            trades={trades}
            suggested={suggestedLots}
            initial={lotTrades}
          />
        )}
      </div>

      <aside className="flex flex-col gap-3.5 lg:sticky lg:top-24">
        <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border bg-surface p-5 shadow-[0_10px_30px_rgb(17_23_40/0.07)] sm:p-6">
          <h2 className="text-xl font-bold tracking-tight">{t.summaryTitle}</h2>
          <dl className="flex flex-col divide-y divide-border border-y border-border text-[0.9375rem]">
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-muted-foreground">{t.trade.title}</dt>
              <dd className="text-right font-bold">
                {saved.tradeCode ? label(trades, saved.tradeCode) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-muted-foreground">{t.summaryPlace}</dt>
              <dd className="text-right font-bold">{saved.ville?.nom ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-muted-foreground">{t.summaryDelay}</dt>
              <dd
                className={`inline-flex items-center gap-1.5 text-right font-bold ${urgent ? "text-danger" : ""}`}
              >
                {urgent && <Siren aria-hidden="true" className="size-4" />}
                {urgent
                  ? t.date.urgent
                  : (startLabel ??
                    (saved.dateMode === "des_que_possible" ? t.date.asap : t.date.later))}
              </dd>
            </div>
          </dl>
          {siteTags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {siteTags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-chip bg-background px-2.5 py-1 text-xs font-semibold text-label"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <div className="hidden flex-col lg:flex">{searchButton}</div>
          {!ready && <p className="text-sm text-muted-foreground">{t.submitHint}</p>}
          <p className="flex items-center justify-center gap-2 text-[0.8125rem] text-muted-foreground">
            <CircleCheck aria-hidden="true" className="size-4 text-success" />
            {t.free}
          </p>
        </div>
        {urgent && (
          <p className="flex items-start gap-2 px-1 text-[0.8125rem] leading-snug text-muted-foreground">
            <TriangleAlert aria-hidden="true" className="mt-px size-4 shrink-0" />
            {fr.search.urgency.danger}
          </p>
        )}
      </aside>

      {/* Téléphone : le bouton de recherche reste collé en bas de l'écran. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col border-t border-border bg-surface px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(17_23_40/0.08)] lg:hidden">
        {searchButton}
      </div>
    </div>
  );
}

/** Groupe de lignes : « L'essentiel », « Votre chantier ». */
function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface px-4 pt-5 pb-1 shadow-card sm:px-7 sm:pt-6">
      <div className="flex flex-col gap-1 pb-1">
        <h2 className="text-xl font-bold tracking-tight sm:text-[1.4375rem]">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </div>
  );
}

function IconTile({
  icon: Icon,
  tone = "primary",
}: {
  icon: LucideIcon;
  tone?: "primary" | "danger";
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-10 shrink-0 items-center justify-center rounded-[0.875rem] sm:size-11 ${
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-strong"
      }`}
    >
      <Icon className="size-[1.125rem] sm:size-5" />
    </span>
  );
}

/** Action d'une ligne, en lien bleu (cible de 44 px au toucher). */
function RowAction({
  label,
  aria,
  onClick,
  disabled,
}: {
  label: string;
  aria?: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-1 text-sm font-semibold text-primary-strong hover:underline disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function EditorButtons({
  onCancel,
  onSave,
  pending,
  savingLabel = t.saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  savingLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" block={false} onClick={onCancel}>
        {t.cancel}
      </Button>
      <Button type="button" size="sm" block={false} onClick={onSave} disabled={pending}>
        {pending ? savingLabel : t.save}
      </Button>
    </div>
  );
}

/**
 * Une ligne : pictogramme, libellé, valeur, action. L'action ouvre l'éditeur sous la ligne
 * (Annuler / Enregistrer) ; sans action, la valeur est elle-même le champ (métier).
 */
function Row({
  icon,
  title,
  label = title,
  ok = false,
  value,
  action,
  plainAction = false,
  editing = false,
  locked = false,
  onEdit,
  onCancel,
  onSave,
  pending = false,
  error = null,
  savingLabel,
  children,
}: {
  icon: LucideIcon;
  /** Nom de la rubrique (lecteurs d'écran) ; `label` : libellé affiché, s'il diffère. */
  title: string;
  label?: string;
  /** Information obligatoire renseignée. */
  ok?: boolean;
  value: ReactNode;
  action?: string;
  /** Action qui se comprend seule (« Préciser l'adresse ») : pas de nom complété. */
  plainAction?: boolean;
  editing?: boolean;
  locked?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  pending?: boolean;
  error?: string | null;
  savingLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section aria-label={title} className="py-4 sm:py-[1.125rem]">
      <div className="flex items-center gap-3 sm:gap-4">
        <IconTile icon={icon} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground sm:text-sm">
            {label}
            {ok && (
              <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[0.6875rem] leading-none font-bold tracking-wide text-success">
                {t.ok}
              </span>
            )}
          </p>
          {!editing && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[0.9375rem] font-semibold sm:text-base">
              {value}
            </div>
          )}
        </div>
        {!editing && action && onEdit && (
          <RowAction
            label={action}
            aria={plainAction ? undefined : `${action} : ${title}`}
            onClick={onEdit}
            disabled={locked}
          />
        )}
      </div>
      {editing && onCancel && onSave && (
        <div className="mt-4 flex flex-col sm:pl-[3.75rem]">
          {children}
          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <div className="mt-5">
            <EditorButtons
              onCancel={onCancel}
              onSave={onSave}
              pending={pending}
              savingLabel={savingLabel}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Autres métiers du chantier (ADR 0167) : ceux proposés d'après la description, cochés par le
 * particulier, ou ajoutés par lui. Enregistrés aussitôt ; chacun devient un lot au lancement de la
 * recherche. Rien de proposé ni de choisi : la carte reste repliée, en bas de page (ADR 0279).
 */
function LotsCard({
  projectId,
  mainTrade,
  trades,
  suggested,
  initial,
}: {
  projectId: string;
  mainTrade: string;
  trades: Labeled[];
  suggested: string[];
  initial: string[];
}) {
  const [selected, setSelected] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = (code: string) => trades.find((tr) => tr.code === code)?.label ?? code;
  const proposed = suggested.filter((c) => c !== mainTrade);
  const listed = [...proposed, ...selected.filter((c) => !proposed.includes(c) && c !== mainTrade)];
  const chosen = selected.filter((c) => c !== mainTrade);
  const full = chosen.length >= MAX_PROJECT_LOTS;
  const addable = trades.filter((tr) => tr.code !== mainTrade && !listed.includes(tr.code));
  const [open, setOpen] = useState(listed.length > 0);

  function save(next: string[]) {
    const previous = selected;
    setSelected(next);
    startTransition(async () => {
      const result = await saveProjectLots(projectId, next);
      if (result.ok) return setError(null);
      setSelected(previous);
      setError(result.error);
    });
  }

  return (
    <section
      aria-label={t.lots.title}
      className={`rounded-[1.25rem] border bg-surface p-4 sm:px-6 sm:py-5 ${
        open ? "border-border shadow-card" : "border-dashed border-border-strong"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[0.875rem] bg-background text-label sm:size-11"
          >
            <Users className="size-[1.125rem] sm:size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-base font-bold">{t.lots.title}</h2>
            <p className="text-sm text-muted-foreground">
              {proposed.length ? t.lots.suggested : t.lots.none}
            </p>
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-lg px-1 text-sm font-semibold text-primary-strong hover:underline sm:self-center"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t.lots.add}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col sm:pl-[3.75rem]">
          {listed.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {listed.map((code) => {
                const checked = selected.includes(code);
                return (
                  <li key={code}>
                    <label
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-sm transition-colors ${
                        checked
                          ? "border-primary bg-primary-softer font-medium text-primary-strong"
                          : "border-border bg-surface hover:bg-background"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={pending || (!checked && full)}
                        onChange={(e) =>
                          save(
                            e.target.checked
                              ? [...selected, code]
                              : selected.filter((c) => c !== code),
                          )
                        }
                        className="size-4 accent-[var(--color-primary)]"
                      />
                      {label(code)}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {!full && addable.length > 0 && (
            <div className="mt-4 flex max-w-xs flex-col gap-1.5">
              <label htmlFor="lot-add" className="text-sm font-medium">
                {t.lots.add}
              </label>
              <Select
                id="lot-add"
                value=""
                disabled={pending}
                onChange={(e) => e.target.value && save([...selected, e.target.value])}
              >
                <option value="">{t.lots.addPlaceholder}</option>
                {addable.map((tr) => (
                  <option key={tr.code} value={tr.code}>
                    {tr.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="mt-3">
            <Hint>{full ? t.lots.limit : t.lots.independent}</Hint>
          </div>
          {error && (
            <div className="mt-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Description du particulier : les textes longs sont repliés sur quatre lignes. */
function DescriptionText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280 || text.split("\n").length > 4;
  return (
    <div className="flex w-full flex-col items-start gap-1">
      <p
        className={`text-[0.9375rem] font-medium whitespace-pre-line text-foreground ${long && !open ? "line-clamp-4" : ""}`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="text-sm font-medium text-primary hover:text-primary-strong"
        >
          {open ? t.text.less : t.text.more}
        </button>
      )}
    </div>
  );
}

/** Sous-partie d'une ligne en édition, séparée par un filet. */
function Subsection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border py-5 first:border-t-0 first:pt-0 last:pb-0">
      {title && (
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function AddressEditor({
  draft,
  setDraft,
}: {
  draft: Criteria;
  setDraft: React.Dispatch<React.SetStateAction<Criteria>>;
}) {
  const citycode = draft.ville?.code;
  const searchInCity = useCallback(
    (q: string, signal: AbortSignal) => searchAddresses(q, signal, citycode),
    [citycode],
  );
  return (
    <>
      <Subsection>
        <Autocomplete<CommuneSuggestion>
          label={t.address.city}
          hint={t.address.cityHint}
          defaultQuery={draft.ville?.nom ?? ""}
          search={searchCommunes}
          getKey={(c) => c.code}
          getLabel={(c) => (c.postcode ? `${c.nom} (${c.postcode})` : c.nom)}
          onSelect={(c) =>
            setDraft((d) => ({
              ...d,
              ville: {
                code: c.code,
                nom: c.nom,
                codePostal: c.postcode ?? null,
                lon: c.lon,
                lat: c.lat,
              },
              adresse: d.ville?.code === c.code ? d.adresse : null,
            }))
          }
        />
      </Subsection>
      <Subsection>
        {citycode ? (
          <div className="flex flex-col gap-2">
            <Autocomplete<AddressSuggestion>
              key={citycode}
              label={t.address.street}
              hint={t.address.streetHint}
              placeholder={t.address.streetPlaceholder}
              searchIcon
              defaultQuery={draft.adresse?.label ?? ""}
              search={searchInCity}
              getKey={(a) => `${a.label}-${a.lon}-${a.lat}`}
              getLabel={(a) => a.label}
              onSelect={(a) =>
                setDraft((d) => ({
                  ...d,
                  adresse: { label: a.label, citycode: a.citycode, lon: a.lon, lat: a.lat },
                }))
              }
            />
            {draft.adresse && (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, adresse: null }))}
                className="self-start text-xs font-medium text-primary-strong hover:underline"
              >
                {t.address.clear}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t.address.street}</p>
            <Hint>{t.address.streetNeedCity}</Hint>
          </div>
        )}
      </Subsection>
    </>
  );
}

function PhotosRow({
  projectId,
  photos,
  advise,
  onChange,
  editing,
  locked,
  onEdit,
  onCancel,
}: {
  projectId: string;
  photos: { id: string; url: string | null }[];
  advise: boolean;
  onChange: () => void;
  editing: boolean;
  locked: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function add(files: File[]) {
    const selection = selectPhotos(files, photos.length, fr.search.photos);
    setErrors(selection.errors);
    if (!selection.accepted.length) return;
    setBusy(true);
    const session = await ensureSession();
    const failures: string[] = [];
    for (const file of selection.accepted) {
      const status = session ? await uploadProjectPhoto(session, projectId, file) : "unavailable";
      if (status === "unreadable") failures.push(fr.search.photos.unreadable(file.name));
      else if (status !== "ok") failures.push(fr.search.upload[status]);
    }
    setErrors((prev) => [...new Set([...prev, ...failures])]);
    setBusy(false);
    onChange();
  }

  async function remove(photoId: string) {
    setBusy(true);
    const result = await deleteProjectPhoto(projectId, photoId);
    if (!result.ok) setErrors([result.error]);
    setBusy(false);
    onChange();
  }

  const thumbnails = (removable: boolean) => (
    <ul className="flex flex-wrap gap-3">
      {photos.map((photo, index) => (
        <li key={photo.id} className="relative">
          {photo.url && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
            <img
              src={photo.url}
              alt={t.photos.alt(index + 1)}
              className={`rounded-lg object-cover ${removable ? "size-16 sm:size-[4.5rem]" : "size-12"}`}
            />
          )}
          {removable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(photo.id)}
              aria-label={`${t.photos.delete} — ${t.photos.alt(index + 1)}`}
              className="absolute -top-1.5 -right-1.5 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-white shadow-raised disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label={t.photos.title} className="py-4 sm:py-[1.125rem]">
      <div className="flex items-center gap-3 sm:gap-4">
        <IconTile icon={Camera} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[0.8125rem] text-muted-foreground sm:text-sm">{t.photos.title}</p>
          {!editing &&
            (photos.length ? (
              thumbnails(false)
            ) : (
              <p className="text-[0.9375rem] font-medium text-muted-foreground">{t.photos.none}</p>
            ))}
        </div>
        {!editing && (
          <RowAction
            label={photos.length ? t.edit : t.photos.add}
            aria={photos.length ? t.editLabel(t.photos.title) : undefined}
            onClick={onEdit}
            disabled={locked}
          />
        )}
      </div>
      {(errors.length > 0 || (advise && photos.length === 0)) && (
        <div className="mt-3 flex flex-col gap-2 sm:pl-[3.75rem]">
          {advise && photos.length === 0 && <Alert tone="info">{t.photos.advice}</Alert>}
          {errors.map((message) => (
            <Alert key={message} tone="error">
              {message}
            </Alert>
          ))}
        </div>
      )}
      {editing && (
        <div className="mt-4 flex flex-col gap-4 sm:pl-[3.75rem]">
          <p className="text-xs text-muted-foreground">{t.photos.addHelp}</p>
          {photos.length < MAX_PROJECT_PHOTOS ? (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                if (!busy) void add(Array.from(e.dataTransfer.files));
              }}
              className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-input border border-dashed text-sm transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 ${
                over
                  ? "border-primary bg-primary-soft text-primary-strong"
                  : "border-border-strong text-muted-foreground"
              }`}
            >
              <Paperclip aria-hidden="true" className="size-4" />
              <span>{fr.search.dropHere}</span>
              <span className="sr-only">{fr.search.photos.add}</span>
              <input
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                disabled={busy}
                className="sr-only"
                onChange={(e) => {
                  void add(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <Hint>{t.photos.limit}</Hint>
          )}
          {photos.length > 0 && thumbnails(true)}
          <div className="flex justify-end">
            <Button type="button" size="sm" block={false} onClick={onCancel} disabled={busy}>
              {t.done}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
