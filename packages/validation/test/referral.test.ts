import { describe, expect, it } from "vitest";
import {
  artisanInvitationSchema,
  parseReferral,
  parseReferralRows,
  parseWelcomeGift,
  welcomeGiftChoiceSchema,
} from "../src/referral";

describe("filleuls du parrain (ADR 0161)", () => {
  it("lignes attendues, lignes inattendues ignorées", () => {
    const row = {
      id: "r1",
      nom: "Élec Exemple",
      created_at: "2026-10-01T08:00:00Z",
      etape: "valide",
    };
    expect(parseReferralRows([row, { ...row, etape: "?" }, null])).toEqual([row]);
    expect(parseReferralRows(null)).toEqual([]);
  });
});

describe("bilan du parrainage (F-60)", () => {
  it("réponse attendue", () => {
    expect(
      parseReferral({
        code: "k7m2qx9a",
        joined: 2,
        rewarded: 1,
        months_earned: 1,
        months_this_year: 1,
      }),
    ).toEqual({ code: "k7m2qx9a", joined: 2, rewarded: 1, months_earned: 1, months_this_year: 1 });
  });

  it("artisan pas encore validé (null) ou réponse inattendue : null", () => {
    const base = { joined: 0, rewarded: 0, months_earned: 0, months_this_year: 0 };
    expect(parseReferral(null)).toBeNull();
    expect(parseReferral({ ...base, code: "TROP-LONG-CODE" })).toBeNull();
    expect(parseReferral({ ...base, code: "k7m2qx9a", joined: -1 })).toBeNull();
    expect(
      parseReferral({ code: "k7m2qx9a", joined: 0, rewarded: 0, months_earned: 0 }),
    ).toBeNull();
  });
});

describe("cadeau de bienvenue du filleul (ADR 0154)", () => {
  const gift = {
    status: "a_choisir",
    item: null,
    size: null,
    address: {
      recipient: "Prénom Nom",
      ligne: "2 avenue",
      code_postal: "06400",
      commune: "Cannes",
    },
    referrer: "PARRAIN EXEMPLE",
    sent_at: null,
  };

  it("réponse de la base", () => {
    expect(parseWelcomeGift(gift)).toEqual(gift);
    expect(parseWelcomeGift({ ...gift, status: "envoye", item: "tshirt", size: "L" })?.size).toBe(
      "L",
    );
  });

  it("aucun cadeau ou réponse inattendue : null", () => {
    expect(parseWelcomeGift(null)).toBeNull();
    expect(parseWelcomeGift({ ...gift, item: "veste" })).toBeNull();
  });

  const choice = {
    item: "tshirt",
    size: "M",
    recipient: " Prénom Nom ",
    ligne: "2 avenue de l'Exemple",
    code_postal: "06400",
    commune: "Cannes",
  };

  it("t-shirt avec sa taille, champs nettoyés", () => {
    expect(welcomeGiftChoiceSchema.parse(choice)).toEqual({ ...choice, recipient: "Prénom Nom" });
  });

  it("casquette : la taille est ignorée", () => {
    expect(welcomeGiftChoiceSchema.parse({ ...choice, item: "casquette" }).size).toBeNull();
  });

  it("refus : t-shirt sans taille, cadeau inconnu, code postal, champs vides", () => {
    const issues = (value: object) =>
      welcomeGiftChoiceSchema.safeParse(value).error?.issues.map((i) => i.message) ?? [];
    expect(issues({ ...choice, size: null })).toEqual(["Choisissez la taille du t-shirt."]);
    expect(issues({ ...choice, item: "veste" })).toEqual(["Choisissez votre cadeau."]);
    expect(issues({ ...choice, code_postal: "6400" })).toEqual([
      "Indiquez un code postal à 5 chiffres.",
    ]);
    expect(issues({ ...choice, recipient: "  ", commune: "" })).toEqual([
      "Indiquez le nom du destinataire.",
      "Indiquez la commune.",
    ]);
  });
});

describe("invitation d'un artisan (ADR 0162)", () => {
  const base = {
    company: "  Élec Exemple ",
    contact_name: "",
    phone: "06 12 34 56 78",
    email: "",
    trade_code: "electricien",
    city: "Nice",
    message: "",
  };

  it("normalise le téléphone, vide les champs facultatifs", () => {
    expect(artisanInvitationSchema.parse(base)).toEqual({
      company: "Élec Exemple",
      contact_name: null,
      phone: "+33612345678",
      email: null,
      trade_code: "electricien",
      city: "Nice",
      message: null,
    });
  });

  it("téléphone ou e-mail obligatoire, formats vérifiés", () => {
    expect(artisanInvitationSchema.safeParse({ ...base, phone: "" }).success).toBe(false);
    expect(
      artisanInvitationSchema.safeParse({ ...base, phone: "", email: "Contact@Elec.Example" }).data
        ?.email,
    ).toBe("contact@elec.example");
    expect(artisanInvitationSchema.safeParse({ ...base, phone: "12" }).success).toBe(false);
    expect(artisanInvitationSchema.safeParse({ ...base, email: "pas-un-email" }).success).toBe(
      false,
    );
    expect(artisanInvitationSchema.safeParse({ ...base, company: "E" }).success).toBe(false);
  });
});
