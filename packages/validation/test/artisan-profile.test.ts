import { describe, expect, it } from "vitest";
import { parseArtisanProfile } from "../src/artisan-profile";

const profile = {
  id: "8b1f6c1e-6f1c-4c1e-9b1e-1c1e6f1c4c1e",
  display_name: "Artisan Exemple",
  company_name: "Exemple Plomberie",
  avatar_path: null,
  experience_years: 12,
  presentation: "Plombier depuis douze ans.",
  paused: false,
  available_from: null,
  response_minutes: 95,
  zone: { mode: "rayon", radius_km: 20, city: "Nice", communes: [] },
  trades: [{ code: "plombier", label: "Plombier" }],
  work_types: [{ code: "fuite", label: "Recherche de fuite", trade: "plombier" }],
  decennale: { valid_until: "2027-06-30", insurer: "Assureur Exemple" },
  certifications: [],
  photos: [],
  score: null,
};

describe("parseArtisanProfile", () => {
  it("lit la fiche publique d'un artisan", () => {
    expect(parseArtisanProfile(profile)?.display_name).toBe("Artisan Exemple");
  });

  it("garde la fiche si le temps de réponse ou le score sont mal formés", () => {
    const parsed = parseArtisanProfile({ ...profile, response_minutes: "?", score: { x: 1 } });
    expect(parsed?.response_minutes).toBeNull();
    expect(parsed?.score).toBeNull();
  });

  it("refuse une fiche incomplète", () => {
    expect(parseArtisanProfile({ id: "x" })).toBeNull();
    expect(parseArtisanProfile(null)).toBeNull();
  });
});
