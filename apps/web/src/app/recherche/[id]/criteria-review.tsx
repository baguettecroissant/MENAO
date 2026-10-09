"use client";

import { canSearchArtisans, LIEU_TYPES, MAX_PROJECT_PHOTOS, SURFACE_TRANCHES } from "@menao/core";
import type { ProjectCriteriaInput } from "@menao/validation";
import {
  Calendar,
  Camera,
  MapPin,
  Paperclip,
  Search,
  SquarePen,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition, type ReactNode } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { TokenPicker } from "@/components/project/token-picker";
import { Alert, Button, Hint, RadioGroup, Select, Tag, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  searchAddresses,
  searchCommunes,
  type AddressSuggestion,
  type CommuneSuggestion,
} from "@/lib/geo/geoplateforme";
import { deleteProjectPhoto, launchSearch, saveProjectCriteria } from "@/lib/project/actions";
import { ensureSession } from "@/lib/project/client";
import { PHOTO_ACCEPT, selectPhotos, uploadProjectPhoto } from "@/lib/project/photos";

const t = fr.search.review;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

type Labeled = { code: string; label: string };
type Section = "site" | "address" | "date" | "photos";
export type Criteria = ProjectCriteriaInput;

/**
 * Vérification des critères (F-07), maquettes « Vérifiez vos critères de recherche » : cinq cartes,
 * résumé en puces, édition carte par carte (Annuler / Enregistrer).
 */
export function CriteriaReview({
  projectId,
  initial,
  trades,
  workTypes,
  rooms,
  photos,
  today,
}: {
  projectId: string;
  initial: Criteria;
  trades: Labeled[];
  workTypes: (Labeled & { trade: string })[];
  rooms: Labeled[];
  photos: { id: string; url: string | null }[];
  today: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState<Section | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const label = (list: Labeled[], code: string | null | undefined) =>
    list.find((i) => i.code === code)?.label;

  function edit(section: Section) {
    setDraft(saved);
    setEditing(section);
    setError(null);
    setStatus(null);
  }

  function persist(next: Criteria, after?: () => void) {
    startTransition(async () => {
      const result = await saveProjectCriteria(projectId, next);
      if (!result.ok) return setError(result.error);
      setSaved(next);
      setDraft(next);
      setError(null);
      setStatus(t.saved);
      after?.();
    });
  }

  // Métier : enregistré dès qu'il change (maquettes : champ toujours visible).
  function changeTrade(tradeCode: string | null) {
    const allowed = new Set(workTypes.filter((w) => w.trade === tradeCode).map((w) => w.code));
    persist({
      ...saved,
      tradeCode,
      workTypeCodes: saved.workTypeCodes.filter((c) => allowed.has(c)),
    });
  }

  function search() {
    startTransition(async () => {
      const result = await launchSearch(projectId);
      if (result && !result.ok) setError(result.error);
    });
  }

  const cardProps = (section: Section) => ({
    editing: editing === section,
    locked: editing !== null && editing !== section,
    onEdit: () => edit(section),
    onCancel: () => {
      setEditing(null);
      setError(null);
    },
    onSave: () => persist(draft, () => setEditing(null)),
    pending,
    error: editing === section ? error : null,
  });

  const ready = canSearchArtisans({
    tradeCode: saved.tradeCode,
    villeCodeInsee: saved.ville?.code ?? null,
  });
  const siteTags = [
    saved.lieuType ? fr.search.lieux[saved.lieuType] : null,
    ...saved.workTypeCodes.map((c) => label(workTypes, c)),
    ...saved.roomCodes.map((c) => label(rooms, c)),
    saved.surface ? fr.search.surfacesShort[saved.surface] : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <div className="flex flex-col gap-4">
      {status && <Alert tone="success">{status}</Alert>}

      <section
        aria-label={t.trade.title}
        className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
      >
        <SectionHeading icon={<User />} title={t.trade.title} description={t.trade.description} />
        <div className="mt-4 flex flex-col gap-2">
          <label htmlFor="tradeCode" className="sr-only">
            {t.trade.label}
          </label>
          <Select
            id="tradeCode"
            value={saved.tradeCode ?? ""}
            disabled={pending}
            onChange={(e) => changeTrade(e.target.value || null)}
          >
            <option value="">{t.trade.placeholder}</option>
            {trades.map((trade) => (
              <option key={trade.code} value={trade.code}>
                {trade.label}
              </option>
            ))}
          </Select>
          <Hint>{t.trade.help}</Hint>
        </div>
        {editing === null && error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
      </section>

      <EditableCard
        icon={<Wrench />}
        title={t.site.title}
        description={t.site.description}
        summary={siteTags.length ? siteTags.map((tag) => <Tag key={tag}>{tag}</Tag>) : null}
        {...cardProps("site")}
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
        <Subsection>
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
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{t.site.works}</p>
              <Hint>{t.site.worksNeedTrade}</Hint>
            </div>
          )}
        </Subsection>
        <Subsection title={t.site.surface} description={t.site.surfaceHelp}>
          <label htmlFor="surface" className="sr-only">
            {t.site.surface}
          </label>
          <Select
            id="surface"
            value={draft.surface ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, surface: (e.target.value || null) as Criteria["surface"] }))
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
      </EditableCard>

      <EditableCard
        icon={<MapPin />}
        title={t.address.title}
        description={t.address.description}
        summary={
          saved.ville
            ? [
                <Tag key="ville">
                  {saved.ville.nom}
                  {saved.ville.codePostal ? ` (${saved.ville.codePostal})` : ""}
                </Tag>,
                saved.adresse ? <Tag key="adresse">{saved.adresse.label}</Tag> : null,
              ]
            : null
        }
        {...cardProps("address")}
      >
        <AddressEditor draft={draft} setDraft={setDraft} />
      </EditableCard>

      <EditableCard
        icon={<Calendar />}
        title={t.date.title}
        description={t.date.description}
        summary={
          <Tag>
            {saved.dateMode === "date" && saved.dateSouhaitee
              ? t.date.startsOn(dayFormat.format(new Date(`${saved.dateSouhaitee}T00:00:00Z`)))
              : saved.dateMode === "des_que_possible"
                ? t.date.asap
                : t.date.unknown}
          </Tag>
        }
        {...cardProps("date")}
      >
        <Subsection>
          <RadioGroup
            legend={t.date.legend}
            hideLegend
            name="dateMode"
            value={draft.dateMode}
            onChange={(v) => setDraft((d) => ({ ...d, dateMode: v as Criteria["dateMode"] }))}
            options={[
              { value: "des_que_possible", label: t.date.asap },
              { value: "date", label: t.date.precise },
              { value: "inconnue", label: t.date.unknown },
            ]}
            renderSelected={(value) =>
              value === "date" ? (
                <div className="flex flex-col gap-1.5">
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
              ) : null
            }
          />
        </Subsection>
      </EditableCard>

      <PhotosCard
        projectId={projectId}
        photos={photos}
        onChange={() => router.refresh()}
        {...cardProps("photos")}
      />

      <div className="mt-2 flex flex-col items-end gap-2">
        <Button
          type="button"
          size="lg"
          block={false}
          onClick={search}
          disabled={!ready || editing !== null || pending}
          className="w-full sm:w-auto"
        >
          {t.submit}
          <Search aria-hidden="true" className="size-4" />
        </Button>
        {!ready && <p className="text-sm text-muted-foreground">{t.submitHint}</p>}
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="flex items-center gap-2 text-[1.0625rem] font-medium">
          <span aria-hidden="true" className="text-primary [&>svg]:size-[1.125rem]">
            {icon}
          </span>
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EditButton({
  title,
  onClick,
  disabled,
}: {
  title: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t.editLabel(title)}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm text-foreground hover:text-primary-strong disabled:opacity-40 sm:px-3"
    >
      <SquarePen aria-hidden="true" className="size-5 text-primary sm:hidden" />
      <span className="hidden text-xs sm:inline">{t.edit}</span>
    </button>
  );
}

