import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyDocusealSignature } from "../src/signature";

const secret = "whsec_test_menao";
const body = JSON.stringify({ event_type: "form.completed", data: { id: 7 } });
const sign = (timestamp: number, payload = body, key = secret) =>
  `${timestamp}.${createHmac("sha256", key).update(`${timestamp}.${payload}`).digest("hex")}`;

describe("webhook du prestataire de signature (F-13)", () => {
  it("signature HMAC valide et récente acceptée", async () => {
    const now = 1_791_000_000;
    expect(await verifyDocusealSignature(body, sign(now - 10), secret, now)).toBe(true);
  });

  it("refusée si le corps, le secret ou l'horodatage ne correspondent pas", async () => {
    const now = 1_791_000_000;
    expect(await verifyDocusealSignature(`${body} `, sign(now), secret, now)).toBe(false);
    expect(await verifyDocusealSignature(body, sign(now, body, "whsec_autre"), secret, now)).toBe(
      false,
    );
    expect(await verifyDocusealSignature(body, sign(now - 301), secret, now)).toBe(false);
    expect(await verifyDocusealSignature(body, sign(now + 301), secret, now)).toBe(false);
  });

  it("en-tête absent ou mal formé, secret manquant : refusée", async () => {
    const now = 1_791_000_000;
    for (const header of [null, "", "abc", `${now}.`, `${now}.zz`, `.${"a".repeat(64)}`]) {
      expect(await verifyDocusealSignature(body, header, secret, now)).toBe(false);
    }
    expect(await verifyDocusealSignature(body, sign(now), "", now)).toBe(false);
  });
});
