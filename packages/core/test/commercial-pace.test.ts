import { describe, expect, it } from "vitest";
import {
  PACE_DEFAULTS,
  paceAverage,
  paceNeededPerWeek,
  paceObjective,
  pacePlan,
  pacePlanToday,
  paceProjection,
  paceRanking,
  paceRecentRate,
  paceState,
  paceTeamAlerts,
  paceWeek,
  type PaceWeek,
} from "../src/commercial-pace";

const S = {
  ...PACE_DEFAULTS,
  objectif_valides: 500,
  debut: "2027-01-11",
  fin: "2027-03-31",
};

describe("objectif de la semaine d'un conseiller", () => {
  it("démarre à 3 les deux premières semaines, puis 7", () => {
    expect(paceObjective(S, { debut: "2027-01-11", rythme: null }, "2027-01-11")).toBe(3);
    expect(paceObjective(S, { debut: "2027-01-11", rythme: null }, "2027-01-18")).toBe(3);
    expect(paceObjective(S, { debut: "2027-01-11", rythme: null }, "2027-01-25")).toBe(7);
  });
  it("compte le démarrage depuis sa propre arrivée", () => {
    // Arrivé un mercredi : sa première semaine est celle du lundi 8 février.
    const karim = { debut: "2027-02-10", rythme: null };
    expect(paceObjective(S, karim, "2027-02-15")).toBe(3);
    expect(paceObjective(S, karim, "2027-02-22")).toBe(7);
  });
  it("n'a pas d'objectif avant son arrivée", () => {
    expect(paceObjective(S, { debut: "2027-02-10", rythme: null }, "2027-02-01")).toBeNull();
  });
  it("garde un objectif propre, sans dépasser le démarrage", () => {
    const lea = { debut: "2027-01-11", rythme: 4 };
    expect(paceObjective(S, lea, "2027-01-11")).toBe(3);
    expect(paceObjective(S, lea, "2027-02-15")).toBe(4);
    expect(paceObjective(S, { debut: "2027-01-11", rythme: 2 }, "2027-01-11")).toBe(2);
  });
});

describe("ma semaine", () => {
  const weeks: PaceWeek[] = [
    { semaine: "2027-02-08", valides: 7, objectif: 7 },
    { semaine: "2027-02-15", valides: 5, objectif: 7 },
  ];
  it("dit ce qu'il manque d'ici dimanche", () => {
    // Jeudi 18 février : il reste jeudi à dimanche.
    expect(paceWeek(weeks, "2027-02-18")).toEqual({
      semaine: "2027-02-15",
      valides: 5,
      objectif: 7,
      manque: 2,
      joursRestants: 4,
    });
  });
  it("ne compte rien de négatif quand l'objectif est dépassé", () => {
    expect(
      paceWeek([{ semaine: "2027-02-15", valides: 9, objectif: 7 }], "2027-02-21").manque,
    ).toBe(0);
  });
  it("renvoie une semaine vide quand elle n'est pas encore là", () => {
    expect(paceWeek([], "2027-02-18")).toEqual({
      semaine: "2027-02-15",
      valides: 0,
      objectif: null,
      manque: 0,
      joursRestants: 4,
    });
  });
});

describe("moyenne et état d'un conseiller", () => {
  const w = (semaine: string, valides: number, objectif: number | null = 7): PaceWeek => ({
    semaine,
    valides,
    objectif,
  });
  const today = "2027-02-18";

  it("fait la moyenne des 4 dernières semaines terminées où il était là", () => {
    const weeks = [
      w("2027-01-11", 2, 3),
      w("2027-01-18", 9),
      w("2027-01-25", 7),
      w("2027-02-01", 8),
      w("2027-02-08", 9),
      w("2027-02-15", 1),
    ];
    expect(paceAverage(weeks, today)).toBe(8.25);
    expect(paceAverage([w("2027-02-08", 2, 3), w("2027-02-15", 0, 3)], today)).toBe(2);
    expect(paceAverage([w("2027-02-15", 4)], today)).toBeNull();
  });

  it("donne l'état : avance, rythme, retard, point à prévoir, démarrage", () => {
    const base = [w("2027-01-25", 7), w("2027-02-01", 7)];
    expect(
      paceState(
        [w("2027-01-25", 9), w("2027-02-01", 9), w("2027-02-08", 8), w("2027-02-15", 1)],
        today,
      ),
    ).toBe("avance");
    expect(paceState([...base, w("2027-02-08", 6), w("2027-02-15", 0)], today)).toBe("rythme");
    expect(
      paceState(
        [w("2027-01-25", 4), w("2027-02-01", 5), w("2027-02-08", 5), w("2027-02-15", 7)],
        today,
      ),
    ).toBe("retard");
    expect(
      paceState(
        [w("2027-01-25", 7), w("2027-02-01", 3), w("2027-02-08", 2), w("2027-02-15", 7)],
        today,
      ),
    ).toBe("point");
    expect(paceState([w("2027-02-08", 1, 3), w("2027-02-15", 0, 3)], today)).toBe("demarrage");
  });

  it("ne met jamais « point à prévoir » sans deux semaines pleines d'objectif", () => {
    expect(paceState([w("2027-02-08", 0, null), w("2027-02-15", 0)], today)).toBe("demarrage");
  });
});

