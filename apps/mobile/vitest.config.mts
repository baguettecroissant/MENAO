import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests des fonctions pures de l'application (aucun composant React Native).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
