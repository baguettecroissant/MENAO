import { describe, expect, it } from "vitest";
import { PRESENTATION_MIN_LENGTH } from "../src/onboarding";
import {
  communeName,
  presentationDraft,
  tradeList,
  type PresentationDraftInput,
} from "../src/presentation-draft";

// Données fictives.
const sarl: PresentationDraftInput = {
  companyName: "MENUISERIE EXEMPLE",
  legalFormCode: "5499",
  trades: ["Menuisier", "Plaquiste"],
  city: "NICE",
  zoneMode: "rayon",
  radiusKm: 30,
  territories: [],
  sinceYear: 2019,
  experienceYears: 12,
  rge: true,
};

describe("présentation proposée (« Proposer un texte »)", () => {
  it("noms de communes et listes de métiers en français", () => {
    expect(communeName("SAINT-LAURENT-DU-VAR")).toBe("Saint-Laurent-du-Var");
    expect(communeName("LA COLLE-SUR-LOUP")).toBe("La Colle-sur-Loup");
    expect(communeName("L'ESCARENE")).toBe("L'Escarene");
    expect(tradeList(["Menuisier"])).toBe("Menuisier");
    expect(tradeList(["Menuisier", "Plaquiste", "Électricien"])).toBe(
      "Menuisier, plaquiste et électricien",
    );
    expect(tradeList([])).toBe("");
  });

  it("société : nom, métiers, rayon, ancienneté, expérience et RGE", () => {
    expect(presentationDraft(sarl, 2026)).toBe(
      "MENUISERIE EXEMPLE, menuisier et plaquiste, intervient dans un rayon de 30 km autour de Nice depuis 2019. 12 ans d'expérience dans le métier. Entreprise qualifiée RGE. Nous vous proposons un devis détaillé et restons disponibles pour répondre à toutes vos questions sur votre projet.",
    );
  });

  it("entrepreneur individuel : à la première personne", () => {
    expect(
      presentationDraft(
        {
          ...sarl,
          legalFormCode: "1000",
          companyName: "DOMINIQUE EXEMPLE",
          trades: ["Plombier"],
          experienceYears: 1,
          rge: false,
        },
        2026,
      ),
    ).toBe(
      "Plombier à Nice, j'interviens dans un rayon de 30 km autour de Nice depuis 2019. 1 an d'expérience dans le métier. Je vous propose un devis détaillé et je reste disponible pour répondre à toutes vos questions sur votre projet.",
    );
  });

  it("zones par communes, départements, régions ou France entière", () => {
    const base = { ...sarl, experienceYears: null, rge: false, sinceYear: null };
    expect(presentationDraft({ ...base, zoneMode: "communes" }, 2026)).toMatch(
      /^MENUISERIE EXEMPLE, menuisier et plaquiste, intervient à Nice et dans les communes alentour\./,
    );
    expect(
      presentationDraft({ ...base, zoneMode: "departements", territories: ["06"] }, 2026),
    ).toMatch(/plaquiste à Nice, intervient dans tout le 06\./);
    expect(
      presentationDraft(
        { ...base, zoneMode: "departements", territories: ["06", "83", "04"] },
        2026,
      ),
    ).toMatch(/intervient dans le 06, le 83 et le 04\./);
    expect(presentationDraft({ ...base, zoneMode: "regions", territories: ["53"] }, 2026)).toMatch(
      /intervient dans la région Bretagne\./,
    );
    expect(presentationDraft({ ...base, zoneMode: "france" }, 2026)).toMatch(
      /intervient partout en France\./,
    );
  });

  it("dossier presque vide : texte valable quand même, d'au moins 100 caractères", () => {
    const empty: PresentationDraftInput = {
      companyName: null,
      legalFormCode: null,
      trades: [],
      city: null,
      zoneMode: null,
      radiusKm: null,
      territories: [],
      sinceYear: 2031,
      experienceYears: 0,
      rge: false,
    };
    const text = presentationDraft(empty, 2026);
    expect(text).toBe(
      "Nous intervenons. Nous vous proposons un devis détaillé et restons disponibles pour répondre à toutes vos questions sur votre projet.",
    );
    expect(text.length).toBeGreaterThanOrEqual(PRESENTATION_MIN_LENGTH);
    expect(
      presentationDraft({ ...empty, legalFormCode: "1000" }, 2026).length,
    ).toBeGreaterThanOrEqual(PRESENTATION_MIN_LENGTH);
  });
});
