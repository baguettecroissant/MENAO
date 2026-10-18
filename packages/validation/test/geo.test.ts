import { describe, expect, it } from "vitest";
import {
  addressSearchParams,
  communeSearchParams,
  geoplateformeSearchUrl,
  parseGeoFeatures,
  planIgnTileUrl,
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

  it("construit l'adresse d'une tuile du Plan IGN (ADR 0126)", () => {
    expect(planIgnTileUrl({ z: 8, x: 128, y: 93 })).toBe(
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM" +
        "&FORMAT=image%2Fpng&TILEMATRIX=8&TILEROW=93&TILECOL=128",
    );
  });
});
