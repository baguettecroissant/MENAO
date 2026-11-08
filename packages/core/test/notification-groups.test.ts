import { describe, expect, it } from "vitest";
import { notificationGroups } from "../src/notification-groups";

describe("notificationGroups (ADR 0258)", () => {
  const now = new Date("2026-11-08T21:30:00Z"); // 22 h 30 à Paris

  it("range au jour de Paris, ordre conservé", () => {
    const items = [
      { id: "a", createdAt: "2026-11-08T20:00:00Z" },
      { id: "b", createdAt: "2026-11-07T23:30:00Z" }, // 8 nov., 0 h 30 à Paris
      { id: "c", createdAt: "2026-11-07T22:30:00Z" }, // 7 nov., 23 h 30 à Paris
    ];
    const groups = notificationGroups(items, now);
    expect(groups.today.map((i) => i.id)).toEqual(["a", "b"]);
    expect(groups.earlier.map((i) => i.id)).toEqual(["c"]);
  });

  it("liste vide", () => {
    expect(notificationGroups([], now)).toEqual({ today: [], earlier: [] });
  });
});
