import { describe, expect, it } from "vitest";
import { adminQueue, adminQueuePoles } from "../src/admin-queue";

describe("file « À traiter » du back-office (ADR 0133)", () => {
  it("rien à traiter : liste vide", () => {
    expect(adminQueue({})).toEqual([]);
    expect(adminQueue({ dossiers: 0, litiges: 0 })).toEqual([]);
  });

  it("urgent, puis important, puis à faire", () => {
    const items = adminQueue({
      dossiers: 3,
      renouvellements: 1,
      impayes: 1,
      litiges: 1,
      notifications: 2,
      assurances: 3,
    });
    expect(items.map((i) => i.kind)).toEqual([
      "litiges",
      "notifications",
      "assurances",
      "impayes",
      "dossiers",
      "renouvellements",
    ]);
    expect(items[0]).toEqual({
      kind: "litiges",
      count: 1,
      severity: "urgent",
      pole: "support",
      deadline: null,
    });
  });

  it("à urgence égale, l'échéance la plus proche passe devant", () => {
    const items = adminQueue(
      {
        litiges: 1,
        tickets_retard: 2,
        demandes_expirent: 2,
        suppressions: 1,
        paiements_echoues: 1,
      },
      {
        demandes_expirent: "2026-10-18T15:00:00Z",
        suppressions: "2026-11-07T00:00:00Z",
      },
    );
    expect(items.map((i) => i.kind)).toEqual([
      "demandes_expirent",
      "litiges",
      "tickets_retard",
      "suppressions",
      "paiements_echoues",
    ]);
    expect(items[0]?.deadline).toBe("2026-10-18T15:00:00Z");
  });

  it("pôles des filtres, dans l'ordre, sans les pôles vides", () => {
    const items = adminQueue({ dossiers: 3, controles: 2, litiges: 1, impayes: 1 });
    expect(adminQueuePoles(items)).toEqual([
      { pole: "verification", count: 2 },
      { pole: "support", count: 1 },
      { pole: "argent", count: 1 },
    ]);
  });
});
