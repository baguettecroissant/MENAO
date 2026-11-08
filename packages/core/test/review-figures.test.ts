import { describe, expect, it } from "vitest";
import { isLowReview, reviewAwaitsReply, reviewFigures, reviewMatches } from "../src";

const review = (
  score: number,
  reply: string | null = null,
  status: "publie" | "masque" = "publie",
) => ({ score, reply, status });

describe("isLowReview", () => {
  it("4 étoiles ou moins, à l'étoile la plus proche : sous 90 sur 100", () => {
    expect(isLowReview(100)).toBe(false);
    expect(isLowReview(90)).toBe(false);
    expect(isLowReview(89)).toBe(true);
    expect(isLowReview(40)).toBe(true);
  });
});

describe("reviewAwaitsReply", () => {
  it("avis publié sans réponse seulement", () => {
    expect(reviewAwaitsReply(review(95))).toBe(true);
    expect(reviewAwaitsReply(review(95, "Merci"))).toBe(false);
    expect(reviewAwaitsReply(review(95, null, "masque"))).toBe(false);
  });
});

describe("reviewMatches", () => {
  it("tous, sans réponse, note plus basse", () => {
    const low = review(70, "Merci");
    expect(reviewMatches(low, "tous")).toBe(true);
    expect(reviewMatches(low, "sans_reponse")).toBe(false);
    expect(reviewMatches(low, "note_basse")).toBe(true);
    expect(reviewMatches(review(96), "sans_reponse")).toBe(true);
    expect(reviewMatches(review(96), "note_basse")).toBe(false);
  });
});

describe("reviewFigures", () => {
  it("note arrondie, avis publiés, sans réponse et nombres des filtres", () => {
    expect(
      reviewFigures(
        [review(96), review(93, "Merci"), review(84), review(60, null, "masque")],
        93.6,
      ),
    ).toEqual({
      rating: 94,
      published: 3,
      toAnswer: 2,
      counts: { tous: 4, sans_reponse: 2, note_basse: 2 },
    });
  });

  it("aucun avis publié : pas de note", () => {
    expect(reviewFigures([], null)).toEqual({
      rating: null,
      published: 0,
      toAnswer: 0,
      counts: { tous: 0, sans_reponse: 0, note_basse: 0 },
    });
  });
});
