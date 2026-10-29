import { describe, expect, it } from "vitest";
import {
  ROLES,
  appSpaceForRole,
  homePathForRole,
  isAdmin,
  isRole,
  isStaff,
  roleFromAppMetadata,
} from "../src/roles";

describe("rôles", () => {
  it("liste les six rôles de la spécification (§3), plus les commerciaux (ADR 0205)", () => {
    expect(ROLES).toEqual([
      "particulier",
      "artisan",
      "artisan_en_attente",
      "admin",
      "support",
      "commercial",
      "visiteur",
    ]);
  });

  it("reconnaît un rôle valide et rejette le reste", () => {
    expect(isRole("artisan")).toBe(true);
    expect(isRole("superadmin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(42)).toBe(false);
  });

  it("isStaff couvre admin et support uniquement", () => {
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("support")).toBe(true);
    expect(isStaff("artisan")).toBe(false);
    expect(isStaff("particulier")).toBe(false);
  });

  it("isAdmin ne couvre que admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("support")).toBe(false);
  });
});

describe("roleFromAppMetadata", () => {
  it("lit le rôle dans app_metadata", () => {
    expect(roleFromAppMetadata({ role: "artisan_en_attente" })).toBe("artisan_en_attente");
  });

  it("retombe sur visiteur si le rôle est absent ou inconnu", () => {
    expect(roleFromAppMetadata(undefined)).toBe("visiteur");
    expect(roleFromAppMetadata({})).toBe("visiteur");
    expect(roleFromAppMetadata({ role: "root" })).toBe("visiteur");
  });
});

describe("homePathForRole", () => {
  it("envoie les artisans vers leur onboarding, les autres vers leur espace", () => {
    expect(homePathForRole("artisan_en_attente")).toBe("/pro/onboarding");
    expect(homePathForRole("artisan")).toBe("/pro/tableau-de-bord");
    expect(homePathForRole("particulier")).toBe("/mon-espace");
    expect(homePathForRole("admin")).toBe("/admin");
    expect(homePathForRole("support")).toBe("/admin/tickets");
    expect(homePathForRole("commercial")).toBe("/commercial");
    expect(homePathForRole("visiteur")).toBe("/connexion");
  });
});

describe("appSpaceForRole (application native)", () => {
  it("visiteurs et particuliers partagent l'espace client ; l'équipe utilise le back-office web", () => {
    expect(appSpaceForRole("visiteur")).toBe("client");
    expect(appSpaceForRole("particulier")).toBe("client");
    expect(appSpaceForRole("artisan")).toBe("artisan");
    expect(appSpaceForRole("artisan_en_attente")).toBe("artisan");
    expect(appSpaceForRole("admin")).toBe("equipe");
    expect(appSpaceForRole("support")).toBe("equipe");
    // Commercial (ADR 0205) : son espace est sur le site.
    expect(appSpaceForRole("commercial")).toBe("equipe");
  });
});
