"use client";

import { canSearchArtisans, LIEU_TYPES, MAX_PROJECT_PHOTOS, SURFACE_TRANCHES } from "@menao/core";
import type { ProjectCriteriaInput } from "@menao/validation";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition, type ReactNode } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { PhotoDropzone } from "@/components/project/photo-dropzone";
import { Alert, Button, RadioGroup, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  searchAddresses,
  searchCommunes,
  type AddressSuggestion,
  type CommuneSuggestion,
} from "@/lib/geo/geoplateforme";
import { deleteProjectPhoto, launchSearch, saveProjectCriteria } from "@/lib/project/actions";
import { ensureSession } from "@/lib/project/client";
import { selectPhotos, uploadProjectPhoto } from "@/lib/project/photos";

const t = fr.search.review;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

type Labeled = { code: string; label: string };
type Section = "trade" | "site" | "address" | "date";
export type Criteria = ProjectCriteriaInput;

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

  function save() {
    startTransition(async () => {
      const result = await saveProjectCriteria(projectId, draft);
      if (!result.ok) return setError(result.error);
      setSaved(draft);
      setEditing(null);
      setError(null);
      setStatus(t.saved);
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
    onSave: save,
    pending,
    error: editing === section ? error : null,
  });

  const ready = canSearchArtisans({
    tradeCode: saved.tradeCode,
    villeCodeInsee: saved.ville?.code ?? null,
  });

  return (
    <div className="flex flex-col gap-4">
      {status && <Alert tone="success">{status}</Alert>}

      <Card
        title={t.trade.title}
        summary={label(trades, saved.tradeCode) ?? t.notSet}
        {...cardProps("trade")}
      >
        <SelectField
          label={t.trade.label}
          name="tradeCode"
          value={draft.tradeCode ?? ""}
          onChange={(e) => {
            const tradeCode = e.target.value || null;
            const allowed = new Set(
              workTypes.filter((w) => w.trade === tradeCode).map((w) => w.code),
            );
            setDraft((d) => ({
              ...d,
              tradeCode,
              workTypeCodes: d.workTypeCodes.filter((c) => allowed.has(c)),
            }));
          }}
        >
          <option value="">{t.trade.placeholder}</option>
          {trades.map((trade) => (
            <option key={trade.code} value={trade.code}>
              {trade.label}
            </option>
          ))}
        </SelectField>
        <p className="text-sm text-muted-foreground">{t.trade.help}</p>
      </Card>

      <Card
        title={t.site.title}
        summary={
          [
            saved.lieuType ? fr.search.lieux[saved.lieuType] : null,
            saved.roomCodes
              .map((c) => label(rooms, c))
              .filter(Boolean)
              .join(", ") || null,
            saved.workTypeCodes
              .map((c) => label(workTypes, c))
              .filter(Boolean)
              .join(", ") || null,
            saved.surface ? fr.search.surfaces[saved.surface] : null,
          ]
            .filter(Boolean)
            .join(" · ") || t.notSet
        }
        {...cardProps("site")}
      >
        <SelectField
          label={t.site.lieu}
          name="lieuType"
          value={draft.lieuType ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, lieuType: (e.target.value || null) as Criteria["lieuType"] }))
          }
        >
          <option value="">{t.site.lieuPlaceholder}</option>
          {LIEU_TYPES.map((lieu) => (
            <option key={lieu} value={lieu}>
              {fr.search.lieux[lieu]}
            </option>
          ))}
        </SelectField>
        <ChipPicker
          legend={t.site.rooms}
          filterLabel={t.site.roomsFilter}
          options={rooms}
          selected={draft.roomCodes}
          onChange={(roomCodes) => setDraft((d) => ({ ...d, roomCodes }))}
        />
        {draft.tradeCode ? (
          <ChipPicker
            legend={t.site.works}
            filterLabel={t.site.worksFilter}
            options={workTypes.filter((w) => w.trade === draft.tradeCode)}
            selected={draft.workTypeCodes}
            onChange={(workTypeCodes) => setDraft((d) => ({ ...d, workTypeCodes }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.site.works} : {t.site.worksNeedTrade}
          </p>
        )}
        <SelectField
          label={t.site.surface}
          name="surface"
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
        </SelectField>
      </Card>

      <Card
        title={t.address.title}
        summary={
          [
            saved.ville
              ? `${saved.ville.nom}${saved.ville.codePostal ? ` (${saved.ville.codePostal})` : ""}`
              : null,
            saved.adresse?.label,
          ]
            .filter(Boolean)
            .join(" — ") || t.notSet
        }
        {...cardProps("address")}
      >
        <AddressEditor draft={draft} setDraft={setDraft} />
      </Card>

      <Card
        title={t.date.title}
        summary={
          saved.dateMode === "date" && saved.dateSouhaitee
            ? dayFormat.format(new Date(`${saved.dateSouhaitee}T00:00:00Z`))
            : saved.dateMode === "des_que_possible"
              ? t.date.asap
              : t.date.unknown
        }
        {...cardProps("date")}
      >
        <RadioGroup
          legend={t.date.legend}
          name="dateMode"
          value={draft.dateMode}
          onChange={(v) => setDraft((d) => ({ ...d, dateMode: v as Criteria["dateMode"] }))}
          options={[
            { value: "des_que_possible", label: t.date.asap },
            { value: "date", label: t.date.precise },
            { value: "inconnue", label: t.date.unknown },
          ]}
        />
        {draft.dateMode === "date" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="dateSouhaitee" className="font-medium">
              {t.date.pick}
            </label>
            <input
              id="dateSouhaitee"
              type="date"
              min={today}
              value={draft.dateSouhaitee ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, dateSouhaitee: e.target.value || null }))}
              className="min-h-touch rounded-button border border-border bg-surface px-3"
            />
          </div>
        )}
      </Card>

      <PhotosCard projectId={projectId} photos={photos} onChange={() => router.refresh()} />

      {editing === null && error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={search} disabled={!ready || editing !== null || pending}>
          {t.submit}
        </Button>
        {!ready && <p className="text-center text-sm text-muted-foreground">{t.submitHint}</p>}
      </div>
    </div>
  );
}

