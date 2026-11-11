import { describe, expect, it } from "vitest";
import {
  leadAlerts,
  leadCause,
  leadProgress,
  monthTarget,
  type LeadProgress,
} from "../src/lead-targets";

describe("monthTarget", () => {
  it("objectif entier pour un artisan validé avant le mois", () => {
    expect(monthTarget(4, "2026-11-01", "2026-10-15")).toBe(4);
    expect(monthTarget(4, "2026-11-01", "2026-11-01")).toBe(4);
  });

  it("au prorata des jours restants pour un artisan validé dans le mois", () => {
    // Validé le 16 novembre : 15 jours sur 30.
    expect(monthTarget(4, "2026-11-01", "2026-11-16")).toBe(2);
    // Validé le dernier jour : au moins 1.
    expect(monthTarget(4, "2026-11-01", "2026-11-30")).toBe(1);
  });

  it("hors suivi : pas encore validé ou objectif à 0", () => {
    expect(monthTarget(4, "2026-11-01", "2026-12-01")).toBeNull();
    expect(monthTarget(0, "2026-11-01", "2026-10-01")).toBeNull();
  });
});

describe("leadProgress", () => {
  const base = { month: "2026-11-01", validatedOn: "2026-09-01", target: 4 };

  it("dans les temps au rythme de l'objectif", () => {
    // Le 11 novembre : 11 jours sur 30, 4 × 11/30 = 1,47 → 1 demande attendue.
    const p = leadProgress({ ...base, today: "2026-11-11", received: 1 });
    expect(p).toMatchObject({ expected: 1, missing: 3, status: "dans_les_temps", closed: false });
  });

  it("en retard sous le rythme attendu", () => {
    const p = leadProgress({ ...base, today: "2026-11-20", received: 1 });
    expect(p).toMatchObject({ expected: 2, status: "en_retard" });
  });

  it("atteint dès que l'objectif est rempli, même en cours de mois", () => {
    expect(leadProgress({ ...base, today: "2026-11-05", received: 4 }).status).toBe("atteint");
  });

  it("mois terminé : atteint ou manqué", () => {
    expect(
      leadProgress({ ...base, month: "2026-10-01", today: "2026-11-11", received: 4 }).status,
    ).toBe("atteint");
    const missed = leadProgress({ ...base, month: "2026-10-01", today: "2026-11-11", received: 1 });
    expect(missed).toMatchObject({ status: "manque", closed: true, missing: 3 });
  });

  it("artisan validé dans le mois : rythme compté depuis sa validation", () => {
    // Validé le 16 : objectif 2 ; le 23, 8 jours sur 15 → 1 demande attendue.
    const p = leadProgress({
      ...base,
      validatedOn: "2026-11-16",
      today: "2026-11-23",
      received: 0,
    });
    expect(p).toMatchObject({ target: 2, expected: 1, status: "en_retard" });
  });

  it("hors suivi avant la validation", () => {
    expect(
      leadProgress({ ...base, month: "2026-08-01", today: "2026-11-11", received: 0 }).status,
    ).toBe("hors_suivi");
  });
});

describe("leadAlerts", () => {
  const month = (status: LeadProgress["status"], closed: boolean): LeadProgress => ({
    month: "2026-01-01",
    target: 4,
    received: 0,
    expected: 4,
    missing: 4,
    status,
    closed,
  });

  it("deux mois terminés de suite sous l'objectif", () => {
    expect(
      leadAlerts(
        [month("manque", true), month("manque", true), month("dans_les_temps", false)],
        "2026-11-03",
      ),
    ).toEqual(["deux_mois"]);
    expect(
      leadAlerts(
        [month("manque", true), month("atteint", true), month("dans_les_temps", false)],
        "2026-11-03",
      ),
    ).toEqual([]);
  });

  it("retard sur le mois en cours seulement à partir du 10", () => {
    const history = [month("atteint", true), month("en_retard", false)];
    expect(leadAlerts(history, "2026-11-09")).toEqual([]);
    expect(leadAlerts(history, "2026-11-10")).toEqual(["en_retard"]);
  });
});

describe("leadCause", () => {
  const late = leadProgress({
    month: "2026-11-01",
    today: "2026-11-20",
    validatedOn: "2026-09-01",
    target: 4,
    received: 0,
  });
  const ok = { paused: false, absent: false, visible: true, searches: 3 };

  it("rien à signaler quand l'objectif est tenu", () => {
    const fine = { ...late, status: "dans_les_temps" as const };
    expect(leadCause({ ...ok, progress: fine })).toBeNull();
  });

  it("dans l'ordre : pause, absence, fiche invisible, aucune recherche, peu choisi", () => {
    expect(leadCause({ ...ok, progress: late, paused: true, absent: true })).toBe("en_pause");
    expect(leadCause({ ...ok, progress: late, absent: true })).toBe("absent");
    expect(leadCause({ ...ok, progress: late, visible: false })).toBe("invisible");
    expect(leadCause({ ...ok, progress: late, searches: 0 })).toBe("aucune_recherche");
    expect(leadCause({ ...ok, progress: late })).toBe("peu_choisi");
  });
});
