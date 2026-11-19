import { describe, expect, it } from "vitest";
import {
  identityComplete,
  identitySides,
  isIdentityPiece,
  isStripeFileId,
  mergeIdentityReadings,
  stripeIdentitySides,
} from "../src/identity-document";

describe("pièce d'identité : côtés à déposer", () => {
  it("demande le recto et le verso d'une carte ou d'un titre de séjour", () => {
    expect(identitySides("carte_identite")).toEqual(["recto", "verso"]);
    expect(identitySides("titre_sejour")).toEqual(["recto", "verso"]);
  });

  it("demande une seule page pour un passeport", () => {
    expect(identitySides("passeport")).toEqual(["recto"]);
  });

  it("est complète quand tous les côtés demandés sont déposés", () => {
    expect(identityComplete("carte_identite", { recto: true })).toBe(false);
    expect(identityComplete("carte_identite", { recto: true, verso: true })).toBe(true);
    expect(identityComplete("passeport", { recto: true })).toBe(true);
    expect(identityComplete("passeport", {})).toBe(false);
  });

  it("reconnaît les trois pièces", () => {
    expect(isIdentityPiece("titre_sejour")).toBe(true);
    expect(isIdentityPiece("permis")).toBe(false);
    expect(isIdentityPiece(null)).toBe(false);
  });
});

describe("pièce d'identité : lecture des deux côtés", () => {
  it("garde la première valeur trouvée, recto d'abord", () => {
    expect(
      mergeIdentityReadings([
        { birthDate: "1988-03-12", dateFin: null },
        { birthDate: null, dateFin: "2035-08-02" },
      ]),
    ).toEqual({ birthDate: "1988-03-12", dateFin: "2035-08-02" });
    expect(
      mergeIdentityReadings([{ dateFin: "2030-01-01" }, { dateFin: "2035-08-02" }]).dateFin,
    ).toBe("2030-01-01");
  });

  it("supporte un côté non lu", () => {
    expect(mergeIdentityReadings([null, undefined])).toEqual({ dateFin: null, birthDate: null });
  });
});

describe("pièce d'identité : transmission à Stripe", () => {
  it("transmet les deux côtés quand ce sont des images", () => {
    expect(
      stripeIdentitySides({
        piece: "carte_identite",
        share: true,
        mimeType: "image/jpeg",
        versoMimeType: "image/png",
      }),
    ).toEqual(["recto", "verso"]);
  });

  it("ne transmet que le recto sans verso, ou avec un verso en PDF", () => {
    expect(
      stripeIdentitySides({
        piece: "carte_identite",
        share: true,
        mimeType: "image/jpeg",
        versoMimeType: null,
      }),
    ).toEqual(["recto"]);
    expect(
      stripeIdentitySides({
        piece: "carte_identite",
        share: true,
        mimeType: "image/png",
        versoMimeType: "application/pdf",
      }),
    ).toEqual(["recto"]);
  });

  it("ne transmet rien si l'artisan refuse ou si le recto est un PDF", () => {
    expect(
      stripeIdentitySides({
        piece: "carte_identite",
        share: false,
        mimeType: "image/jpeg",
        versoMimeType: "image/jpeg",
      }),
    ).toEqual([]);
    expect(
      stripeIdentitySides({
        piece: "carte_identite",
        share: true,
        mimeType: "application/pdf",
        versoMimeType: "image/jpeg",
      }),
    ).toEqual([]);
  });

  it("ne transmet pas une pièce déposée avant le nouvel écran (artisan non informé)", () => {
    expect(
      stripeIdentitySides({
        piece: null,
        share: true,
        mimeType: "image/jpeg",
        versoMimeType: null,
      }),
    ).toEqual([]);
  });

  it("reconnaît un identifiant de fichier Stripe", () => {
    expect(isStripeFileId("file_1AbCdEfGh2345")).toBe(true);
    expect(isStripeFileId("ct_1AbCdEfGh2345")).toBe(false);
    expect(isStripeFileId("file_")).toBe(false);
  });
});
