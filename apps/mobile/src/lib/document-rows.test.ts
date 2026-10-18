import { describe, expect, it } from "vitest";
import { documentRows } from "./document-rows";

const today = new Date("2026-10-18T10:00:00Z");
const doc = (
  type: string,
  status: string,
  date_fin: string | null,
  created_at: string,
  refusal_reason: string | null = null,
) => ({
  type,
  status,
  date_fin,
  refusal_reason,
  created_at,
});

describe("« Mes documents » dans l'application (ADR 0123)", () => {
  it("artisan validé : échéances, renouvellement déposé, refus, Kbis non renouvelable", () => {
    const rows = documentRows(
      { status: "valide", decennaleExempt: false },
      [
        doc("kbis", "valide", null, "2026-01-01"),
        doc("decennale", "valide", "2026-10-28", "2026-01-01"),
        doc("rc_pro", "valide", "2026-11-01", "2026-01-01"),
        doc("rc_pro", "en_attente", "2027-11-01", "2026-10-15"),
        doc("urssaf", "valide", "2026-10-10", "2026-04-01"),
        doc("urssaf", "refuse", null, "2026-10-12", "Document illisible"),
        doc("identite", "remplace", "2026-01-01", "2025-01-01"),
      ],
      today,
    );
    const byType = Object.fromEntries(rows.map((r) => [r.type, r]));
    expect(byType.kbis).toMatchObject({ canUpload: false, pending: false });
    expect(byType.decennale?.current).toEqual({
      dateFin: "2026-10-28",
      expiry: "bientot",
      days: 10,
    });
    expect(byType.rc_pro).toMatchObject({ pending: true, canUpload: true });
    expect(byType.urssaf).toMatchObject({
      refused: true,
      refusedReason: "Document illisible",
      canUpload: true,
    });
    expect(byType.urssaf?.current?.expiry).toBe("expire");
    expect(byType.identite).toMatchObject({ current: null, canUpload: true });
  });

  it("inscription : tout se dépose ; décennale non soumise signalée", () => {
    const rows = documentRows({ status: "brouillon", decennaleExempt: true }, [], today);
    expect(rows.every((r) => r.canUpload && r.current === null)).toBe(true);
    expect(rows.find((r) => r.type === "decennale")?.exempt).toBe(true);
  });

  it("dossier en vérification ou compte radié : aucun dépôt", () => {
    for (const status of ["en_verification", "radie"]) {
      expect(
        documentRows({ status, decennaleExempt: false }, [], today).some((r) => r.canUpload),
      ).toBe(false);
    }
  });
});
