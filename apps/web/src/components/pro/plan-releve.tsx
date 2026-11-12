"use client";

import { formatQuantity, PLAN_COUNT_KEYS, parseQuantity } from "@menao/core";
import { Plus, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Alert, Button, Card, CardTitle, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { savePlanRooms } from "@/lib/artisan/tender-actions";
import type { TenderRoom } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan;

type Draft = {
  key: string;
  room: TenderRoom | null;
  level: string;
  name: string;
  area: string;
  perimeter: string;
  height: string;
  wet: boolean;
  habitable: boolean;
};

/** Plans déposés : lien signé (1 h) pour ouvrir une page lue. */
export type PlanFileLink = { name: string; kind: "pdf" | "jpg" | "png"; url: string | null };

const metres = (milli: number | null) => (milli === null ? "" : formatQuantity(milli));

function toDraft(room: TenderRoom): Draft {
  return {
    key: room.id,
    room,
    level: room.level ?? "",
    name: room.name,
    // cm² → millièmes de m² (formatQuantity : 3 décimales au plus).
    area: room.area_cm2 === null ? "" : metres(Math.round(room.area_cm2 / 10)),
    perimeter: metres(room.perimeter_mm),
    height: metres(room.height_mm),
    wet: room.wet,
    habitable: room.habitable,
  };
}

/** Mesure saisie (en mètres) en entier ; null si vide, undefined si invalide. */
function measure(
  value: string,
  factor: number,
  min: number,
  max: number,
): number | null | undefined {
  if (!value.trim()) return null;
  const milli = parseQuantity(value);
  if (milli === null) return undefined;
  const result = milli * factor;
  return result >= min && result <= max ? result : undefined;
}

function parse(d: Draft) {
  return {
    id: d.room?.id ?? null,
    level: d.level.trim() || null,
    name: d.name.trim(),
    areaCm2: measure(d.area, 10, 1, 100_000_000),
    perimeterMm: measure(d.perimeter, 1, 1, 2_000_000),
    heightMm: measure(d.height, 1, 1500, 10_000),
    wet: d.wet,
    habitable: d.habitable,
  };
}

function changed(d: Draft): boolean {
  if (!d.room) return true;
  const p = parse(d);
  const r = d.room;
  return (
    p.level !== r.level ||
    p.name !== r.name ||
    p.areaCm2 !== r.area_cm2 ||
    p.perimeterMm !== r.perimeter_mm ||
    p.heightMm !== r.height_mm ||
    p.wet !== r.wet ||
    p.habitable !== r.habitable
  );
}

/**
 * Relevé des plans (F-140, ADR 0291) : chaque pièce avec sa surface, son périmètre et sa hauteur,
 * et l'origine de la mesure (lue sur le plan, calculée avec les cotes, photo, saisie). L'artisan
 * corrige, ajoute ou retire des pièces ; les éléments comptés se corrigent aussi.
 */
export function PlanReleve({
  tenderId,
  rooms,
  counts,
  files,
}: {
  tenderId: string;
  rooms: TenderRoom[];
  counts: Record<string, number | null>;
  files: PlanFileLink[];
}) {
  const [state, formAction, pending] = useActionState(savePlanRooms, initialFormState);
  const [drafts, setDrafts] = useState<Draft[]>(() => rooms.map(toDraft));
  const [countDrafts, setCountDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(PLAN_COUNT_KEYS.map((k) => [k, counts[k] == null ? "" : String(counts[k])])),
  );
  const [dirty, setDirty] = useState(false);
  const [added, setAdded] = useState(0);
  // Relevé enregistré : la page renvoie les pièces de la base (identifiants des pièces ajoutées,
  // origines « saisi ») ; le brouillon repart de là.
  const [shown, setShown] = useState(rooms);
  if (rooms !== shown) {
    setShown(rooms);
    setDrafts(rooms.map(toDraft));
  }

  const parsed = useMemo(() => drafts.map(parse), [drafts]);
  const invalid =
    parsed.some(
      (p) =>
        !p.name ||
        p.areaCm2 === undefined ||
        p.perimeterMm === undefined ||
        p.heightMm === undefined,
    ) || Object.values(countDrafts).some((v) => v.trim() !== "" && !/^\d{1,3}$/.test(v.trim()));

  const update = (key: string, patch: Partial<Draft>) => {
    setDirty(true);
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  function submit(formData: FormData) {
    formData.set("tenderId", tenderId);
    formData.set("rooms", JSON.stringify(parsed));
    formData.set(
      "counts",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(countDrafts).map(([k, v]) => [k, v.trim() ? Number(v.trim()) : null]),
        ),
      ),
    );
    setDirty(false);
    formAction(formData);
  }

  function badge(d: Draft) {
    if (changed(d)) return <StatusBadge tone="primary">{t.source.saisi}</StatusBadge>;
    const r = d.room;
    if (!r) return null;
    if (r.area_cm2 === null) return <StatusBadge tone="warning">{t.source.missing}</StatusBadge>;
    if (r.source === "photo") return <StatusBadge tone="warning">{t.source.photo}</StatusBadge>;
    if (r.uncertain) return <StatusBadge tone="warning">{t.source.uncertain}</StatusBadge>;
    if (r.source === "cotes") return <StatusBadge tone="primary">{t.source.cotes}</StatusBadge>;
    if (r.source === "saisi") return <StatusBadge tone="neutral">{t.source.saisi}</StatusBadge>;
    const file = r.file_index ? files[r.file_index - 1] : undefined;
    const label = t.source.plan(r.page);
    // Un PDF s'ouvre directement à la page lue (#page=…).
    return file?.url && file.kind === "pdf" && r.page ? (
      <a
        href={`${file.url}#page=${r.page}`}
        target="_blank"
        rel="noreferrer"
        aria-label={t.openPage(r.page)}
      >
        <StatusBadge tone="success">{label}</StatusBadge>
      </a>
    ) : (
      <StatusBadge tone="success">{label}</StatusBadge>
    );
  }

  const cell = "px-2 py-2 align-middle";
  const numberInput = `${inputClasses} min-h-10 w-24 px-2.5 text-right tabular-nums`;

  return (
    <form action={submit} className="flex flex-col gap-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !dirty && <Alert tone="success">{state.success}</Alert>}
      <Card className="flex flex-col gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-lg font-semibold">{t.roomsTitle(drafts.length)}</h2>
          <button
            type="button"
            onClick={() => {
              const key = `nouvelle-${added}`;
              setAdded((n) => n + 1);
              setDirty(true);
              setDrafts((list) => [
                ...list,
                {
                  key,
                  room: null,
                  level: list.at(-1)?.level ?? "",
                  name: "",
                  area: "",
                  perimeter: "",
                  height: list.at(-1)?.height ?? "",
                  wet: false,
                  habitable: true,
                },
              ]);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t.addRoom}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table aria-label={t.roomsLabel} className="w-full min-w-[56rem] border-collapse text-sm">
            <thead className="bg-background text-left text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5">{t.columns.name}</th>
                <th className="px-2 py-2.5">{t.columns.level}</th>
                <th className="px-2 py-2.5 text-right">{t.columns.area}</th>
                <th className="px-2 py-2.5 text-right">{t.columns.perimeter}</th>
                <th className="px-2 py-2.5 text-right">{t.columns.height}</th>
                <th className="px-2 py-2.5">{t.columns.wet}</th>
                <th className="px-2 py-2.5">{t.columns.habitable}</th>
                <th className="px-2 py-2.5">{t.columns.source}</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => {
                const p = parsed[i];
                const name = d.name || t.columns.name;
                const warn =
                  d.room && !changed(d) && (d.room.source === "photo" || d.room.uncertain);
                return (
                  <tr
                    key={d.key}
                    className={`border-t border-border ${warn ? "bg-warning-soft/50" : ""}`}
                  >
                    <td className="py-2 pr-2 pl-5 align-middle">
                      <input
                        value={d.name}
                        maxLength={80}
                        required
                        aria-label={t.fieldOf(t.columns.name, name)}
                        aria-invalid={!p?.name || undefined}
                        onChange={(e) => update(d.key, { name: e.target.value })}
                        className={`${inputClasses} min-h-10 min-w-40 px-2.5 font-semibold`}
                      />
                    </td>
                    <td className={cell}>
                      <input
                        value={d.level}
                        maxLength={40}
                        aria-label={t.fieldOf(t.columns.level, name)}
                        onChange={(e) => update(d.key, { level: e.target.value })}
                        className={`${inputClasses} min-h-10 w-20 px-2.5`}
                      />
                    </td>
                    {(
                      [
                        ["area", t.columns.area, p?.areaCm2],
                        ["perimeter", t.columns.perimeter, p?.perimeterMm],
                        ["height", t.columns.height, p?.heightMm],
                      ] as const
                    ).map(([field, label, value]) => (
                      <td key={field} className={`${cell} text-right`}>
                        <input
                          value={d[field]}
                          inputMode="decimal"
                          aria-label={t.fieldOf(label, name)}
                          aria-invalid={value === undefined || undefined}
                          onChange={(e) =>
                            update(d.key, { [field]: e.target.value } as Partial<Draft>)
                          }
                          className={numberInput}
                        />
                      </td>
                    ))}
                    <td className={cell}>
                      <input
                        type="checkbox"
                        checked={d.wet}
                        aria-label={t.fieldOf(t.columns.wet, name)}
                        onChange={(e) => update(d.key, { wet: e.target.checked })}
                        className="size-[1.125rem] accent-primary"
                      />
                    </td>
                    <td className={cell}>
                      <input
                        type="checkbox"
                        checked={d.habitable}
                        aria-label={t.fieldOf(t.columns.habitable, name)}
                        onChange={(e) => update(d.key, { habitable: e.target.checked })}
                        className="size-[1.125rem] accent-primary"
                      />
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>{badge(d)}</td>
                    <td className="py-2 pr-4 pl-2 align-middle">
                      <button
                        type="button"
                        aria-label={t.removeRoom(d.name)}
                        onClick={() => {
                          setDirty(true);
                          setDrafts((list) => list.filter((x) => x.key !== d.key));
                        }}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.countsTitle} description={t.countsHint} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_COUNT_KEYS.map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 text-sm">
              <span>{t.counts[k]}</span>
              <span className="w-20 shrink-0">
                <input
                  value={countDrafts[k] ?? ""}
                  inputMode="numeric"
                  maxLength={3}
                  aria-invalid={
                    (countDrafts[k] ?? "").trim() !== "" &&
                    !/^\d{1,3}$/.test((countDrafts[k] ?? "").trim())
                      ? true
                      : undefined
                  }
                  onChange={(e) => {
                    setDirty(true);
                    setCountDrafts((c) => ({ ...c, [k]: e.target.value }));
                  }}
                  className={`${inputClasses} min-h-10 px-2.5 text-right tabular-nums`}
                />
              </span>
            </label>
          ))}
        </div>
      </Card>

      <div className="flex flex-col items-end gap-2">
        {invalid && <p className="text-sm text-danger">{t.invalid}</p>}
        <Button type="submit" disabled={pending || invalid || !dirty} block={false}>
          {t.save}
        </Button>
      </div>
    </form>
  );
}
