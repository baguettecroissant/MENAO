import { describe, expect, it } from "vitest";
import {
  documentReadingJsonSchema,
  normalizeDocumentReading,
  prefillUpdates,
  type RawDocumentReading,
} from "../src/document-reading";

const raw = (overrides: Partial<RawDocumentReading> = {}): RawDocumentReading => ({
  type_document: "decennale",
  lisible: true,
  date_emission: "2026-01-05",
  date_fin: "2026-12-31",
  assureur: "  Assurances   Exemple ",
  numero: "DEC-0001",
  couverture: "France métropolitaine",
  siren: "123 456 789",
  ...overrides,
});

describe("lecture automatique des documents (ADR 0176)", () => {
  it("schéma : tous les champs obligatoires, rien d'autre", () => {
    const schema = documentReadingJsonSchema();
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.type_document.enum).toContain("autre");
  });

  it("décennale : assureur, numéro, date de fin et couverture, sans la date d'émission", () => {
    expect(normalizeDocumentReading(raw(), "decennale")).toEqual({
      fields: {
        assureur: "Assurances Exemple",
        numero: "DEC-0001",
        dateFin: "2026-12-31",
        couverture: "France métropolitaine",
      },
      warnings: [],
      detected: "decennale",
    });
  });

  it("chaque document ne pré-remplit que ses propres champs", () => {
    expect(normalizeDocumentReading(raw({ type_document: "kbis" }), "kbis").fields).toEqual({
      dateEmission: "2026-01-05",
    });
    expect(normalizeDocumentReading(raw({ type_document: "urssaf" }), "urssaf").fields).toEqual({
      dateEmission: "2026-01-05",
      numero: "DEC-0001",
    });
    expect(normalizeDocumentReading(raw({ type_document: "identite" }), "identite").fields).toEqual(
      { dateFin: "2026-12-31" },
    );
    expect(normalizeDocumentReading(raw({ type_document: "rc_pro" }), "rc_pro").fields).toEqual({
      assureur: "Assurances Exemple",
      numero: "DEC-0001",
      dateFin: "2026-12-31",
    });
  });

  it("dates inexistantes ou mal formées écartées, textes vides ignorés, longueurs bornées", () => {
    const reading = normalizeDocumentReading(
      raw({ date_fin: "2026-04-31", assureur: "   ", numero: "X".repeat(80) }),
      "decennale",
    );
    expect(reading.fields.dateFin).toBeUndefined();
    expect(reading.fields.assureur).toBeUndefined();
    expect(reading.fields.numero).toHaveLength(60);
    expect(
      normalizeDocumentReading(raw({ date_fin: "31/12/2026" }), "decennale").fields.dateFin,
    ).toBeUndefined();
    expect(
      normalizeDocumentReading(raw({ date_fin: "1890-01-01" }), "decennale").fields.dateFin,
    ).toBeUndefined();
  });

  it("autre document que celui attendu : alerte, rien de pré-rempli", () => {
    expect(normalizeDocumentReading(raw({ type_document: "rc_pro" }), "decennale")).toEqual({
      fields: {},
      warnings: ["autre_document"],
      detected: "rc_pro",
    });
    expect(normalizeDocumentReading(raw({ type_document: "inconnu" }), "kbis").detected).toBeNull();
  });

  it("document illisible : alerte, rien de pré-rempli", () => {
    expect(normalizeDocumentReading(raw({ lisible: false }), "decennale")).toEqual({
      fields: {},
      warnings: ["illisible"],
      detected: "decennale",
    });
  });

  it("SIREN lu différent de celui de l'entreprise : alerte (SIRET lu accepté)", () => {
    expect(
      normalizeDocumentReading(raw(), "decennale", { siret: "98765432100012" }).warnings,
    ).toEqual(["siren_different"]);
    expect(
      normalizeDocumentReading(raw(), "decennale", { siret: "12345678900012" }).warnings,
    ).toEqual([]);
    expect(
      normalizeDocumentReading(raw({ siren: "12345678900034" }), "decennale", {
        siret: "12345678900012",
      }).warnings,
    ).toEqual([]);
    // Sans SIRET connu, ou numéro incomplet : pas de comparaison.
    expect(normalizeDocumentReading(raw(), "decennale").warnings).toEqual([]);
    expect(
      normalizeDocumentReading(raw({ siren: "1234" }), "decennale", { siret: "98765432100012" })
        .warnings,
    ).toEqual([]);
  });

  it("pièce d'identité : jamais de comparaison de SIREN", () => {
    expect(
      normalizeDocumentReading(raw({ type_document: "identite" }), "identite", {
        siret: "98765432100012",
      }).warnings,
    ).toEqual([]);
  });

  it("pré-remplissage : champs vides ou remplis par la lecture précédente, saisie gardée", () => {
    expect(
      prefillUpdates(
        { assureur: "", numero: "SAISI-1", dateFin: "2026-06-30" },
        { assureur: "Assureur B", numero: "B-2", dateFin: "2027-06-30" },
        { dateFin: "2026-06-30" },
      ),
    ).toEqual({ assureur: "Assureur B", dateFin: "2027-06-30" });
    expect(prefillUpdates({ dateFin: null }, { dateFin: "2027-01-31" })).toEqual({
      dateFin: "2027-01-31",
    });
  });
});
