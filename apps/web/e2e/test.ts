import { test as base, expect } from "@playwright/test";

export { expect };
export type { APIRequestContext, Locator, Page } from "@playwright/test";

/**
 * `test` de Playwright, avec un garde-fou : toute violation de la politique de sécurité du contenu
 * (CSP, ADR 0103) signalée dans la console de la page fait échouer le test.
 */
export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
          violations.push(message.text());
        }
      });
      await use();
      expect(violations, "violations de la CSP").toEqual([]);
    },
    { auto: true },
  ],
});
