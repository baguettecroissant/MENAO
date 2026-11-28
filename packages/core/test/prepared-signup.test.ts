import { describe, expect, it } from "vitest";
import type { ArtisanSignupCompany } from "../src/artisan-signup";
import {
  preparedDraftFromStored,
  preparedProgress,
  preparedSignupDaysLeft,
  preparedSignupDraft,
  preparedSignupMessage,
  preparedSignupState,
} from "../src/prepared-signup";

const COMPANY: ArtisanSignupCompany = {
  siret: "00000183500012",
  name: "BAINS & CO",
  legalFormCode: "5710",
  apeCode: "43.22A",
  creationYear: "2014",
  address: "18 rue Bonaparte 06300 Nice",
  postcode: "06300",
  city: "Nice",
  citycode: "06088",
  lon: 7.28,
  lat: 43.7,
  managers: [{ firstName: "Karim", lastName: "Exemple", role: "Président" }],
};

describe("état d'une inscription préparée", () => {
  const now = new Date("2027-01-12T10:00:00Z");
  it("envoyée, puis expirée après 7 jours sans ouverture", () => {
    expect(
      preparedSignupState(
        { expiresAt: "2027-01-19T10:00:00Z", openedAt: null, convertedAt: null },
        now,
      ),
    ).toBe("envoye");
    expect(
      preparedSignupState(
        { expiresAt: "2027-01-12T09:00:00Z", openedAt: null, convertedAt: null },
        now,
      ),
    ).toBe("expire");
  });
  it("ouverte, puis inscrit", () => {
    const opened = {
      expiresAt: "2027-01-12T09:00:00Z",
      openedAt: "2027-01-11T10:00:00Z",
      convertedAt: null,
    };
    expect(preparedSignupState(opened, now)).toBe("ouvert");
    expect(preparedSignupState({ ...opened, convertedAt: "2027-01-11T10:05:00Z" }, now)).toBe(
      "inscrit",
    );
  });
  it("jours restants, jamais négatifs", () => {
    expect(preparedSignupDaysLeft("2027-01-19T10:00:00Z", now)).toBe(7);
    expect(preparedSignupDaysLeft("2027-01-11T10:00:00Z", now)).toBe(0);
  });
});

describe("brouillon préparé", () => {
  it("garde entreprise, métiers et rayon, part du siège, laisse dirigeant et TVA à l'artisan", () => {
    const draft = preparedSignupDraft({
      company: COMPANY,
      tradeCodes: ["plombier", "chauffagiste"],
      radiusKm: 30,
    });
    expect(draft.tradeCodes).toEqual(["plombier", "chauffagiste"]);
    expect(draft.company?.siret).toBe("00000183500012");
    expect(draft.base?.citycode).toBe("06088");
    expect(draft.radiusKm).toBe(30);
    expect(draft.isDirigeant).toBeNull();
    expect(draft.assujettiTva).toBeNull();
  });
  it("un rayon non proposé reprend la valeur par défaut", () => {
    expect(
      preparedSignupDraft({ company: COMPANY, tradeCodes: ["plombier"], radiusKm: 33 }).radiusKm,
    ).toBe(20);
  });
  it("relu en base : dirigeant et TVA toujours vidés", () => {
    const stored = {
      ...preparedSignupDraft({ company: COMPANY, tradeCodes: ["plombier"], radiusKm: 20 }),
      isDirigeant: true,
    };
    expect(preparedDraftFromStored(stored).isDirigeant).toBeNull();
  });
});

describe("message et avancement", () => {
  it("message avec le lien et la durée", () => {
    expect(preparedSignupMessage("https://menao.fr/l", "Karim", "Sarah")).toBe(
      "Bonjour Karim, voici le lien pour finir votre inscription sur MENAO, préparée avec Sarah : https://menao.fr/l . Il est valable 7 jours.",
    );
  });
  it("avancement : dossier envoyé avant-dernier, validé complet", () => {
    expect(preparedProgress("valide", [])).toBe(7);
    expect(preparedProgress("en_verification", [])).toBe(6);
    expect(preparedProgress("brouillon", ["charte", "documents", "photo"])).toBe(2);
  });
});
