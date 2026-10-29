import { describe, expect, it } from "vitest";
import { agendaItemsFrom, type AgendaItem } from "../src/agenda";
import { agendaItemVersion, phoneBusySlots, phoneSyncPlan } from "../src/phone-calendar";

const from = new Date("2026-11-02T00:00:00Z");
const to = new Date("2026-11-09T00:00:00Z");

describe("plages occupées du calendrier du téléphone (ADR 0203)", () => {
  it("événements à horaire seulement, ni libres ni écrits par MENAO", () => {
    expect(
      phoneBusySlots(
        [
          { id: "a", startDate: "2026-11-03T08:00:00Z", endDate: "2026-11-03T09:00:00Z" },
          {
            id: "b",
            startDate: "2026-11-03T00:00:00Z",
            endDate: "2026-11-04T00:00:00Z",
            allDay: true,
          },
          {
            id: "c",
            startDate: "2026-11-03T10:00:00Z",
            endDate: "2026-11-03T11:00:00Z",
            availability: "free",
          },
          { id: "menao", startDate: "2026-11-03T14:00:00Z", endDate: "2026-11-03T15:00:00Z" },
        ],
        { exclude: new Set(["menao"]), from, to },
      ),
    ).toEqual([{ startsAt: "2026-11-03T08:00:00.000Z", endsAt: "2026-11-03T09:00:00.000Z" }]);
  });

  it("chevauchements fusionnés, bords de période coupés, plages vides écartées", () => {
    expect(
      phoneBusySlots(
        [
          { id: "1", startDate: "2026-11-04T10:00:00Z", endDate: "2026-11-04T11:00:00Z" },
          { id: "2", startDate: "2026-11-04T10:30:00Z", endDate: "2026-11-04T12:00:00Z" },
          { id: "3", startDate: "2026-11-01T22:00:00Z", endDate: "2026-11-02T01:00:00Z" },
          { id: "4", startDate: "2026-11-10T08:00:00Z", endDate: "2026-11-10T09:00:00Z" },
        ],
        { exclude: new Set(), from, to },
      ),
    ).toEqual([
      { startsAt: "2026-11-02T00:00:00.000Z", endsAt: "2026-11-02T01:00:00.000Z" },
      { startsAt: "2026-11-04T10:00:00.000Z", endsAt: "2026-11-04T12:00:00.000Z" },
    ]);
  });

  it("dans l'agenda : « occupé », sans titre ni lieu", () => {
    const items = agendaItemsFrom({
      chantiers: [],
      blocked: [],
      external: [{ id: "x", startsAt: "2026-11-03T08:00:00Z", endsAt: "2026-11-03T09:30:00Z" }],
      from,
      to,
    });
    expect(items).toEqual([
      {
        id: "occupe-x",
        kind: "occupe",
        start: "2026-11-03T08:00:00Z",
        durationMinutes: 90,
        title: null,
        place: null,
        chantierId: null,
      },
    ]);
  });
});

describe("rendez-vous MENAO écrits dans le calendrier du téléphone", () => {
  const visite: AgendaItem = {
    id: "visite-c1",
    kind: "visite",
    start: "2026-11-03T09:00:00Z",
    durationMinutes: 60,
    title: "Cuve de récupération",
    place: "06140 Vence",
    chantierId: "c1",
  };
  const occupe: AgendaItem = { ...visite, id: "occupe-x", kind: "occupe", chantierId: null };

  it("crée les nouveaux, réécrit les modifiés, retire les disparus ; jamais les plages occupées", () => {
    const moved = { ...visite, id: "demarrage-c2", start: "2026-11-05T07:00:00Z" };
    const plan = phoneSyncPlan([visite, moved, occupe], {
      "visite-c1": { eventId: "e1", version: "ancienne" },
      "demarrage-c9": { eventId: "e9", version: "x" },
    });
    expect(plan.create.map((i) => i.id)).toEqual(["demarrage-c2"]);
    expect(plan.update).toEqual([{ item: visite, eventId: "e1" }]);
    expect(plan.remove).toEqual([{ key: "demarrage-c9", eventId: "e9" }]);
  });

  it("rien à faire quand le calendrier est à jour", () => {
    const plan = phoneSyncPlan([visite], {
      "visite-c1": { eventId: "e1", version: agendaItemVersion(visite) },
    });
    expect(plan).toEqual({ create: [], update: [], remove: [] });
  });
});
