import { describe, expect, it } from "vitest";
import {
  type ConnectPrefillSource,
  birthDateOf,
  businessUrlOf,
  completeConnectPrefill,
  connectBusinessType,
  connectPrefill,
  connectTokenId,
  connectTokenRequest,
  homeAddressOf,
  isConnectToken,
  isStripePublishableKey,
  normalizeIban,
  productDescription,
  representativeTitle,
  statementDescriptor,
  withBusinessUrl,
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
      relationship: { representative: true, title: "Gérant" },
    });
    expect(prefill.businessAddress).toEqual({
      line1: "1 RUE DE L'EXEMPLE",
      postal_code: "06000",
      city: "NICE",
      country: "FR",
    });
    expect(prefill.holderName).toBe("EXEMPLE TERRASSEMENT");
    // SARL : plusieurs associés possibles, la case n'est pas cochée d'office.
    expect(prefill.soleOwnerDefault).toBe(false);
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
    expect(prefill.soleOwnerDefault).toBeNull();
    expect(prefill.holderName).toBe("EXEMPLE TERRASSEMENT");
  });

  it("SASU et EURL : président ou gérant, associé unique coché d'office", () => {
    const sasu = connectPrefill({ ...sarl, formeJuridiqueCode: "5720" });
    expect(sasu.person?.relationship).toEqual({ representative: true, title: "Président" });
    expect(sasu.soleOwnerDefault).toBe(true);
    expect(connectPrefill({ ...sarl, formeJuridiqueCode: "5498" }).soleOwnerDefault).toBe(true);
    expect(connectPrefill({ ...sarl, formeJuridiqueCode: "5710" }).soleOwnerDefault).toBe(false);
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
    expect(prefill.holderName).toBe("Jean Exemple");
    expect(prefill.soleOwnerDefault).toBeNull();
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
      relationship: { representative: true, title: "Gérant" },
    });
    expect(prefill.businessAddress).toBeNull();
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

describe("fonction du dirigeant", () => {
  it("président de SAS, gérant de SARL, rien sinon", () => {
    expect(representativeTitle("5710")).toBe("Président");
    expect(representativeTitle("5720")).toBe("Président");
    expect(representativeTitle("5499")).toBe("Gérant");
    expect(representativeTitle("5498")).toBe("Gérant");
    expect(representativeTitle("5202")).toBeNull();
    expect(representativeTitle(null)).toBeNull();
  });
});

