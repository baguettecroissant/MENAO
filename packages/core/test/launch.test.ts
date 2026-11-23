import { describe, expect, it } from "vitest";
import { PAYMENTS_OPEN, REQUESTS_OPEN, SITE_OPEN } from "../src/launch";

// Décision du 23 novembre 2026 (ADR 0387) : vitrine ouverte, demandes et paiements fermés.
describe("ouverture progressive", () => {
  it("site ouvert, demandes de devis et paiements fermés jusqu'au lancement", () => {
    expect(SITE_OPEN).toBe(true);
    expect(REQUESTS_OPEN).toBe(false);
    expect(PAYMENTS_OPEN).toBe(false);
  });
});
