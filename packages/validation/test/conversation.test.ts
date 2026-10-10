import { describe, expect, it } from "vitest";
import { conversationMessageSchema, messageReportSchema } from "../src/conversation";
import { messages } from "../src/messages";

describe("messagerie (F-40)", () => {
  it("message nettoyé, non vide, 2 000 caractères au plus", () => {
    expect(conversationMessageSchema.parse({ body: "  Bonjour !  " })).toEqual({
      body: "Bonjour !",
    });
    expect(conversationMessageSchema.safeParse({ body: "   " }).error?.issues[0]?.message).toBe(
      messages.messageRequired,
    );
    expect(
      conversationMessageSchema.safeParse({ body: "x".repeat(2001) }).error?.issues[0]?.message,
    ).toBe(messages.messageTooLong);
  });

  it("signalement : motif de 10 caractères au moins", () => {
    expect(messageReportSchema.safeParse({ reason: "Spam" }).success).toBe(false);
    expect(messageReportSchema.safeParse({ reason: "Propos injurieux" }).success).toBe(true);
  });
});
