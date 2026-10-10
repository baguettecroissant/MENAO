import { describe, expect, it } from "vitest";
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_RATE_LIMIT,
  conversationClosed,
  messageAttachmentKind,
} from "../src/messaging";

describe("messagerie par chantier (F-40)", () => {
  it("conversation fermée (lecture seule) si le chantier est annulé ou le devis refusé", () => {
    expect(conversationClosed("annule")).toBe(true);
    expect(conversationClosed("devis_refuse")).toBe(true);
    for (const status of [
      "rdv_planifie",
      "en_cours",
      "reserves_a_lever",
      "cloture",
      "en_litige",
    ] as const) {
      expect(conversationClosed(status)).toBe(false);
    }
  });

  it("pièces jointes : photos (JPEG, PNG) et documents PDF", () => {
    expect(messageAttachmentKind("jpeg")).toBe("photo");
    expect(messageAttachmentKind("png")).toBe("photo");
    expect(messageAttachmentKind("pdf")).toBe("fichier");
  });

  it("limites : 2 000 caractères, 30 messages par minute", () => {
    expect(MESSAGE_MAX_LENGTH).toBe(2000);
    expect(MESSAGE_RATE_LIMIT).toEqual({ max: 30, windowSeconds: 60 });
  });
});
