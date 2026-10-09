import { describe, expect, it } from "vitest";
import {
  MAX_SEARCH_RESULTS,
  TICKET_RESPONSE_DAYS,
  availability,
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
