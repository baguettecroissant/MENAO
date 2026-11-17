import { describe, expect, it } from "vitest";
import { LOGO_IMAGE_PREFIX, isLogoImagePath, logoImageName } from "../src/avatar";

describe("image de la fiche : logo reconnu à son nom de fichier", () => {
  it("nomme le fichier d'un logo avec le préfixe", () => {
    expect(logoImageName("abc.png")).toBe(`${LOGO_IMAGE_PREFIX}abc.png`);
  });

  it("reconnaît un logo dans un chemin de stockage", () => {
    expect(isLogoImagePath("user-1/logo-abc.png")).toBe(true);
    expect(isLogoImagePath("user-1/abc.jpg")).toBe(false);
  });

  it("reconnaît un logo dans une adresse publique, paramètres compris", () => {
    const base = "https://x.supabase.co/storage/v1/object/public/avatars/user-1";
    expect(isLogoImagePath(`${base}/logo-abc.png?v=2`)).toBe(true);
    expect(isLogoImagePath(`${base}/abc.png`)).toBe(false);
  });

  it("ne se fie qu'au nom du fichier, pas aux dossiers", () => {
    expect(isLogoImagePath("logo-user/abc.png")).toBe(false);
  });

  it("accepte l'absence d'image", () => {
    expect(isLogoImagePath(null)).toBe(false);
    expect(isLogoImagePath(undefined)).toBe(false);
    expect(isLogoImagePath("")).toBe(false);
  });
});
