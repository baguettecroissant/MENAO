import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// Garde-fou (ADR 0131) : chaque page de l'espace pro passe par le filtre de session (proxy.ts),
// dans la liste des espaces protégés et dans le `matcher`. Une page oubliée échappe à la redirection
// vers la connexion (en pré-lancement, elle afficherait la page d'attente) et sa session n'est pas
// rafraîchie. Lecture des fichiers seulement, sans navigateur.
const app = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

test("chaque page de l'espace pro passe par le filtre de session", () => {
  // Groupes de routes « (argent) », « (vitrine) » (ADR 0188) : sans effet sur les adresses.
  const pages = (dir: string): string[] =>
    readdirSync(app(dir), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) =>
        entry.name.startsWith("(") ? pages(`${dir}/${entry.name}`) : [entry.name],
      );
  const routes = pages("app/pro/(espace)").map((name) => `/pro/${name}`);
  expect(routes).toContain("/pro/mon-profil");
  expect(routes).toContain("/pro/depenses");

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
