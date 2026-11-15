"use client";

import {
  CEILING_FINISHES,
  defaultFinishes,
  FLOOR_FINISHES,
  formatQuantity,
  parseQuantity,
  WALL_FINISHES,
  type CeilingFinish,
  type FloorFinish,
  type WallFinish,
} from "@menao/core";
import { useActionState, useMemo, useState } from "react";
import { HelpCircle, Sparkles } from "lucide-react";
import { Alert, Button, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createPlanDpgf } from "@/lib/artisan/tender-actions";
import type { TenderRoom } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan.finishes;

type Draft = { floor: FloorFinish; walls: WallFinish; ceiling: CeilingFinish; tile: string };

/** Notes que le plan écrit pour la pièce (sol, murs, plafond), sans les vides. */
const notesOf = (room: TenderRoom) =>
  [room.floor_note, room.walls_note, room.ceiling_note].filter((n): n is string => !!n);

function initial(room: TenderRoom): Draft {
  const proposed = defaultFinishes(room);
  const tile = room.tile_height_mm ?? proposed.tileHeightMm;
  // Le plan parle de la pièce : aucun sol ni aucune faïence ne sont proposés d'office, les murs et
  // le plafond non décrits restent en peinture.
  const noted = notesOf(room).length > 0;
  const painted = <T extends string>(value: T) =>
    noted && value !== "aucun" ? ("peinture" as const) : value;
  return {
    floor: room.floor ?? (noted ? "aucun" : proposed.floor),
    walls: room.walls ?? painted(proposed.walls),
    ceiling: room.ceiling ?? painted(proposed.ceiling),
    tile: tile === null ? formatQuantity(2100) : formatQuantity(tile),
  };
}

/**
 * Revêtements de chaque pièce relevée (F-140, ADR 0292), proposés selon le type de pièce, puis
 * « Créer le DPGF » : les lots et postes de chaque métier sont calculés par MENAO.
 * Revêtements lus sur le plan (F-159 lot 6, ADR 0331, maquette du lot 54) : sous chaque pièce, la
 * pastille dit si le choix est lu sur le plan (note citée) ou proposé par MENAO.
 */
