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
import { Alert, Button, Card, CardTitle, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createPlanDpgf } from "@/lib/artisan/tender-actions";
import type { TenderRoom } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan.finishes;

type Draft = { floor: FloorFinish; walls: WallFinish; ceiling: CeilingFinish; tile: string };

function initial(room: TenderRoom): Draft {
  const proposed = defaultFinishes(room);
  const tile = room.tile_height_mm ?? proposed.tileHeightMm;
  return {
    floor: room.floor ?? proposed.floor,
    walls: room.walls ?? proposed.walls,
    ceiling: room.ceiling ?? proposed.ceiling,
    tile: tile === null ? formatQuantity(2100) : formatQuantity(tile),
  };
}

/**
 * Revêtements de chaque pièce relevée (F-140, ADR 0292), proposés selon le type de pièce, puis
 * « Créer le DPGF » : les lots et postes de chaque métier sont calculés par MENAO.
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

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle title={t.title} description={t.lead} />
      <form
        action={(formData) => {
          formData.set("tenderId", tenderId);
          formData.set("finishes", JSON.stringify(payload));
          formAction(formData);
        }}
        className="flex flex-col gap-4"
      >
        {state.error && <Alert tone="error">{state.error}</Alert>}
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
                return (
                  <tr key={room.id} className="border-t border-border">
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
                        onChange={(e) => set(room.id, { ceiling: e.target.value as CeilingFinish })}
                        className={select}
                      >
                        {CEILING_FINISHES.map((f) => (
                          <option key={f} value={f}>
                            {t.ceilingOptions[f]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <details className="rounded-input bg-background px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold">{t.rulesTitle}</summary>
          <ul className="mt-2 ml-4 flex list-disc flex-col gap-1 text-label">
            {t.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>
        <div className="flex flex-col items-end gap-2">
          {invalid && <p className="text-sm text-danger">{t.invalid}</p>}
          {hasDpgf && <p className="text-sm text-warning">{t.recreateWarning}</p>}
          <Button type="submit" disabled={pending || invalid} block={false}>
            {pending ? t.creating : hasDpgf ? t.recreate : t.create}
          </Button>
        </div>
      </form>
    </Card>
  );
}
