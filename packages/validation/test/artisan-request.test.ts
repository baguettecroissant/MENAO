import { describe, expect, it } from "vitest";
import { exampleChantiers, exampleRequests } from "@menao/core";
import { parseArtisanChantierDetail, parseRequestDetail } from "../src/artisan-request";

// Réponse d'artisan_request_detail avant le rendez-vous : sans coordonnées ni adresse exacte.
const detail = {
  id: "b1000000-0000-4000-8000-000000000001",
  status: "envoyee",
  created_at: "2026-10-13T08:00:00Z",
  expires_at: "2026-10-15T08:00:00Z",
  refusal_reason: null,
  callback_mode: "plage",
  callback_from: "09:00",
  callback_to: "12:00",
  message: null,
  description: "Fuite sous l'évier de la cuisine.",
  summary: "Fuite sous évier",
  trade: "Plombier",
  lieu_type: "appartement",
  surface: null,
  rooms: ["Cuisine"],
  work_types: ["Réparation"],
  urgence: true,
  date_mode: "des_que_possible",
  date_souhaitee: null,
  ville_nom: "Nice",
  code_postal: "06000",
  adresse: null,
  lat: null,
  lon: null,
  photos: [],
  client: { first_name: "Camille", last_name: null, phone: null, email: null },
  chantier_id: null,
};

describe("détail d'une demande vu par l'artisan (site et application)", () => {
  it("lit la réponse de la base", () => {
    expect(parseRequestDetail(detail)?.client.first_name).toBe("Camille");
  });

  it("refuse une réponse absente ou inattendue", () => {
    expect(parseRequestDetail(null)).toBeNull();
    expect(parseRequestDetail({ ...detail, status: "inconnu" })).toBeNull();
    expect(parseRequestDetail({ ...detail, photos: undefined })).toBeNull();
  });
});

describe("détail d'un chantier vu par l'artisan (site et application)", () => {
  const chantier = {
    ...detail,
    status: "acceptee",
    chantier_id: "c1000000-0000-4000-8000-000000000001",
    chantier: {
      id: "c1000000-0000-4000-8000-000000000001",
      status: "rdv_planifie",
      title: "Fuite sous évier",
      created_at: "2026-10-13T09:00:00Z",
      start_at: null,
      cancelled_at: null,
    },
    appointment: { starts_at: "2026-10-16T07:30:00Z", status: "planifie", notes: null },
  };

  it("lit le chantier, son rendez-vous et ses notes", () => {
    expect(parseArtisanChantierDetail(chantier)?.appointment?.status).toBe("planifie");
  });

  it("refuse un état de chantier inconnu", () => {
    expect(
      parseArtisanChantierDetail({ ...chantier, chantier: { ...chantier.chantier, status: "x" } }),
    ).toBeNull();
  });
});

// Exemples de l'espace artisan (ADR 0184) : même forme que les réponses de la base.
describe("exemples de l'espace artisan", () => {
  it("chaque demande et chaque chantier d'exemple passe les contrôles du site et de l'application", () => {
    const now = new Date("2026-10-25T09:00:00Z");
    for (const r of exampleRequests(now)) expect(parseRequestDetail(r)).toEqual(r);
    for (const c of exampleChantiers(now)) expect(parseArtisanChantierDetail(c)).toEqual(c);
  });
});
