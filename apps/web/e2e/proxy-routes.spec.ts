import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// Garde-fou (ADR 0131) : chaque page de l'espace pro passe par le filtre de session (proxy.ts),
// dans la liste des espaces protégés et dans le `matcher`. Une page oubliée échappe à la redirection
// vers la connexion (en pré-lancement, elle afficherait la page d'attente) et sa session n'est pas
// rafraîchie. Lecture des fichiers seulement, sans navigateur.
const app = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

test("chaque page de l'espace pro passe par le filtre de session", () => {
  const routes = readdirSync(app("app/pro/(espace)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/pro/${entry.name}`);
  expect(routes).toContain("/pro/mon-profil");

  const proxy = readFileSync(app("proxy.ts"), "utf8");
  const [protectedList = "", matcher = ""] = proxy.split("export const config");
  for (const route of routes) {
    expect(protectedList, `${route} : espace protégé`).toContain(`"${route}"`);
    expect(
      matcher.includes(`"${route}"`) || matcher.includes(`"${route}/:path*"`),
      `${route} : matcher`,
    ).toBe(true);
  }
});
