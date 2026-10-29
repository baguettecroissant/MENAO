import { describe, expect, it } from "vitest";
import {
  type ConnectPrefillSource,
  connectBusinessType,
  connectPrefill,
  connectTokenId,
  connectTokenRequest,
  isConnectToken,
  isStripePublishableKey,
  productDescription,
  statementDescriptor,
} from "../src/connect-prefill";

// Données fictives.
const sarl: ConnectPrefillSource = {
  formeJuridiqueCode: "5499",
  raisonSociale: "EXEMPLE TERRASSEMENT",
  nomCommercial: null,
  siren: "000001100",
  tvaIntracom: "FR12000001100",
  adresseLigne: "1 RUE DE L'EXEMPLE",
  adresseCodePostal: "06000",
  adresseCommune: "NICE",
  isDirigeant: true,
  firstName: "Jean",
  lastName: "Exemple",
  phone: "+33600000000",
  email: "jean@example.test",
  trades: ["Terrassier", "Maçon"],
};

describe("type d'entreprise pour Stripe (ADR 0204)", () => {
  it("entrepreneur individuel, société, ou rien si la catégorie est inconnue", () => {
    expect(connectBusinessType("1000")).toBe("individual");
    expect(connectBusinessType("5499")).toBe("company");
    expect(connectBusinessType("5720")).toBe("company");
    expect(connectBusinessType("6540")).toBe("company");
    expect(connectBusinessType("9220")).toBeNull();
    expect(connectBusinessType("2110")).toBeNull();
    expect(connectBusinessType(null)).toBeNull();
  });
});

describe("libellé sur les relevés bancaires", () => {
  it("majuscules sans accents, 22 caractères au plus", () => {
    expect(statementDescriptor("Électricité Côte d'Azur")).toBe("ELECTRICITE COTE D AZU");
    expect(statementDescriptor("Œuvre & Bâti")).toBe("OEUVRE BATI");
  });

  it("refuse un libellé trop court ou sans lettre", () => {
    expect(statementDescriptor("A&B")).toBeNull();
    expect(statementDescriptor("1234567")).toBeNull();
    expect(statementDescriptor(null)).toBeNull();
  });
});

describe("description de l'activité", () => {
  it("cite les métiers, sans doublon", () => {
    expect(productDescription(["Plombier", "Plombier", " Chauffagiste "])).toBe(
      "Plombier, Chauffagiste : travaux du bâtiment pour particuliers. Devis signés en ligne, acompte et solde réglés en ligne.",
    );
  });

  it("reste valable sans métier (au moins 10 caractères)", () => {
    expect(productDescription([]).startsWith("Travaux du bâtiment pour particuliers.")).toBe(true);
  });
});

