import { describe, expect, it } from "vitest";
import { isDeliverableAddress } from "../src/address.ts";

describe("adresses distribuables (notify)", () => {
  it("domaines réservés : jamais d'envoi", () => {
    for (const email of [
      "artisan@menao-demo.test",
      "client@example.test",
      "julien@exemple.invalid",
      "x@machine.localhost",
      "x@domaine.example",
      "contact@example.com",
      "a@mail.example.org",
      "CLIENT@EXAMPLE.TEST",
      "client@example.test.",
    ]) {
      expect(isDeliverableAddress(email), email).toBe(false);
    }
  });

  it("adresses ordinaires : envoi", () => {
    for (const email of [
      "contact@menao.fr",
      "camille@gmail.com",
      "a@mon-example.com",
      "a@test.fr",
    ]) {
      expect(isDeliverableAddress(email), email).toBe(true);
    }
  });

  it("adresses mal formées : pas d'envoi", () => {
    for (const email of ["", "sans-arobase", "@menao.fr", "client@"]) {
      expect(isDeliverableAddress(email), email).toBe(false);
    }
  });
});