describe("compléments saisis dans MENAO (ADR 0215)", () => {
  it("IBAN : espaces retirés, clé de contrôle vérifiée", () => {
    // IBAN d'exemple publié (fictif).
    expect(normalizeIban("fr76 3000 6000 0112 3456 7890 189")).toBe("FR7630006000011234567890189");
    expect(normalizeIban("FR7630006000011234567890188")).toBeNull();
    expect(normalizeIban("FR76")).toBeNull();
    expect(normalizeIban("")).toBeNull();
    expect(normalizeIban(null)).toBeNull();
  });

  it("date de naissance : de 16 à 100 ans, date réelle, AAAA-MM-JJ ou JJ/MM/AAAA", () => {
    expect(birthDateOf("1985-04-23", "2026-11-02")).toEqual({ day: 23, month: 4, year: 1985 });
    expect(birthDateOf("2010-11-02", "2026-11-02")).toEqual({ day: 2, month: 11, year: 2010 });
    expect(birthDateOf("2010-11-03", "2026-11-02")).toBeNull();
    expect(birthDateOf("1926-11-02", "2026-11-02")).toEqual({ day: 2, month: 11, year: 1926 });
    expect(birthDateOf("1925-11-01", "2026-11-02")).toBeNull();
    expect(birthDateOf("1990-02-30", "2026-11-02")).toBeNull();
    // Saisie au clavier dans l'application.
    expect(birthDateOf("23/04/1985", "2026-11-02")).toEqual({ day: 23, month: 4, year: 1985 });
    expect(birthDateOf("31/02/1985", "2026-11-02")).toBeNull();
    expect(birthDateOf("23-04-1985", "2026-11-02")).toBeNull();
  });

  it("adresse personnelle complète et en métropole seulement", () => {
    expect(
      homeAddressOf({ line1: " 2  rue des Essais ", postalCode: "06100", city: "Nice" }),
    ).toEqual({ line1: "2 rue des Essais", postal_code: "06100", city: "Nice", country: "FR" });
    expect(homeAddressOf({ line1: "2 rue", postalCode: "97400", city: "Saint-Denis" })).toBeNull();
    expect(homeAddressOf({ line1: "", postalCode: "06100", city: "Nice" })).toBeNull();
  });

  const home = {
    line1: "2 rue des Essais",
    postal_code: "06100",
    city: "Nice",
    country: "FR" as const,
  };
  const dob = { day: 23, month: 4, year: 1985 };

  it("SASU : date de naissance, adresse, associé unique et IBAN au nom de la société", () => {
    const tokens = completeConnectPrefill(connectPrefill({ ...sarl, formeJuridiqueCode: "5720" }), {
      birthDate: dob,
      homeAddress: home,
      iban: "FR7630006000011234567890189",
      soleOwner: true,
    });
    expect(tokens.account).toMatchObject({ company: { owners_provided: true } });
    expect(tokens.person).toMatchObject({
      dob,
      address: home,
      relationship: {
        representative: true,
        title: "Président",
        owner: true,
        percent_ownership: 100,
      },
    });
    expect(tokens.bankAccount).toEqual({
      country: "FR",
      currency: "eur",
      account_number: "FR7630006000011234567890189",
      account_holder_name: "EXEMPLE TERRASSEMENT",
      account_holder_type: "company",
    });
  });

  it("plusieurs associés : rien n'est déclaré à leur place", () => {
    const tokens = completeConnectPrefill(connectPrefill(sarl), {
      birthDate: dob,
      soleOwner: false,
    });
    expect(tokens.account).not.toHaveProperty("company.owners_provided");
    expect(tokens.person?.relationship).toEqual({ representative: true, title: "Gérant" });
    expect(tokens.person).not.toHaveProperty("address");
    expect(tokens.bankAccount).toBeNull();
  });

  it("entrepreneur individuel : date et adresse dans son identité, compte à son nom", () => {
    const prefill = connectPrefill({ ...sarl, formeJuridiqueCode: "1000", raisonSociale: "X" });
    const tokens = completeConnectPrefill(prefill, {
      birthDate: dob,
      homeAddress: home,
      iban: "FR76 3000 6000 0112 3456 7890 189",
    });
    expect(tokens.account).toMatchObject({
      individual: { first_name: "Jean", dob, address: home },
    });
    expect(tokens.person).toBeNull();
    expect(tokens.bankAccount).toMatchObject({
      account_holder_name: "Jean Exemple",
      account_holder_type: "individual",
    });
  });

  it("sans être le dirigeant : seulement l'IBAN, aucune donnée de personne", () => {
    const prefill = connectPrefill({ ...sarl, isDirigeant: false });
    const tokens = completeConnectPrefill(prefill, {
      birthDate: dob,
      homeAddress: home,
      iban: "FR7630006000011234567890189",
      soleOwner: true,
    });
    expect(tokens.person).toBeNull();
    expect(tokens.account).not.toHaveProperty("company.owners_provided");
    expect(tokens.bankAccount?.account_number).toBe("FR7630006000011234567890189");
  });
});

describe("site web ou page de réseau social demandé par Stripe", () => {
  it("adresse complétée par https://, page de l'entreprise exigée sur un réseau", () => {
    expect(businessUrlOf("facebook.com/menuiserie-exemple")).toEqual({
      url: "https://facebook.com/menuiserie-exemple",
    });
    expect(businessUrlOf(" https://www.instagram.com/menuiserie.exemple/ ")).toEqual({
      url: "https://www.instagram.com/menuiserie.exemple/",
    });
    expect(businessUrlOf("www.menuiserie-exemple.fr")).toEqual({
      url: "https://www.menuiserie-exemple.fr/",
    });
    expect(businessUrlOf("facebook.com")).toEqual({ error: "generic" });
    expect(businessUrlOf("https://www.instagram.com/")).toEqual({ error: "generic" });
    expect(businessUrlOf("ma page facebook")).toEqual({ error: "invalid" });
    expect(businessUrlOf("menuiserie")).toEqual({ error: "invalid" });
    expect(businessUrlOf("ftp://exemple.fr")).toEqual({ error: "invalid" });
    expect(businessUrlOf("  ")).toBeNull();
    expect(businessUrlOf(null)).toBeNull();
  });

  it("ajoutée au profil public envoyé par le serveur", () => {
    const profile = connectPrefill(sarl).profile;
    expect(withBusinessUrl(profile, "https://facebook.com/x").business_profile.url).toBe(
      "https://facebook.com/x",
    );
    expect(withBusinessUrl(profile, null)).toBe(profile);
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

  it("encode l'IBAN du jeton de compte bancaire", () => {
    const request = connectTokenRequest("pk_test_exemple0000", "bank_account", {
      country: "FR",
      currency: "eur",
      account_number: "FR7630006000011234567890189",
      account_holder_type: "company",
    });
    expect(decodeURIComponent(request.init.body)).toBe(
      "bank_account[country]=FR&bank_account[currency]=eur&bank_account[account_number]=FR7630006000011234567890189&bank_account[account_holder_type]=company",
    );
  });

  it("reconnaît les identifiants de jeton et les clés publiques", () => {
    expect(isConnectToken("bank_account", "btok_1AbCdEfGhIjKl")).toBe(true);
    expect(isConnectToken("bank_account", "ct_1AbCdEfGhIjKl")).toBe(false);
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
