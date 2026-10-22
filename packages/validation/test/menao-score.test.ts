import { describe, expect, it } from "vitest";
import { diplomaSchema, googleReviewsSchema, parseMyMenaoScore } from "../src/menao-score";

describe("Score MENAO (ADR 0155)", () => {
  it("score de l'artisan connecté", () => {
    const data = {
      score: 74,
      parts: { verifie: 20, experience: 10, diplomes: 5, profil: 8, reactivite: 7, avis: 24 },
      facts: {
        verified: true,
        annees: 12,
        diplome: true,
        qualification: false,
        profil_pct: 80,
        reponse_minutes: null,
        devis_taux: 70,
        avis_menao: 0,
        note_menao: null,
        avis_google: null,
        note_google: null,
      },
      planning_updated_at: null,
    };
    expect(parseMyMenaoScore(data)?.score).toBe(74);
    expect(parseMyMenaoScore(null)).toBeNull();
    expect(parseMyMenaoScore({ ...data, score: "74" })).toBeNull();
  });

  it("diplôme déclaré : vide pour aucun", () => {
    expect(diplomaSchema.parse("cap")).toBe("cap");
    expect(diplomaSchema.parse("")).toBeNull();
    expect(diplomaSchema.safeParse("doctorat").success).toBe(false);
  });

  it("avis Google saisis par l'équipe", () => {
    expect(
      googleReviewsSchema.parse({ url: "https://maps.app.goo.gl/abc", rating: "4,7", count: "38" }),
    ).toEqual({ url: "https://maps.app.goo.gl/abc", rating: 4.7, count: 38 });
    expect(googleReviewsSchema.parse({ url: "", rating: "", count: "" })).toEqual({
      url: null,
      rating: null,
      count: null,
    });
    const issues = googleReviewsSchema
      .safeParse({ url: "https://exemple.test/x", rating: "6", count: "0" })
      .error?.issues.map((i) => i.path[0]);
    expect(issues).toEqual(["url", "rating", "count"]);
  });
});
