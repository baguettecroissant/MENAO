import { describe, expect, it } from "vitest";
import {
  addressSearchParams,
  communeSearchParams,
  geoplateformeSearchUrl,
  parseGeoFeatures,
  toAddressSuggestions,
  toCommuneSuggestions,
} from "../src/geo";

const response = {
  type: "FeatureCollection",
  features: [
    {
      geometry: { type: "Point", coordinates: [7.2619, 43.7031] },
      properties: {
        label: "1 Rue de France 06000 Nice",
        citycode: "06088",
        city: "Nice",
        postcode: "06000",
      },
    },
  ],
};

describe("géocodage Géoplateforme", () => {
  it("construit l'adresse de recherche avec autocomplétion", () => {
    expect(geoplateformeSearchUrl(communeSearchParams("Nic"))).toBe(
      "https://data.geopf.fr/geocodage/search?autocomplete=1&limit=6&q=Nic&type=municipality",
    );
    expect(addressSearchParams("1 rue de France", "06088")).toEqual({
      q: "1 rue de France",
      citycode: "06088",
    });
    expect(addressSearchParams("1 rue de France")).toEqual({ q: "1 rue de France" });
  });

  it("lit les adresses et les communes", () => {
    const features = parseGeoFeatures(response);
    expect(toAddressSuggestions(features)).toEqual([
      { label: "1 Rue de France 06000 Nice", citycode: "06088", lon: 7.2619, lat: 43.7031 },
    ]);
    expect(toCommuneSuggestions(features)).toEqual([
      { code: "06088", nom: "Nice", postcode: "06000", lon: 7.2619, lat: 43.7031 },
    ]);
  });

  it("ignore une réponse inattendue", () => {
    expect(parseGeoFeatures({ erreur: true })).toEqual([]);
    expect(parseGeoFeatures(null)).toEqual([]);
  });
});
