import { describe, expect, it } from "vitest";
import {
  MAX_SEARCH_RESULTS,
  type MatchCandidate,
  NEWCOMER,
  TICKET_RESPONSE_DAYS,
  ZONE_WIDENING_KM,
  availability,
  isNewcomer,
  rankCandidates,
  showWiderZone,
  specialtiesPreview,
  ticketDueDate,
} from "../src/matching";

describe("résultats de recherche (F-09)", () => {
  it("paramètres de la spec", () => {
    expect(MAX_SEARCH_RESULTS).toBe(5);
    expect(TICKET_RESPONSE_DAYS).toBe(7);
  });

  it("disponibilité de l'artisan", () => {
    const today = "2026-10-09";
    expect(availability({ paused: false, availableFrom: null }, today)).toEqual({
      kind: "immediate",
    });
    expect(availability({ paused: false, availableFrom: "2026-10-09" }, today)).toEqual({
      kind: "immediate",
    });
    expect(availability({ paused: false, availableFrom: "2026-11-02" }, today)).toEqual({
      kind: "from",
      date: "2026-11-02",
    });
    expect(availability({ paused: true, availableFrom: null }, today)).toEqual({ kind: "paused" });
  });

  it("1 à 2 spécialités, celles du projet d'abord, puis « +N »", () => {
    const works = [
      { code: "sanitaires", label: "Installation de sanitaires" },
      { code: "chauffe-eau", label: "Chauffe-eau" },
      { code: "recherche-fuite", label: "Recherche et réparation de fuite" },
    ];
    expect(specialtiesPreview(works, ["recherche-fuite"])).toEqual({
      shown: ["Recherche et réparation de fuite", "Installation de sanitaires"],
      more: 1,
    });
    expect(specialtiesPreview([], [])).toEqual({ shown: [], more: 0 });
  });

  it("échéance de réponse au dossier envoyé à MENAO", () => {
    expect(ticketDueDate(new Date("2026-10-09T10:00:00Z")).toISOString()).toBe(
      "2026-10-16T10:00:00.000Z",
    );
  });
});

describe("ordre des artisans proposés et place des nouveaux (ADR 0151)", () => {
  const candidate = (id: string, over: Partial<MatchCandidate> = {}): MatchCandidate => ({
    id,
    availableNow: true,
    availableFrom: null,
    score: 80,
    distanceKm: null,
    draw: id,
    newcomer: false,
    ...over,
  });
  const ids = (list: MatchCandidate[]) => list.map((c) => c.id);

  it("règle du nouvel artisan : moins de 90 jours ou moins de 3 chantiers menés à terme", () => {
    expect(NEWCOMER).toEqual({ days: 90, completedChantiers: 3, position: 3 });
    expect(isNewcomer(null, 0)).toBe(true);
    expect(isNewcomer(10, 8)).toBe(true);
    expect(isNewcomer(200, 2)).toBe(true);
    expect(isNewcomer(90, 3)).toBe(false);
    expect(isNewcomer(400, 12)).toBe(false);
  });

  it("disponibles tout de suite d'abord, puis score, date de disponibilité, distance et tirage", () => {
    const ranked = rankCandidates([
      candidate("complet-excellent", {
        availableNow: false,
        availableFrom: "2026-11-10",
        score: 95,
      }),
      candidate("libre-moyen", { score: 72 }),
      candidate("libre-bon", { score: 90 }),
      candidate("complet-bientot", { availableNow: false, availableFrom: "2026-10-25", score: 60 }),
      candidate("libre-bon-proche", { score: 90, distanceKm: 3 }),
    ]);
    expect(ids(ranked)).toEqual([
      "libre-bon-proche",
      "libre-bon",
      "libre-moyen",
      "complet-excellent",
      "complet-bientot",
    ]);
  });

  it("aucun nouveau parmi les 5 premiers : le premier nouveau prend la 3e place", () => {
    const established = [95, 92, 90, 88, 86, 84].map((score, i) =>
      candidate(`ancien-${i + 1}`, { score }),
    );
    const ranked = rankCandidates([
      ...established,
      candidate("nouveau", { score: 70, newcomer: true }),
    ]);
    expect(ids(ranked)).toEqual([
      "ancien-1",
      "ancien-2",
      "nouveau",
      "ancien-3",
      "ancien-4",
      "ancien-5",
      "ancien-6",
    ]);
    expect(ranked).toHaveLength(MAX_SEARCH_RESULTS + 2);
  });

  it("un nouveau déjà parmi les 5 premiers : ordre inchangé", () => {
    const list = [
      candidate("ancien-1", { score: 95 }),
      candidate("nouveau-bien-place", { score: 91, newcomer: true }),
      candidate("ancien-2", { score: 90 }),
      candidate("ancien-3", { score: 88 }),
      candidate("ancien-4", { score: 86 }),
      candidate("ancien-5", { score: 84 }),
      candidate("nouveau-loin", { score: 70, newcomer: true }),
    ];
    expect(ids(rankCandidates(list))).toEqual(ids(list));
  });

  it("plusieurs nouveaux hors des 5 premiers : un disponible, puis le tirage du projet", () => {
    const established = [95, 92, 90, 88, 86].map((score, i) =>
      candidate(`ancien-${i + 1}`, { score }),
    );
    const ranked = rankCandidates([
      ...established,
      candidate("nouveau-complet", {
        score: 75,
        newcomer: true,
        availableNow: false,
        availableFrom: "2026-11-01",
        draw: "0",
      }),
      candidate("nouveau-b", { score: 71, newcomer: true, draw: "b" }),
      candidate("nouveau-a", { score: 69, newcomer: true, draw: "a" }),
    ]);
    expect(ranked[NEWCOMER.position - 1]?.id).toBe("nouveau-a");
    expect(ids(ranked).slice(MAX_SEARCH_RESULTS)).toEqual([
      "ancien-5",
      "nouveau-b",
      "nouveau-complet",
    ]);
  });

  it("peu d'artisans : rien à réserver", () => {
    const list = [
      candidate("ancien", { score: 90 }),
      candidate("nouveau", { score: 70, newcomer: true }),
    ];
    expect(ids(rankCandidates(list))).toEqual(["ancien", "nouveau"]);
  });
});

describe("zone élargie (ADR 0165)", () => {
  it("20 km au-delà de la zone de l'artisan", () => {
    expect(ZONE_WIDENING_KM).toBe(20);
  });

  it("montrée seulement quand plus aucun artisan de la zone n'est à contacter", () => {
    expect(showWiderZone({ inZoneToContact: 0, slots: 3, nearby: 2 })).toBe(true);
    expect(showWiderZone({ inZoneToContact: 1, slots: 3, nearby: 2 })).toBe(false);
    expect(showWiderZone({ inZoneToContact: 0, slots: 0, nearby: 2 })).toBe(false);
    expect(showWiderZone({ inZoneToContact: 0, slots: 2, nearby: 0 })).toBe(false);
  });
});
