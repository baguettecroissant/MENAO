import { defineConfig } from "vitest/config";

// Tests des fonctions pures de l'application (aucun composant React Native).
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
