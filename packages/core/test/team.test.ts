import { describe, expect, it } from "vitest";
import {
  TEAM_PERMISSIONS,
  chantierRights,
  parseChantierTeam,
  parseTeam,
  parseTeamContext,
  teamCan,
  teamIncluded,
  teamMemberName,
  teamMemberState,
  teamSeatsLeft,
} from "../src/team";

describe("comptes d'équipe (ADR 0240)", () => {
  it("contexte du patron, d'un membre, d'un membre suspendu", () => {
    expect(
      parseTeamContext({ artisan_id: "a1", role: "patron", suspendu: false, entreprise: "Pro" }),
    ).toEqual({ artisanId: "a1", position: "patron", suspended: false, company: "Pro" });
    expect(parseTeamContext({ artisan_id: "a1", role: "chef", suspendu: false })).toEqual({
      artisanId: "a1",
      position: "chef",
      suspended: false,
      company: null,
    });
    expect(
      parseTeamContext({ artisan_id: null, role: "ouvrier", suspendu: true, entreprise: "Pro" }),
    ).toEqual({ artisanId: null, position: "ouvrier", suspended: true, company: "Pro" });
  });

  it("contexte absent ou inattendu", () => {
    expect(parseTeamContext(null)).toBeNull();
    expect(parseTeamContext({ artisan_id: "a1", role: "stagiaire" })).toBeNull();
    expect(parseTeamContext({ artisan_id: null, role: "patron" })).toBeNull();
    // Un patron n'est jamais suspendu par l'équipe.
    expect(parseTeamContext({ artisan_id: "a1", role: "patron", suspendu: true })?.suspended).toBe(
      false,
    );
  });

  it("équipe : places, comptes utilisés, état de chaque membre", () => {
    const team = parseTeam({
      entreprise: "Maçonnerie Patron",
      formule: "premium",
      places: 3,
      utilisees: 2,
      membres: [
        {
          user_id: "u1",
          prenom: "Léa",
          nom: "Martin",
          email: "lea@example.test",
          role: "chef",
          depuis: "2026-11-07T10:00:00Z",
          en_attente: false,
          suspension: null,
        },
        {
          user_id: "u2",
          email: "ouvrier@example.test",
          role: "ouvrier",
          en_attente: true,
          suspension: null,
        },
        { user_id: "u3", role: "ouvrier", en_attente: false, suspension: "places" },
        { user_id: "u4", role: "inconnu" },
      ],
    });
    expect(team?.seats).toBe(3);
    expect(team?.used).toBe(2);
    expect(team?.members.map((m) => m.state)).toEqual(["actif", "en_attente", "suspendu_places"]);
    expect(team && teamSeatsLeft(team)).toBe(1);
    expect(team && teamIncluded(team)).toBe(true);
    const [lea, ouvrier] = team?.members ?? [];
    expect(lea && teamMemberName(lea)).toBe("Léa Martin");
    expect(ouvrier && teamMemberName(ouvrier)).toBe("ouvrier@example.test");
  });

  it("formule Base : une place, rien de plus", () => {
    const team = parseTeam({ places: 1, utilisees: 1, membres: [] });
    expect(team && teamIncluded(team)).toBe(false);
    expect(team && teamSeatsLeft(team)).toBe(0);
    expect(parseTeam({})).toBeNull();
  });

  it("état d'un membre", () => {
    expect(teamMemberState({ pending: true, suspension: "patron" })).toBe("suspendu_patron");
    expect(teamMemberState({ pending: false, suspension: null })).toBe("actif");
    expect(teamSeatsLeft({ seats: 1, used: 3 })).toBe(0);
  });

  it("droits de chaque place (ADR 0241)", () => {
    // Le patron peut tout.
    expect(TEAM_PERMISSIONS.every((p) => teamCan("patron", p))).toBe(true);
    // Le chef encadre, sans les réglages du patron.
    expect(TEAM_PERMISSIONS.filter((p) => teamCan("chef", p))).toEqual([
      "allChantiers",
      "money",
      "requests",
      "chantierDecisions",
      "assignChantiers",
      "agenda",
      "secretary",
    ]);
    // L'ouvrier : ses chantiers seulement, aucun montant ; rien sans place.
    expect(TEAM_PERMISSIONS.some((p) => teamCan("ouvrier", p))).toBe(false);
    expect(teamCan(null, "money")).toBe(false);
    expect(teamCan(undefined, "allChantiers")).toBe(false);
  });

  it("équipe d'un chantier (ADR 0241)", () => {
    expect(
      parseChantierTeam([
        { user_id: "u1", prenom: "Léa", nom: "Martin", role: "chef", affecte: false },
        { user_id: "u2", prenom: " ", role: "ouvrier", affecte: true },
        { user_id: "u3", role: "stagiaire", affecte: true },
        null,
      ]),
    ).toEqual([
      { userId: "u1", firstName: "Léa", lastName: "Martin", role: "chef", assigned: false },
      { userId: "u2", firstName: null, lastName: null, role: "ouvrier", assigned: true },
    ]);
    expect(parseChantierTeam(null)).toEqual([]);
  });

  it("droits sur la fiche d'un chantier (ADR 0241)", () => {
    expect(chantierRights("patron")).toEqual({
      money: true,
      decisions: true,
      replyReviews: true,
      assign: true,
    });
    expect(chantierRights("chef")).toEqual({
      money: true,
      decisions: true,
      replyReviews: false,
      assign: true,
    });
    expect(chantierRights("ouvrier")).toEqual({
      money: false,
      decisions: false,
      replyReviews: false,
      assign: false,
    });
  });
});