export function PlanFinishes({
  tenderId,
  rooms,
  hasDpgf,
}: {
  tenderId: string;
  rooms: TenderRoom[];
  hasDpgf: boolean;
}) {
  const [state, formAction, pending] = useActionState(createPlanDpgf, initialFormState);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(rooms.map((r) => [r.id, initial(r)])),
  );
  const [shown, setShown] = useState(rooms);
  if (rooms !== shown) {
    setShown(rooms);
    setDrafts(Object.fromEntries(rooms.map((r) => [r.id, drafts[r.id] ?? initial(r)])));
  }

  const payload = useMemo(
    () =>
      rooms.map((r) => {
        const d = drafts[r.id] ?? initial(r);
        const tile = d.walls === "faience" ? parseQuantity(d.tile) : null;
        return {
          id: r.id,
          floor: d.floor,
          walls: d.walls,
          ceiling: d.ceiling,
          tileHeightMm: tile,
        };
      }),
    [rooms, drafts],
  );
  const invalid = payload.some(
    (p) =>
      p.walls === "faience" &&
      (p.tileHeightMm === null || p.tileHeightMm < 100 || p.tileHeightMm > 4000),
  );
  const set = (id: string, patch: Partial<Draft>) =>
    setDrafts((all) => ({ ...all, [id]: { ...(all[id] as Draft), ...patch } }));
  const select = `${inputClasses} !min-h-10 !w-auto px-2.5`;
  // Pastilles « Lu sur le plan » : seulement quand au moins une pièce porte une note.
  const withNotes = rooms.some((r) => notesOf(r).length > 0);
  const stateOf = (room: TenderRoom) => {
    const d = drafts[room.id] ?? initial(room);
    if (notesOf(room).length === 0) return "proposed" as const;
    return !room.floor_note && d.floor === "aucun" ? ("toChoose" as const) : ("read" as const);
  };
  const states = rooms.map(stateOf);
  const count = (state: (typeof states)[number]) => states.filter((x) => x === state).length;

  return (
    <form
      action={(formData) => {
        formData.set("tenderId", tenderId);
        formData.set("finishes", JSON.stringify(payload));
        formAction(formData);
      }}
      className="flex flex-col items-start gap-5 lg:flex-row"
    >
      <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <div className="flex flex-col gap-1 px-5 py-4">
            <h2 className="text-lg font-semibold">{t.title}</h2>
            <p className="text-sm text-muted-foreground">
              {withNotes
                ? t.read.counts(count("read"), count("toChoose"), count("proposed"))
                : t.lead}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table aria-label={t.label} className="w-full min-w-[44rem] border-collapse text-sm">
              <thead className="bg-background text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">{fr.pro.tenders.plan.columns.name}</th>
                  <th className="px-2 py-2.5">{t.floor}</th>
                  <th className="px-2 py-2.5">{t.walls}</th>
                  <th className="px-2 py-2.5">{t.tileHeight}</th>
                  <th className="px-2 py-2.5">{t.ceiling}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const d = drafts[room.id] ?? initial(room);
                  const of = (label: string) => fr.pro.tenders.plan.fieldOf(label, room.name);
                  const state = stateOf(room);
                  const tone = withNotes && state !== "read" ? "bg-warning-soft/50" : "";
                  return [
                    <tr key={room.id} className={`border-t border-border ${tone}`}>
                      <td className="px-3 py-2">
                        <span className="flex flex-col">
                          <span className="font-semibold">{room.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {[
                              room.level,
                              room.area_cm2 === null
                                ? null
                                : `${formatQuantity(Math.round(room.area_cm2 / 10))} m²`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          aria-label={of(t.floor)}
                          value={d.floor}
                          onChange={(e) => set(room.id, { floor: e.target.value as FloorFinish })}
                          className={select}
                        >
                          {FLOOR_FINISHES.map((f) => (
                            <option key={f} value={f}>
                              {t.floorOptions[f]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          aria-label={of(t.walls)}
                          value={d.walls}
                          onChange={(e) => set(room.id, { walls: e.target.value as WallFinish })}
                          className={select}
                        >
                          {WALL_FINISHES.map((f) => (
                            <option key={f} value={f}>
                              {t.wallOptions[f]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        {d.walls === "faience" && (
                          <input
                            value={d.tile}
                            inputMode="decimal"
                            aria-label={of(t.tileHeight)}
                            onChange={(e) => set(room.id, { tile: e.target.value })}
                            className={`${inputClasses} !min-h-10 !w-20 px-2.5 text-right tabular-nums`}
                          />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          aria-label={of(t.ceiling)}
                          value={d.ceiling}
                          onChange={(e) =>
                            set(room.id, { ceiling: e.target.value as CeilingFinish })
                          }
                          className={select}
                        >
                          {CEILING_FINISHES.map((f) => (
                            <option key={f} value={f}>
                              {t.ceilingOptions[f]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>,
                    withNotes && (
                      <tr key={`${room.id}-notes`} className={tone}>
                        <td />
                        <td colSpan={4} className="px-2 pt-0.5 pb-3">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {state === "proposed" ? (
                              <StatusBadge tone="neutral">{t.read.proposed}</StatusBadge>
                            ) : (
                              <StatusBadge tone="success">{t.read.onPlan}</StatusBadge>
                            )}
                            {state === "toChoose" && (
                              <StatusBadge tone="warning">{t.read.floorToChoose}</StatusBadge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {notesOf(room).map(t.read.quote).join(" · ") || t.read.nothing}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </section>
        <div className="flex flex-col items-end gap-2">
          {invalid && <p className="text-sm text-danger">{t.invalid}</p>}
          {hasDpgf && <p className="text-sm text-warning">{t.recreateWarning}</p>}
          <Button type="submit" disabled={pending || invalid} block={false}>
            <Sparkles aria-hidden="true" className="size-4" />
            {pending ? t.creating : hasDpgf ? t.recreate : t.create}
          </Button>
        </div>
      </div>
      <aside className="flex w-full flex-col gap-4 lg:w-[20rem] lg:shrink-0">
        {withNotes && (
          <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="mb-2 text-lg font-semibold">{t.read.legendTitle}</h2>
            {t.read.legend.map(([name, text]) => (
              <div
                key={name}
                className="flex flex-col gap-0.5 border-t border-border py-2.5 text-sm"
              >
                <span className="font-semibold">{name}</span>
                <span className="text-muted-foreground">{text}</span>
              </div>
            ))}
          </section>
        )}
        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card">
          <h2 className="mb-2 text-lg font-semibold">{t.rulesTitle}</h2>
          {t.rulesByTrade.map(([trade, rule]) => (
            <div
              key={trade}
              className="flex flex-col gap-0.5 border-t border-border py-2.5 text-sm"
            >
              <span className="font-semibold">{trade}</span>
              <span className="text-muted-foreground">{rule}</span>
            </div>
          ))}
          <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
            <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t.rulesNote}
          </p>
        </section>
        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
          <h2 className="text-lg font-semibold">{t.othersTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.othersText}</p>
        </section>
      </aside>
    </form>
  );
}
