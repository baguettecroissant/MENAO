import { describe, expect, it } from "vitest";
import { canChangeTrades, nextPlan, parsePlanUsage, requestLimitLevel } from "../src/plan-limits";

describe("limites des formules (ADR 0290)", () => {
  it("lit l'usage renvoyé par la base, prudemment", () => {
    expect(
      parsePlanUsage({
        formule: "base",
        demandes: { recues: 8, limite: 10 },
        metiers: { nombre: 2, limite: 2 },
      }),
    ).toEqual({
      plan: "base",
      requests: { received: 8, limit: 10 },
      trades: { count: 2, limit: 2 },
    });
    // Limite nulle : illimité ; formule absente : celle de Base est appliquée par la base.
    expect(
      parsePlanUsage({ formule: null, demandes: { recues: 3, limite: null }, metiers: null }),
    ).toEqual({
      plan: null,
      requests: { received: 3, limit: null },
      trades: { count: 0, limit: null },
    });
    expect(parsePlanUsage(null).requests).toEqual({ received: 0, limit: null });
  });

  it("prévient à 80 % de la limite, puis à la limite et au-delà", () => {
    expect(requestLimitLevel({ received: 7, limit: 10 })).toBe("ok");
    expect(requestLimitLevel({ received: 8, limit: 10 })).toBe("proche");
    expect(requestLimitLevel({ received: 10, limit: 10 })).toBe("atteinte");
    expect(requestLimitLevel({ received: 12, limit: 10 })).toBe("depassee");
    expect(requestLimitLevel({ received: 400, limit: null })).toBe("ok");
    expect(requestLimitLevel({ received: 0, limit: 0 })).toBe("ok");
  });

  it("propose la formule au-dessus", () => {
    expect(nextPlan("base")).toBe("premium");
    expect(nextPlan(null)).toBe("premium");
    expect(nextPlan("premium")).toBe("entreprise");
    expect(nextPlan("entreprise")).toBeNull();
  });

  it("métiers : jusqu'à la limite, ou en retirant seulement", () => {
    expect(
      canChangeTrades({ limit: 2, current: ["plombier"], next: ["plombier", "chauffagiste"] }),
    ).toBe(true);
    expect(canChangeTrades({ limit: 2, current: ["a", "b"], next: ["a", "b", "c"] })).toBe(false);
    // Déjà au-dessus (inscrit avant la limite) : il garde, ou retire.
    expect(
      canChangeTrades({ limit: 2, current: ["a", "b", "c", "d"], next: ["a", "b", "c"] }),
    ).toBe(true);
    expect(canChangeTrades({ limit: 2, current: ["a", "b", "c"], next: ["a", "b", "e"] })).toBe(
      false,
    );
    expect(canChangeTrades({ limit: null, current: [], next: ["a", "b", "c", "d"] })).toBe(true);
  });
});