describe("objectif commun", () => {
  it("prévoit une courbe qui démarre doucement et finit à l'objectif", () => {
    const plan = pacePlan(S);
    expect(plan[0]).toEqual({ semaine: "2027-01-11", cumul: 20 });
    expect(plan.at(-1)).toEqual({ semaine: "2027-03-29", cumul: 500 });
    expect(plan).toHaveLength(12);
    // Strictement croissante.
    plan.slice(1).forEach((p, i) => expect(p.cumul).toBeGreaterThan(plan[i]?.cumul ?? 0));
  });

  it("n'a pas de plan sans objectif ni dates", () => {
    expect(pacePlan({ ...S, objectif_valides: null })).toEqual([]);
    expect(pacePlan({ ...S, fin: null })).toEqual([]);
    expect(pacePlanToday({ ...S, debut: null }, "2027-02-18")).toBeNull();
  });

  it("donne où l'équipe devrait en être aujourd'hui", () => {
    expect(pacePlanToday(S, "2027-01-10")).toBe(0);
    expect(pacePlanToday(S, "2027-01-17")).toBe(20);
    expect(pacePlanToday(S, "2027-04-02")).toBe(500);
    const thursday = pacePlanToday(S, "2027-02-18") ?? 0;
    expect(thursday).toBeGreaterThan(pacePlan(S)[4]?.cumul ?? Infinity);
    expect(thursday).toBeLessThan(pacePlan(S)[5]?.cumul ?? 0);
  });

  it("calcule le rythme nécessaire et la projection", () => {
    // 311 artisans en 6 semaines (du jeudi 18 février au mercredi 31 mars compris).
    expect(paceNeededPerWeek(S, 189, "2027-02-18")).toBe(52);
    expect(paceNeededPerWeek(S, 520, "2027-02-18")).toBe(0);
    expect(paceNeededPerWeek(S, 189, "2027-04-02")).toBeNull();
    expect(paceProjection(S, 189, 40, "2027-02-18")).toBe(429);
    expect(paceProjection(S, 189, null, "2027-02-18")).toBeNull();
  });
});

describe("classement et alertes", () => {
  it("classe par moyenne, puis par nom", () => {
    const ranking = paceRanking([
      { nom: "Léa F.", moi: false, valides: 14, semaines: 4 },
      { nom: "Sarah K.", moi: true, valides: 28, semaines: 4 },
      { nom: "Karim B.", moi: false, valides: 2, semaines: 1 },
      { nom: "Inès M.", moi: false, valides: 28, semaines: 4 },
    ]);
    expect(ranking.map((r) => [r.rang, r.nom, r.moyenne])).toEqual([
      [1, "Inès M.", 7],
      [1, "Sarah K.", 7],
      [3, "Léa F.", 3.5],
      [4, "Karim B.", 2],
    ]);
  });

  it("compte les conseillers à voir quand l'alerte est active", () => {
    const point = [
      { semaine: "2027-02-01", valides: 3, objectif: 7 },
      { semaine: "2027-02-08", valides: 2, objectif: 7 },
    ];
    const ok = [
      { semaine: "2027-02-01", valides: 7, objectif: 7 },
      { semaine: "2027-02-08", valides: 7, objectif: 7 },
    ];
    expect(paceTeamAlerts([point, ok, point], "2027-02-18", true)).toBe(2);
    expect(paceTeamAlerts([point], "2027-02-18", false)).toBe(0);
  });
});

describe("rythme récent de l'équipe", () => {
  it("fait la moyenne des 3 dernières semaines terminées", () => {
    const weeks = [
      { semaine: "2027-01-25", valides: 37 },
      { semaine: "2027-02-01", valides: 41 },
      { semaine: "2027-02-08", valides: 43 },
      { semaine: "2027-02-15", valides: 31 },
    ];
    expect(paceRecentRate(weeks, "2027-02-18")).toBe(40.3);
    expect(paceRecentRate([{ semaine: "2027-02-15", valides: 4 }], "2027-02-18")).toBeNull();
  });
});
