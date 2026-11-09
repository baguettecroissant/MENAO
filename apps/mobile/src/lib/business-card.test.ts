import { describe, expect, it } from "vitest";
import { businessCardInfo, cardPhone, companyInitials, siteDomain } from "./business-card";

describe("carte de visite de l'artisan", () => {
  it("initiales de l'entreprise sans forme juridique ni petits mots", () => {
    expect(companyInitials("Plomberie du Sud SARL")).toBe("PS");
    expect(companyInitials("L'Atelier du Bois")).toBe("AB");
    expect(companyInitials("SAS Martin & Fils")).toBe("MF");
    expect(companyInitials("Établissements Rossi")).toBe("R");
    expect(companyInitials("électricité côte d'azur")).toBe("ÉA");
    expect(companyInitials("Dupont")).toBe("D");
    // Rien ne reste : initiales du nom complet.
    expect(companyInitials("SARL")).toBe("S");
  });

  it("domaine du site sans protocole ni chemin", () => {
    expect(siteDomain("https://menao.fr")).toBe("menao.fr");
    expect(siteDomain("https://www.menao.fr/artisans/x?y=1")).toBe("menao.fr");
    expect(siteDomain("http://localhost:3000")).toBe("localhost");
  });

  it("téléphone français lisible, autres numéros tels quels", () => {
    expect(cardPhone("+33612345678")).toBe("06 12 34 56 78");
    expect(cardPhone("+41 21 123 45 67")).toBe("+41 21 123 45 67");
    expect(cardPhone("  ")).toBeNull();
    expect(cardPhone(null)).toBeNull();
    expect(cardPhone(undefined)).toBeNull();
  });

  it("lignes de la carte : une donnée absente n'a pas de ligne", () => {
    expect(
      businessCardInfo({
        name: "Alex Martin",
        initials: "AM",
        company: "Martin Rénovation",
        trade: "Plombier",
        phone: "+33612345678",
      }),
    ).toEqual({
      title: "Martin Rénovation",
      person: "Alex Martin",
      trade: "Plombier",
      phone: "06 12 34 56 78",
      initials: "MR",
    });
    expect(
      businessCardInfo({ name: "Alex Martin", initials: "AM", company: null, trade: null }),
    ).toEqual({ title: "Alex Martin", person: null, trade: null, phone: null, initials: "AM" });
    // Entreprise au nom de la personne : pas de doublon.
    expect(
      businessCardInfo({ name: "Alex Martin", initials: "AM", company: "alex martin", trade: "" })
        .person,
    ).toBeNull();
  });
});
