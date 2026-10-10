import { describe, expect, it } from "vitest";
import { disputeDecisionSchema, problemReportSchema, ticketMessageSchema } from "../src/dispute";
import { messages } from "../src/messages";

describe("litiges (F-42)", () => {
  it("signalement : catégorie de la liste, description de 20 caractères au moins", () => {
    expect(
      problemReportSchema.parse({
        category: "malfacon",
        description: "  Fuite sous l'évier refait.  ",
      }),
    ).toEqual({ category: "malfacon", description: "Fuite sous l'évier refait." });
    const bad = problemReportSchema.safeParse({ category: "", description: "Fuite" });
    expect(bad.error?.issues.map((i) => i.message)).toEqual([
      messages.disputeCategoryRequired,
      messages.disputeDescriptionTooShort,
    ]);
  });

  it("message du ticket : non vide", () => {
    expect(ticketMessageSchema.safeParse({ body: "  " }).success).toBe(false);
    expect(ticketMessageSchema.parse({ body: " Merci " })).toEqual({ body: "Merci" });
  });

  it("décision : reprise ou annulation, expliquée", () => {
    expect(
      disputeDecisionSchema.safeParse({ outcome: "remboursement", message: "x".repeat(10) })
        .success,
    ).toBe(false);
    expect(
      disputeDecisionSchema.safeParse({
        outcome: "reprise",
        message: "Nouveau rendez-vous convenu.",
      }).success,
    ).toBe(true);
  });
});
