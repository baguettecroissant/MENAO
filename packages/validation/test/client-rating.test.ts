import { describe, expect, it } from "vitest";
import { clientRatingSchema } from "../src/client-rating";
import { messages } from "../src/messages";

const valide = {
  welcome: "90",
  clarity: "75",
  payment: "100",
  comment: "Client accueillant, accès facile au chantier et paiement du solde le jour même.",
};

describe("clientRatingSchema", () => {
  it("convertit les curseurs en nombres", () => {
    expect(clientRatingSchema.parse(valide)).toMatchObject({
      welcome: 90,
      clarity: 75,
      payment: 100,
    });
  });

  it("refuse un curseur non touché, une valeur hors bornes ou un commentaire trop court", () => {
    for (const [champ, valeur, message] of [
      ["welcome", "", messages.reviewCriterionRequired],
      ["payment", "101", messages.reviewCriterionRequired],
      ["comment", "Très bien.", messages.clientRatingCommentTooShort],
    ] as const) {
      const r = clientRatingSchema.safeParse({ ...valide, [champ]: valeur });
      expect(r.success, champ).toBe(false);
      expect(r.error?.issues[0]?.message).toBe(message);
    }
  });
});
