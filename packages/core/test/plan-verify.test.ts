import { describe, expect, it } from "vitest";
import {
  planVerifyPoints,
  verifyProgress,
  verifyRoomKey,
  verifySymbolKey,
  verifyWorkKey,
  wallQuantityMilli,
  type VerifyRoom,
  type VerifyWork,
} from "../src/plan-verify";

const room = (patch: Partial<VerifyRoom>): VerifyRoom => ({
  id: "r1",
  name: "Séjour",
  area_cm2: 250_000,
  height_mm: 2500,
  source: "plan",
  uncertain: false,
  ...patch,
});
const work = (patch: Partial<VerifyWork>): VerifyWork => ({
  id: "w1",
  name: "Cloison BA13 de 7 cm",
  kind: "surface",
  quantity_milli: null,
  trade_code: "plaquiste",
  room: "Entrée",
  removal: false,
  ...patch,
});

describe("planVerifyPoints", () => {
  it("garde les pièces estimées ou sans surface, pas celles lues sur le plan", () => {
    const points = planVerifyPoints({
      rooms: [
        room({}),
        room({ id: "r2", name: "WC", source: "estime" }),
        room({ id: "r3", name: "Cellier", area_cm2: null }),
        room({ id: "r4", name: "Bureau", uncertain: true }),
        room({ id: "r5", name: "Chambre", source: "photo" }),
      ],
      works: [],
    });
    expect(points.map((p) => (p.kind === "room" ? [p.name, p.reason] : null))).toEqual([
      ["WC", "estimated"],
      ["Cellier", "missing"],
      ["Bureau", "estimated"],
      ["Chambre", "estimated"],
    ]);
    expect(points.every((p) => !p.done)).toBe(true);
  });

  it("une pièce validée reste faite tant que sa surface n'a pas changé", () => {
    const key = verifyRoomKey("WC");
    const rooms = [room({ id: "r2", name: "WC", source: "estime", area_cm2: 18_000 })];
    expect(planVerifyPoints({ rooms, works: [], checks: { [key]: 18_000 } })[0]?.done).toBe(true);
    expect(planVerifyPoints({ rooms, works: [], checks: { [key]: 17_000 } })[0]?.done).toBe(false);
    // Corrigée à la validation (« Votre valeur ») : toujours listée, faite.
    const saisie = [room({ id: "r9", name: "WC", source: "saisi", area_cm2: 18_000 })];
    expect(planVerifyPoints({ rooms: saisie, works: [], checks: { [key]: 18_000 } })).toMatchObject(
      [{ kind: "room", done: true }],
    );
    // Corrigée ailleurs, sans validation : plus à vérifier.
    expect(planVerifyPoints({ rooms: saisie, works: [] })).toEqual([]);
  });

  it("garde les ouvrages d'un lot sans quantité, démolition d'abord, puis l'ordre des lots", () => {
    const points = planVerifyPoints({
      rooms: [],
      works: [
        work({ id: "a", name: "Peinture des murs", trade_code: "peintre", kind: "surface" }),
        work({ id: "b" }),
        work({ id: "c", name: "Plinthes", trade_code: null, kind: "lineaire" }),
        work({ id: "d", name: "Faïence à déposer", trade_code: null, removal: true }),
        work({ id: "e", name: "Faux plafond", quantity_milli: 12_000 }),
      ],
      lotOrder: ["plaquiste", "peintre"],
    });
    expect(points.map((p) => (p.kind === "work" ? [p.id, p.lot, p.hint] : null))).toEqual([
      ["d", "demolition", "wall"],
      ["b", "plaquiste", "wall"],
      ["a", "peintre", "wall"],
    ]);
  });

  it("un ouvrage mesuré pendant la vérification est fait ; deux ouvrages homonymes ont deux clés", () => {
    const key = verifyWorkKey("Cloison BA13 de 7 cm", "Entrée");
    const works = [
      work({ id: "a", quantity_milli: 9_230 }),
      work({ id: "b", quantity_milli: null }),
    ];
    const points = planVerifyPoints({ rooms: [], works, checks: { [key]: 9_230 } });
    expect(points.map((p) => [p.key, p.done])).toEqual([
      [key, true],
      [`${key}#2`, false],
    ]);
  });

  it("un type de symbole douteux est à vérifier ; validé, il reste fait tant qu'aucun doute ne revient", () => {
    const key = verifySymbolKey("interrupteur");
    const symbols = {
      interrupteur: { total: 14, doubt: true },
      prise: { total: 27, doubt: false },
    };
    expect(planVerifyPoints({ rooms: [], works: [], symbols })).toMatchObject([
      { kind: "symbol", type: "interrupteur", done: false, total: 14 },
    ]);
    const cleared = { interrupteur: { total: 13, doubt: false } };
    expect(
      planVerifyPoints({ rooms: [], works: [], symbols: cleared, checks: { [key]: null } }),
    ).toMatchObject([{ kind: "symbol", done: true }]);
    expect(
      planVerifyPoints({ rooms: [], works: [], symbols, checks: { [key]: null } }),
    ).toMatchObject([{ kind: "symbol", done: false }]);
  });

  it("compte les points faits", () => {
    const points = planVerifyPoints({
      rooms: [room({ name: "WC", source: "estime", area_cm2: 18_000 })],
      works: [work({})],
      checks: { [verifyRoomKey("WC")]: 18_000 },
    });
    expect(verifyProgress(points)).toEqual({ done: 1, total: 2, open: 1 });
  });
});

describe("wallQuantityMilli", () => {
  it("longueur tracée × hauteur de la pièce", () => {
    // 3,42 ml × 2,70 m = 9,234 m².
    expect(wallQuantityMilli(3420, 2700)).toBe(9234);
    expect(wallQuantityMilli(0, 2700)).toBeNull();
  });
});
