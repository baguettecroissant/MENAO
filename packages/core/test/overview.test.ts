import { describe, expect, it } from "vitest";
import { CHANTIER_STATUSES } from "../src/chantier-state";
import {
  ACTIVITY_CATEGORIES,
  activityKinds,
  CHANTIER_STAGES,
  chantierStage,
  chantiersByStage,
  churnRate,
  PROJECT_FILTERS,
  parseActivityCategory,
  parseChantierStage,
  parseProjectFilter,
  percent,
  requestRates,
  searchConversion,
  statusesOfStage,
} from "../src/overview";

describe("vue d'ensemble du back-office : étapes des chantiers (F-58)", () => {
  it("chaque statut appartient à une étape", () => {
    for (const status of CHANTIER_STATUSES) {
      expect(CHANTIER_STAGES).toContain(chantierStage(status));
    }
  });

  it("regroupe les statuts dans l'ordre du parcours", () => {
    expect(chantierStage("rdv_planifie")).toBe("demande");
    expect(chantierStage("devis_en_revision")).toBe("devis");
    expect(chantierStage("acompte_paye")).toBe("travaux");
    expect(chantierStage("reserves_a_lever")).toBe("reception");
    expect(chantierStage("cloture")).toBe("termine");
    expect(chantierStage("en_litige")).toBe("litige");
    expect(chantierStage("devis_refuse")).toBe("abandonne");
    expect(chantierStage("annule")).toBe("abandonne");
  });

  it("additionne les compteurs par étape et ignore les statuts inconnus", () => {
    expect(
      chantiersByStage({ rdv_planifie: 2, devis_envoye: 1, en_cours: 3, planifie: 1, inconnu: 9 }),
    ).toEqual({
      demande: 2,
      devis: 1,
      travaux: 4,
      reception: 0,
      termine: 0,
      litige: 0,
      abandonne: 0,
    });
  });
});

describe("vue d'ensemble du back-office : taux (F-58)", () => {
  it("pourcentage arrondi, absent sans dénominateur", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 0)).toBeNull();
  });

  it("demandes arrivées à leur terme : réponse et acceptation", () => {
    expect(requestRates({ accepted: 6, refused: 2, expired: 2 })).toEqual({
      response: 80,
      acceptance: 60,
    });
    expect(requestRates({ accepted: 0, refused: 0, expired: 0 })).toEqual({
      response: null,
      acceptance: null,
    });
  });

  it("conversion des recherches en demandes envoyées", () => {
    expect(searchConversion({ searches: 8, sent: 2 })).toBe(25);
    expect(searchConversion({ searches: 0, sent: 0 })).toBeNull();
  });

  it("désabonnement sur 30 jours : abonnements perdus parmi ceux en cours au début", () => {
    expect(churnRate({ lost: 1, atStart: 20 })).toBe(5);
    expect(churnRate({ lost: 1, atStart: 3 })).toBe(33);
    expect(churnRate({ lost: 0, atStart: 0 })).toBeNull();
  });
});

describe("listes du back-office : filtres (F-53)", () => {
  it("les statuts d'une étape sont ceux qui y mènent, sans doublon ni oubli", () => {
    expect(statusesOfStage("travaux")).toEqual([
      "devis_signe",
      "acompte_paye",
      "planifie",
      "en_cours",
    ]);
    expect(statusesOfStage("abandonne")).toEqual(["devis_refuse", "annule"]);
    const all = CHANTIER_STAGES.flatMap((stage) => statusesOfStage(stage));
    expect([...all].sort()).toEqual([...CHANTIER_STATUSES].sort());
  });

  it("filtre des demandes : valeur connue, sinon toutes", () => {
    expect(PROJECT_FILTERS[0]).toBe("toutes");
    expect(parseProjectFilter("expirent")).toBe("expirent");
    expect(parseProjectFilter("inconnu")).toBe("toutes");
    expect(parseProjectFilter(undefined)).toBe("toutes");
  });

  it("étape des chantiers : valeur connue, sinon aucune", () => {
    expect(parseChantierStage("litige")).toBe("litige");
    expect(parseChantierStage("inconnue")).toBeNull();
    expect(parseChantierStage(["devis"])).toBeNull();
  });
});

describe("activité du back-office : catégories (ADR 0146)", () => {
  it("chaque type d'événement appartient à une seule catégorie", () => {
    const kinds = ACTIVITY_CATEGORIES.filter((c) => c !== "tout").flatMap(
      (c) => activityKinds(c) ?? [],
    );
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds).toHaveLength(12);
  });

  it("« tout » : aucun filtre ; une catégorie : ses types d'événements", () => {
    expect(activityKinds("tout")).toBeNull();
    expect(activityKinds("dossiers")).toEqual(["dossier_envoye", "dossier_decision"]);
  });

  it("catégorie inconnue dans l'adresse : tout", () => {
    expect(parseActivityCategory("demandes")).toBe("demandes");
    expect(parseActivityCategory("autre")).toBe("tout");
    expect(parseActivityCategory(undefined)).toBe("tout");
  });
});
