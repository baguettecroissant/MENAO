import { describe, expect, it } from "vitest";
import { adminReviewChecklist, type AdminReviewInput } from "../src/admin-review";

const today = new Date("2026-10-18T10:00:00+02:00");
const doc = (
  type: string,
  status: string,
  extra: Partial<AdminReviewInput["documents"][number]> = {},
) => ({
  type,
  status,
  created_at: "2026-10-10T10:00:00Z",
  date_emission: "2026-09-20",
  date_fin: "2027-06-30",
  ...extra,
});

const complete: AdminReviewInput = {
  documents: [
    doc("kbis", "valide"),
    doc("decennale", "valide"),
    doc("rc_pro", "valide"),
    doc("identite", "valide"),
    doc("urssaf", "valide"),
  ],
  decennaleExempt: false,
  validated: false,
  certifications: [{ verified_at: "2026-10-12T10:00:00Z" }],
  siretVerified: true,
  sireneActive: true,
  charterSigned: true,
};

describe("« Ce qui reste à vérifier » dans le back-office (ADR 0133)", () => {
  it("dossier complet : prêt à valider", () => {
    expect(adminReviewChecklist(complete, today)).toEqual({
      pendingDocuments: 0,
      missingDocuments: 0,
      refusedDocuments: 0,
      pendingCertifications: 0,
      siret: "ok",
      charterSigned: true,
      ready: true,
    });
  });

  it("documents en attente, refusés, manquants ; certification, SIRET et charte", () => {
    const c = adminReviewChecklist(
      {
        ...complete,
        documents: [
          doc("kbis", "valide"),
          doc("decennale", "en_attente"),
          doc("rc_pro", "refuse"),
          doc("urssaf", "remplace"),
        ],
        certifications: [{ verified_at: null }, { verified_at: null }],
        siretVerified: false,
        charterSigned: false,
      },
      today,
    );
    expect(c).toMatchObject({
      pendingDocuments: 1,
      refusedDocuments: 1,
      missingDocuments: 2,
      pendingCertifications: 2,
      siret: "unchecked",
      charterSigned: false,
      ready: false,
    });
  });

  it("un nouveau dépôt après un refus : en attente, pas refusé", () => {
    const c = adminReviewChecklist(
      {
        ...complete,
        documents: [
          ...complete.documents.filter((d) => d.type !== "rc_pro"),
          doc("rc_pro", "refuse", { created_at: "2026-10-01T10:00:00Z" }),
          doc("rc_pro", "en_attente", { created_at: "2026-10-15T10:00:00Z" }),
        ],
      },
      today,
    );
    expect(c).toMatchObject({ pendingDocuments: 1, refusedDocuments: 0, ready: false });
  });

  it("dossier pas encore validé : Kbis de plus de 3 mois à refaire ; validé, il ne compte plus", () => {
    const old = complete.documents.map((d) =>
      d.type === "kbis" ? { ...d, date_emission: "2026-01-05" } : d,
    );
    expect(adminReviewChecklist({ ...complete, documents: old }, today).missingDocuments).toBe(1);
    expect(
      adminReviewChecklist({ ...complete, documents: old, validated: true }, today).ready,
    ).toBe(true);
  });

  it("entreprise inactive dans Sirene ; décennale non exigée pour un artisan non soumis", () => {
    expect(adminReviewChecklist({ ...complete, sireneActive: false }, today).siret).toBe(
      "inactive",
    );
    const sansDecennale = complete.documents.filter((d) => d.type !== "decennale");
    expect(
      adminReviewChecklist({ ...complete, documents: sansDecennale, decennaleExempt: true }, today)
        .ready,
    ).toBe(true);
  });
});
