import { describe, expect, it } from "vitest";
import { messages } from "../src/messages";
import {
  reviewModerationSchema,
  reviewReplySchema,
  reviewReportSchema,
  reviewSchema,
} from "../src/review";

const comment = "Travail soigné, chantier propre et artisan ponctuel du début à la fin.";

describe("avis du client (F-28)", () => {
  it("trois notes de 0 à 100, rapport qualité/prix, commentaire nettoyé", () => {
    expect(
      reviewSchema.parse({
        quality: "80",
        delays: "100",
        communication: "0",
        value_for_money: "excellent",
        comment: `  ${comment}  `,
      }),
    ).toEqual({
      quality: 80,
      delays: 100,
      communication: 0,
      value_for_money: "excellent",
      comment,
    });
  });

  it("curseur non touché (chaîne vide) ou valeur hors bornes : refusé", () => {
    const bad = reviewSchema.safeParse({
      quality: "",
      delays: "101",
      communication: "4.5",
      value_for_money: "gratuit",
      comment,
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.message)).toEqual([
      messages.reviewCriterionRequired,
      messages.reviewCriterionRequired,
      messages.reviewCriterionRequired,
      messages.reviewValueRequired,
    ]);
    expect(reviewSchema.safeParse({ comment }).success).toBe(false);
  });

  it("commentaire de 50 à 2 000 caractères, espaces exclus aux extrémités", () => {
    const base = {
      quality: "50",
      delays: "50",
      communication: "50",
      value_for_money: "convenable",
    };
    const short = reviewSchema.safeParse({ ...base, comment: `  ${"x".repeat(49)}   ` });
    expect(short.error?.issues.map((i) => i.message)).toEqual([messages.reviewCommentTooShort]);
    expect(reviewSchema.safeParse({ ...base, comment: "x".repeat(50) }).success).toBe(true);
    const long = reviewSchema.safeParse({ ...base, comment: "x".repeat(2001) });
    expect(long.error?.issues.map((i) => i.message)).toEqual([messages.reviewCommentTooLong]);
  });
});

describe("réponse, signalement, modération", () => {
  it("réponse de l'artisan : non vide, 2 000 caractères au plus", () => {
    expect(reviewReplySchema.parse({ reply: " Merci ! " })).toEqual({ reply: "Merci !" });
    expect(reviewReplySchema.safeParse({ reply: "   " }).error?.issues[0]?.message).toBe(
      messages.reviewReplyRequired,
    );
    expect(reviewReplySchema.safeParse({ reply: "x".repeat(2001) }).success).toBe(false);
  });

  it("signalement : motif de 10 caractères au moins", () => {
    expect(reviewReportSchema.safeParse({ reason: "Faux avis" }).error?.issues[0]?.message).toBe(
      messages.reviewReportTooShort,
    );
    expect(reviewReportSchema.safeParse({ reason: "Propos injurieux" }).success).toBe(true);
  });

  it("masquage par l'équipe : motif obligatoire", () => {
    expect(reviewModerationSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(
      reviewModerationSchema.safeParse({ reason: "Données personnelles d'un tiers" }).success,
    ).toBe(true);
  });
});