function Card({
  title,
  summary,
  editing,
  locked,
  onEdit,
  onCancel,
  onSave,
  pending,
  error,
  children,
}: {
  title: string;
  summary: string;
  editing: boolean;
  locked: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {!editing && <p className="text-muted-foreground">{summary}</p>}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            disabled={locked}
            aria-label={t.editLabel(title)}
            className="inline-flex min-h-touch shrink-0 items-center gap-2 rounded-button px-3 font-medium text-primary hover:bg-primary-soft disabled:opacity-40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">{t.edit}</span>
          </button>
        )}
      </div>
      {editing && (
        <>
          {children}
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel} className="sm:w-auto">
              {t.cancel}
            </Button>
            <Button type="button" onClick={onSave} disabled={pending} className="sm:w-auto">
              {t.save}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function ChipPicker({
  legend,
  filterLabel,
  options,
  selected,
  onChange,
}: {
  legend: string;
  filterLabel: string;
  options: Labeled[];
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const visible = options.filter(
    (o) => selected.includes(o.code) || normalize(o.label).includes(normalize(filter.trim())),
  );
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">{legend}</legend>
      {options.length > 8 && (
        <input
          type="search"
          aria-label={filterLabel}
          placeholder={filterLabel}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="min-h-touch rounded-button border border-border bg-surface px-3"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {visible.map((option) => {
          const on = selected.includes(option.code);
          return (
            <button
              key={option.code}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(
                  on ? selected.filter((c) => c !== option.code) : [...selected, option.code],
                )
              }
              className={`min-h-touch rounded-full border px-4 text-sm font-medium ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:bg-background"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
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
      {citycode ? (
        <div className="flex flex-col gap-2">
          <Autocomplete<AddressSuggestion>
            key={citycode}
            label={t.address.street}
            hint={t.address.streetHint}
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
              className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {fr.search.review.address.clear}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.address.streetNeedCity}</p>
      )}
    </>
  );
}

function PhotosCard({
  projectId,
  photos,
  onChange,
}: {
  projectId: string;
  photos: { id: string; url: string | null }[];
  onChange: () => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

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

  return (
    <section
      aria-label={t.photos.title}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold">{t.photos.title}</h2>
      {errors.map((message) => (
        <Alert key={message} tone="error">
          {message}
        </Alert>
      ))}
      {photos.length === 0 ? (
        <p className="text-muted-foreground">{t.photos.none}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((photo, index) => (
            <li key={photo.id} className="flex flex-col gap-1">
              {photo.url && (
                // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
                <img
                  src={photo.url}
                  alt={t.photos.alt(index + 1)}
                  className="aspect-square w-full rounded-button object-cover"
                />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(photo.id)}
                aria-label={`${t.photos.delete} — ${t.photos.alt(index + 1)}`}
                className="min-h-touch text-sm font-medium text-danger disabled:opacity-50"
              >
                {t.photos.delete}
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length >= MAX_PROJECT_PHOTOS ? (
        <p className="text-sm text-muted-foreground">{t.photos.limit}</p>
      ) : (
        <PhotoDropzone onFiles={add} disabled={busy} />
      )}
    </section>
  );
}