describe("pré-remplissage du compte Stripe", () => {
  it("société : identité de l'entreprise, dirigeant représentant, profil public", () => {
    const prefill = connectPrefill(sarl);
    expect(prefill.name).toBe("EXEMPLE TERRASSEMENT");
    expect(prefill.account).toEqual({
      business_type: "company",
      company: {
        name: "EXEMPLE TERRASSEMENT",
        tax_id: "000001100",
        vat_id: "FR12000001100",
        phone: "+33600000000",
        address: { line1: "1 RUE DE L'EXEMPLE", postal_code: "06000", city: "NICE", country: "FR" },
      },
    });
    expect(prefill.person).toEqual({
      first_name: "Jean",
      last_name: "Exemple",
      email: "jean@example.test",
      phone: "+33600000000",
      relationship: { representative: true },
    });
    expect(prefill.profile).toEqual({
      business_profile: {
        product_description:
          "Terrassier, Maçon : travaux du bâtiment pour particuliers. Devis signés en ligne, acompte et solde réglés en ligne.",
        support_phone: "+33600000000",
        support_email: "jean@example.test",
      },
      settings: { payments: { statement_descriptor: "EXEMPLE TERRASSEMENT" } },
    });
  });

  it("le nom commercial est le nom affiché aux clients", () => {
    const prefill = connectPrefill({ ...sarl, nomCommercial: "Exemple TP" });
    expect(prefill.name).toBe("Exemple TP");
    expect(prefill.profile.settings?.payments.statement_descriptor).toBe("EXEMPLE TP");
    // La raison sociale reste le nom légal de la société.
    expect(prefill.account).toMatchObject({ company: { name: "EXEMPLE TERRASSEMENT" } });
  });

  it("sans être le dirigeant : aucune donnée de personne", () => {
    const prefill = connectPrefill({ ...sarl, isDirigeant: false });
    expect(prefill.person).toBeNull();
    expect(prefill.account?.business_type).toBe("company");
  });

  it("entrepreneur individuel : nom et contact de l'entrepreneur, sans adresse ni SIREN", () => {
    const prefill = connectPrefill({
      ...sarl,
      formeJuridiqueCode: "1000",
      raisonSociale: "JEAN EXEMPLE",
    });
    expect(prefill.account).toEqual({
      business_type: "individual",
      individual: {
        first_name: "Jean",
        last_name: "Exemple",
        email: "jean@example.test",
        phone: "+33600000000",
      },
    });
    expect(prefill.person).toBeNull();
  });

  it("entrepreneur individuel qui n'est pas le dirigeant : pas de jeton d'identité", () => {
    const prefill = connectPrefill({ ...sarl, formeJuridiqueCode: "1000", isDirigeant: null });
    expect(prefill.account).toBeNull();
    expect(prefill.person).toBeNull();
  });

  it("écarte les valeurs douteuses au lieu de faire échouer Stripe", () => {
    const prefill = connectPrefill({
      ...sarl,
      siren: "12345",
      tvaIntracom: "FR12999999999",
      adresseCodePostal: "97400",
      phone: "06 00 00 00 00",
      email: "pas-un-email",
    });
    expect(prefill.account).toEqual({
      business_type: "company",
      company: { name: "EXEMPLE TERRASSEMENT" },
    });
    expect(prefill.person).toEqual({
      first_name: "Jean",
      last_name: "Exemple",
      relationship: { representative: true },
    });
    expect(prefill.profile.business_profile).not.toHaveProperty("support_phone");
    expect(prefill.profile.business_profile).not.toHaveProperty("support_email");
  });

  it("TVA d'un autre SIREN : non transmise", () => {
    expect(connectPrefill({ ...sarl, tvaIntracom: "FR12000002200" }).account).not.toHaveProperty(
      "company.vat_id",
    );
  });

  it("dossier presque vide : seulement le profil public", () => {
    const prefill = connectPrefill({
      formeJuridiqueCode: null,
      raisonSociale: "EXEMPLE",
      nomCommercial: null,
      siren: null,
      tvaIntracom: null,
      adresseLigne: null,
      adresseCodePostal: null,
      adresseCommune: null,
      isDirigeant: null,
      firstName: null,
      lastName: null,
      phone: null,
      email: null,
      trades: [],
    });
    expect(prefill.account).toBeNull();
    expect(prefill.person).toBeNull();
    expect(prefill.profile.settings?.payments.statement_descriptor).toBe("EXEMPLE");
    expect(Object.keys(prefill.profile.business_profile)).toEqual(["product_description"]);
  });

  it("société sans aucune donnée d'identité : pas de jeton vide", () => {
    const prefill = connectPrefill({
      ...sarl,
      raisonSociale: null,
      siren: null,
      tvaIntracom: null,
      adresseLigne: null,
      phone: null,
    });
    expect(prefill.account).toBeNull();
  });
});

describe("jetons Stripe", () => {
  it("encode la requête comme l'API Stripe", () => {
    const request = connectTokenRequest("pk_test_exemple0000", "account", {
      business_type: "company",
      company: {
        name: "A & B",
        address: { line1: "1 rue", postal_code: "06000", city: "Nice", country: "FR" },
      },
    });
    expect(request.url).toBe("https://api.stripe.com/v1/tokens");
    expect(request.init.headers.Authorization).toBe("Bearer pk_test_exemple0000");
    expect(request.init.body.split("&").map(decodeURIComponent)).toEqual([
      "account[business_type]=company",
      "account[company][name]=A & B",
      "account[company][address][line1]=1 rue",
      "account[company][address][postal_code]=06000",
      "account[company][address][city]=Nice",
      "account[company][address][country]=FR",
    ]);
    expect(request.init.body).toContain("A%20%26%20B");
  });

  it("encode le dirigeant et sa qualité de représentant", () => {
    const request = connectTokenRequest("pk_test_exemple0000", "person", {
      first_name: "Jean",
      last_name: "Exemple",
      relationship: { representative: true },
    });
    expect(decodeURIComponent(request.init.body)).toBe(
      "person[first_name]=Jean&person[last_name]=Exemple&person[relationship][representative]=true",
    );
  });

  it("reconnaît les identifiants de jeton et les clés publiques", () => {
    expect(isConnectToken("account", "ct_1AbCdEfGhIjKl")).toBe(true);
    expect(isConnectToken("account", "cpt_1AbCdEfGhIjKl")).toBe(false);
    expect(isConnectToken("person", "cpt_1AbCdEfGhIjKl")).toBe(true);
    expect(isConnectToken("person", "ct_1AbCdEfGhIjKl")).toBe(false);
    expect(isConnectToken("account", "ct_1; drop")).toBe(false);
    expect(connectTokenId("account", { id: "ct_1AbCdEfGhIjKl" })).toBe("ct_1AbCdEfGhIjKl");
    expect(connectTokenId("account", { error: { message: "x" } })).toBeNull();
    expect(isStripePublishableKey("pk_test_1AbCdEfGhIjKl")).toBe(true);
    expect(isStripePublishableKey("sk_test_1AbCdEfGhIjKl")).toBe(false);
  });
});
