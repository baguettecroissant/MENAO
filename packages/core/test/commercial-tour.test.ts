import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  isValidStart,
  orderStops,
  outcomeNextAction,
  planTour,
  routeMeters,
  tourApeCodes,
  tourDirectionsUrl,
  tourMinutes,
  tourSummary,
} from "../src/commercial-tour";

// Place Garibaldi, Nice, et des points le long d'une rue (environ 111 m par millième de degré de latitude).
const START = { lat: 43.7, lng: 7.28 };
const at = (id: string, dLat: number, mine = false) => ({ id, lat: 43.7 + dLat, lng: 7.28, mine });

describe("distance", () => {
  it("environ 111 m pour un millième de degré de latitude", () => {
    expect(distanceMeters(START, { lat: 43.701, lng: 7.28 })).toBe(111);
    expect(distanceMeters(START, START)).toBe(0);
  });
});

describe("métiers d'une tournée", () => {
  it("donne les codes APE sous leurs deux formes, sans doublon", () => {
    expect(tourApeCodes(["plombiers", "inconnu"])).toEqual(["43.22A", "4322A"]);
    expect(tourApeCodes(["menuisiers"])).toHaveLength(4);
  });
});

describe("ordre de passage", () => {
  it("va du plus proche au plus loin sur une ligne", () => {
    const stops = [at("c", 0.003), at("a", 0.001), at("b", 0.002)];
    expect(orderStops(START, stops).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
  it("le 2-opt ne rallonge jamais le parcours du plus proche voisin", () => {
    const pts = [
      at("a", 0.001),
      { id: "b", lat: 43.7, lng: 7.284 },
      at("c", -0.001),
      { id: "d", lat: 43.703, lng: 7.283 },
    ];
    const ordered = orderStops(START, pts);
    expect(ordered).toHaveLength(4);
    expect(routeMeters(START, ordered).total).toBeLessThanOrEqual(
      routeMeters(START, pts).total + 1,
    );
  });
});

describe("proposition de tournée", () => {
  it("met d'abord mes prospects à recontacter, puis les plus proches, dans le rayon", () => {
    const candidates = [
      ...Array.from({ length: 20 }, (_, i) => at(`p${i}`, 0.001 * (i + 1))),
      at("mien", 0.015, true),
      at("loin", 0.05),
    ];
    const plan = planTour(START, candidates, "court");
    expect(plan.stops).toHaveLength(8);
    expect(plan.stops.map((s) => s.id)).toContain("mien");
    expect(plan.stops.map((s) => s.id)).not.toContain("loin");
    expect(plan.others.length).toBe(10);
    expect(plan.minutes).toBe(tourMinutes(plan.meters, 8));
  });
});

describe("suite d'une visite", () => {
  const now = new Date("2027-01-12T09:30:00Z");
  it("à rappeler : le lendemain à 18 h ; absent : dans une semaine à 10 h (heure de Paris)", () => {
    expect(outcomeNextAction("a_rappeler", now)?.toISOString()).toBe("2027-01-13T17:00:00.000Z");
    expect(outcomeNextAction("absent", now)?.toISOString()).toBe("2027-01-19T09:00:00.000Z");
    expect(outcomeNextAction("interesse", now)).toBeNull();
  });
});

describe("bilan", () => {
  it("compte les vus sans les absents, et les arrêts passés", () => {
    expect(tourSummary(["interesse", "absent", "a_rappeler", "pas_interesse", null])).toEqual({
      stops: 5,
      seen: 3,
      interested: 1,
      callBacks: 1,
      absents: 1,
      skipped: 1,
    });
  });
});

describe("liens et départ", () => {
  it("Plans sur iPhone, Google Maps ailleurs", () => {
    expect(tourDirectionsUrl({ lat: 43.7, lng: 7.28 }, true)).toBe(
      "https://maps.apple.com/?daddr=43.700000,7.280000&dirflg=w",
    );
    expect(tourDirectionsUrl({ lat: 43.7, lng: 7.28 }, false)).toContain("travelmode=walking");
  });
  it("refuse un départ sans coordonnées valables", () => {
    expect(isValidStart({ lat: 43.7, lng: 7.28 })).toBe(true);
    expect(isValidStart({ lat: Number.NaN, lng: 7 })).toBe(false);
    expect(isValidStart(null)).toBe(false);
  });
});
