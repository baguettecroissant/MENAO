import { describe, expect, it } from "vitest";
import { standOutView } from "./stand-out-view";

const base = {
  avatarPath: null,
  photoPaths: [],
  diploma: null,
  experienceYears: null,
  dateCreation: null,
  workTypeCount: 0,
  certificationTypes: [],
  rge: false,
  budgetMinimum: null,
  name: "Paysages des Oliviers",
  tradeLabels: ["Paysagiste"],
  city: "Grasse",
  presentation: "  ",
};
const urlOf = (bucket: string, path: string) => `https://exemple.test/${bucket}/${path}`;

describe("standOutView (lot 81)", () => {
  it("fiche vide : 23 points à gagner, aperçu en pointillés", () => {
    const view = standOutView(base, urlOf, "2026-11-25");
    expect(view.summary.remaining).toBe(23);
    expect(view.preview).toMatchObject({
      subtitle: "Paysagiste · Grasse",
      imageUrl: null,
      diplomaLabel: null,
      certificationLabel: null,
      photoUrls: [],
      presentation: null,
    });
    expect(view.budgetLabel).toBeNull();
  });

  it("fiche remplie : libellés, trois photos au plus, budget minimum", () => {
    const view = standOutView(
      {
        ...base,
        avatarPath: "a/logo.png",
        photoPaths: ["p1.jpg", "p2.jpg", "p3.jpg", "p4.jpg"],
        diploma: "cap",
        workTypeCount: 2,
        certificationTypes: ["qualibat"],
        budgetMinimum: "5000_15000",
        presentation: "Jardins du pays grassois",
      },
      urlOf,
      "2026-11-25",
    );
    expect(view.preview.imageUrl).toBe("https://exemple.test/avatars/a/logo.png");
    expect(view.preview.photoUrls).toHaveLength(3);
    expect(view.preview.diplomaLabel).toBe("CAP");
    expect(view.preview.certificationLabel).toBe("Qualibat");
    expect(view.budgetLabel).toBe("À partir de 5 000 €");
    expect(view.summary.doneCount).toBe(3);
  });

  it("RGE détecté sans certification ajoutée : affiché comme RGE", () => {
    const view = standOutView({ ...base, rge: true }, urlOf, "2026-11-25");
    expect(view.preview.certificationLabel).toBe("RGE");
  });
});