function EditableCard({
  icon,
  title,
  description,
  summary,
  editing,
  locked,
  onEdit,
  onCancel,
  onSave,
  pending,
  error,
  children,
  footer,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  summary: ReactNode;
  editing: boolean;
  locked: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <SectionHeading
        icon={icon}
        title={title}
        description={description}
        action={!editing && <EditButton title={title} onClick={onEdit} disabled={locked} />}
      />
      {!editing && summary && <div className="mt-4 flex flex-wrap gap-2">{summary}</div>}
      {editing && (
        <div className="mt-5 flex flex-col">
          {children}
          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <div className="mt-5 flex items-center justify-end gap-2">
            {footer ?? (
              <>
                <Button type="button" variant="ghost" size="sm" block={false} onClick={onCancel}>
                  {t.cancel}
                </Button>
                <Button type="button" size="sm" block={false} onClick={onSave} disabled={pending}>
                  {pending ? t.saving : t.save}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Sous-partie d'une carte en édition, séparée par un filet (maquettes). */
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

function PhotosCard({
  projectId,
  photos,
  onChange,
  editing,
  locked,
  onEdit,
  onCancel,
}: {
  projectId: string;
  photos: { id: string; url: string | null }[];
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
              className="size-16 rounded-lg object-cover sm:size-[4.5rem]"
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
    <section
      aria-label={t.photos.title}
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <SectionHeading
        icon={<Camera />}
        title={t.photos.title}
        description={t.photos.description}
        action={
          !editing && <EditButton title={t.photos.title} onClick={onEdit} disabled={locked} />
        }
      />
      {errors.map((message) => (
        <div key={message} className="mt-3">
          <Alert tone="error">{message}</Alert>
        </div>
      ))}
      {!editing ? (
        <div className="mt-4">
          {photos.length ? (
            thumbnails(false)
          ) : (
            <p className="text-sm text-muted-foreground">{t.photos.none}</p>
          )}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">{t.photos.add}</p>
            <p className="text-xs text-muted-foreground">{t.photos.addHelp}</p>
          </div>
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
