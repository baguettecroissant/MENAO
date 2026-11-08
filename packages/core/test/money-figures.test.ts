import { describe, expect, it } from "vitest";
import { expenseMonthFigures, invoiceFigures, quoteFigures } from "../src";

describe("quoteFigures", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  it("à envoyer, en attente et taux de signature sur 6 mois", () => {
    expect(
      quoteFigures(
        [
          { status: "brouillon", totalTtcCents: 101_200, sentAt: null },
          { status: "envoye", totalTtcCents: 186_120, sentAt: "2026-11-05T09:00:00Z" },
          { status: "signe", totalTtcCents: 792_000, sentAt: "2026-10-10T09:00:00Z" },
          { status: "refuse", totalTtcCents: 50_000, sentAt: "2026-09-01T09:00:00Z" },
          // Remplacé et trop ancien : hors du taux.
          { status: "remplace", totalTtcCents: 180_000, sentAt: "2026-11-01T09:00:00Z" },
          { status: "signe", totalTtcCents: 30_000, sentAt: "2026-01-02T09:00:00Z" },
        ],
        now,
      ),
    ).toEqual({ toSendCount: 1, pendingCount: 1, pendingCents: 186_120, signRate: 33 });
  });
  it("aucun devis envoyé : pas de taux", () => {
    expect(quoteFigures([], now)).toEqual({
      toSendCount: 0,
      pendingCount: 0,
      pendingCents: 0,
      signRate: null,
    });
  });
});

describe("invoiceFigures", () => {
  it("ce mois et cette année", () => {
    expect(
      invoiceFigures(
        [
          { issuedOn: "2026-11-05", totalTtcCents: 58_800 },
          { issuedOn: "2026-11-01", totalTtcCents: 18_600 },
          { issuedOn: "2026-10-14", totalTtcCents: 237_600 },
          { issuedOn: "2025-12-20", totalTtcCents: 10_000 },
        ],
        "2026-11-08",
      ),
    ).toEqual({ monthCents: 77_400, monthCount: 2, yearCents: 315_000 });
  });
});

describe("expenseMonthFigures", () => {
  it("total et TVA du mois", () => {
    expect(
      expenseMonthFigures(
        [
          { issuedOn: "2026-11-03", totalTtcCents: 124_000, totalTvaCents: 20_667 },
          { issuedOn: "2026-11-02", totalTtcCents: 6_840, totalTvaCents: 1_140 },
          { issuedOn: "2026-10-28", totalTtcCents: 12_900, totalTvaCents: 2_150 },
        ],
        "2026-11-08",
      ),
    ).toEqual({ monthCents: 130_840, monthTvaCents: 21_807, monthCount: 2 });
  });
});
