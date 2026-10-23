import { describe, expect, it } from "vitest";
import {
  DOCUMENT_REFUSAL_CODES,
  UPLOAD_PURPOSES,
  documentMetadataSchema,
  documentRefusalSchema,
  presentationSchema,
} from "../src/documents";
import { messages } from "../src/messages";

const today = new Date("2026-10-09T12:00:00Z");
const schema = documentMetadataSchema(today);

describe("documentMetadataSchema", () => {
  it("Kbis : date d'émission de moins de 3 mois, pas dans le futur", () => {
    expect(schema.parse({ type: "kbis", dateEmission: "2026-09-01" })).toEqual({
      type: "kbis",
      dateEmission: "2026-09-01",
    });
    expect(
      schema.safeParse({ type: "kbis", dateEmission: "2026-06-30" }).error?.issues[0]?.message,
    ).toBe(messages.kbisTooOld);
    expect(
      schema.safeParse({ type: "kbis", dateEmission: "2026-10-10" }).error?.issues[0]?.message,
    ).toBe(messages.dateInFuture);
  });

  it("décennale : assureur, numéro, date de fin non passée, couverture", () => {
    const ok = {
      type: "decennale",
      assureur: " Assurances Exemple ",
      numero: "POL-0001",
      dateFin: "2027-03-31",
      couverture: "France métropolitaine",
    };
    expect(schema.parse(ok)).toMatchObject({ assureur: "Assurances Exemple" });
    expect(schema.safeParse({ ...ok, dateFin: "2026-10-01" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, couverture: "" }).success).toBe(false);
  });

  it("date de fin : celle du jour refusée, avec son propre message (ADR 0176)", () => {
    const rcPro = { type: "rc_pro", assureur: "Exemple", numero: "RC-1" };
    expect(
      schema.safeParse({ ...rcPro, dateFin: "2026-10-09" }).error?.issues.map((i) => i.message),
    ).toEqual([messages.dateToday]);
    expect(
      schema.safeParse({ ...rcPro, dateFin: "2026-10-08" }).error?.issues.map((i) => i.message),
    ).toEqual([messages.dateExpired]);
    expect(schema.safeParse({ ...rcPro, dateFin: "2026-10-10" }).success).toBe(true);
    expect(
      schema.safeParse({ type: "identite", dateFin: "2026-10-09" }).error?.issues[0]?.message,
    ).toBe(messages.dateToday);
  });

  it("RC Pro : assureur, numéro, date de fin", () => {
    expect(
      schema.safeParse({
        type: "rc_pro",
        assureur: "Exemple",
        numero: "RC-1",
        dateFin: "2027-01-01",
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ type: "rc_pro", assureur: "Exemple", numero: "RC-1" }).success).toBe(
      false,
    );
  });

  it("attestation URSSAF : moins de 6 mois, code de sécurité obligatoire (ADR 0115)", () => {
    expect(
      schema.parse({ type: "urssaf", dateEmission: "2026-09-15", numero: " ABCD1234 " }),
    ).toEqual({ type: "urssaf", dateEmission: "2026-09-15", numero: "ABCD1234" });
    expect(
      schema.safeParse({ type: "urssaf", dateEmission: "2026-03-01", numero: "ABCD1234" }).error
        ?.issues[0]?.message,
    ).toBe(messages.urssafTooOld);
    expect(
      schema.safeParse({ type: "urssaf", dateEmission: "2026-09-15", numero: "" }).error?.issues[0]
        ?.message,
    ).toBe(messages.required);
  });

  it("pièce d'identité : date d'expiration facultative", () => {
    expect(schema.parse({ type: "identite" })).toEqual({ type: "identite" });
    expect(schema.parse({ type: "identite", dateFin: "" })).toEqual({ type: "identite" });
    expect(schema.safeParse({ type: "identite", dateFin: "2020-01-01" }).success).toBe(false);
  });

  it("type inconnu refusé", () => {
    expect(schema.safeParse({ type: "passeport_chien" }).success).toBe(false);
  });
});

describe("presentationSchema et usages", () => {
  it("présentation de 100 à 2000 caractères", () => {
    expect(presentationSchema.safeParse("a".repeat(99)).error?.issues[0]?.message).toBe(
      messages.presentationTooShort,
    );
    expect(presentationSchema.parse(`  ${"a".repeat(100)}  `)).toHaveLength(100);
    expect(presentationSchema.safeParse("a".repeat(2001)).success).toBe(false);
  });

  it("usages des fichiers déposés", () => {
    expect(UPLOAD_PURPOSES).toEqual(["document", "avatar", "portfolio", "logo"]);
  });
});

describe("motifs de refus d'un document (ADR 0120)", () => {
  it("motif de la liste, précision facultative", () => {
    expect(documentRefusalSchema.parse({ code: "illisible", detail: " " })).toEqual({
      code: "illisible",
    });
    expect(documentRefusalSchema.parse({ code: "expire", detail: "Kbis de mai" })).toEqual({
      code: "expire",
      detail: "Kbis de mai",
    });
  });

  it("motif absent ou inconnu : refusé", () => {
    for (const code of ["", "inconnu", undefined]) {
      const r = documentRefusalSchema.safeParse({ code });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe(messages.refusalCode);
    }
  });

  it("« autre » : précision obligatoire", () => {
    const r = documentRefusalSchema.safeParse({ code: "autre", detail: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(messages.refusalDetail);
    expect(DOCUMENT_REFUSAL_CODES).toContain("autre");
  });
});
