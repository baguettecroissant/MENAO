import { describe, expect, it } from "vitest";
import {
  DOCUMENT_HELP,
  PREPARE_ITEMS,
  STRIPE_CHECKLIST,
  buildInsurerRequest,
  formatSiret,
  insurerMailto,
} from "../src/onboarding-help";
import { REQUIRED_DOCUMENT_TYPES } from "../src/onboarding";

describe("aide de l'inscription", () => {
  it("donne une aide pour chaque document demandé", () => {
    for (const type of REQUIRED_DOCUMENT_TYPES) {
      const help = DOCUMENT_HELP[type];
      expect(help.title.length).toBeGreaterThan(0);
      expect(help.variants.length).toBeGreaterThan(0);
      for (const variant of help.variants) expect(variant.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("propose le message pour l'assureur seulement pour les assurances", () => {
    const withRequest = REQUIRED_DOCUMENT_TYPES.filter((t) => DOCUMENT_HELP[t].insurerRequest);
    expect(withRequest).toEqual(["decennale", "rc_pro"]);
  });

  it("distingue micro-entrepreneur et société pour l'URSSAF, avec des liens officiels", () => {
    const urssaf = DOCUMENT_HELP.urssaf;
    expect(urssaf.variants.map((v) => v.label)).toEqual([
      "Micro-entrepreneur",
      "Société ou autre statut",
    ]);
    for (const v of urssaf.variants)
      expect(v.link?.url).toMatch(/^https:\/\/www\.[a-z.]*urssaf\.fr$/);
    expect(urssaf.note).toContain("6 mois");
  });

  it("liste six éléments à préparer et quatre pour Stripe, sans doublon", () => {
    expect(PREPARE_ITEMS.map((i) => i.key)).toEqual([
      "siret",
      "decennale",
      "rc_pro",
      "urssaf",
      "identite",
      "rib",
    ]);
    expect(STRIPE_CHECKLIST).toHaveLength(4);
    expect(new Set(STRIPE_CHECKLIST.map((i) => i.title)).size).toBe(4);
  });
});

describe("formatSiret", () => {
  it("groupe 3, 3, 3 puis 5 chiffres", () => {
    expect(formatSiret("12345678900012")).toBe("123 456 789 00012");
    expect(formatSiret(" 123 456 789 00012 ")).toBe("123 456 789 00012");
  });

  it("laisse tel quel ce qui n'est pas un SIRET", () => {
    expect(formatSiret("1234")).toBe("1234");
  });
});

describe("buildInsurerRequest", () => {
  const base = {
    companyName: "Plomberie des Oliviers",
    siret: "12345678900012",
    tradeLabels: ["Plombier", "Chauffagiste"],
    signature: "Lucas Bernard",
  };

  it("demande la décennale au modèle officiel et la RC Pro, avec les métiers", () => {
    const { subject, body } = buildInsurerRequest({ ...base, documents: ["decennale", "rc_pro"] });
    expect(subject).toBe("Attestations décennale et RC Pro — Plomberie des Oliviers");
    expect(body).toContain("Pourriez-vous m’envoyer :");
    expect(body).toContain("arrêté du 5 janvier 2016");
    expect(body).toContain("• mon attestation de responsabilité civile professionnelle");
    expect(body).toContain("mes métiers y figurent : plombier, chauffagiste.");
    expect(body).toContain("Plomberie des Oliviers · SIRET 123 456 789 00012");
    expect(body).toContain("Contrat n° : [à compléter]");
    expect(body.trim().endsWith("Lucas Bernard")).toBe(true);
  });

  it("ne demande que la décennale quand la RC Pro est retirée", () => {
    const { subject, body } = buildInsurerRequest({ ...base, documents: ["decennale"] });
    expect(subject).toBe("Attestation décennale — Plomberie des Oliviers");
    expect(body).toContain(
      "Pourriez-vous m’envoyer mon attestation d’assurance de responsabilité décennale",
    );
    expect(body).not.toContain("civile professionnelle");
    expect(body).not.toContain("•");
  });

  it("RC Pro seule : pas de modèle décennal ni de liste de métiers", () => {
    const { subject, body } = buildInsurerRequest({ ...base, documents: ["rc_pro"] });
    expect(subject).toBe("Attestation de RC Pro — Plomberie des Oliviers");
    expect(body).not.toContain("arrêté");
    expect(body).not.toContain("métiers");
  });

  it("signe avec le nom de l'entreprise et omet le SIRET quand ils manquent", () => {
    const { body } = buildInsurerRequest({
      ...base,
      siret: null,
      signature: null,
      tradeLabels: [],
      documents: ["decennale", "rc_pro"],
    });
    expect(body).not.toContain("SIRET");
    expect(body).not.toContain("métiers");
    expect(body.trim().endsWith("Plomberie des Oliviers")).toBe(true);
  });

  it("refuse une demande vide", () => {
    expect(() => buildInsurerRequest({ ...base, documents: [] })).toThrow();
  });
});

describe("insurerMailto", () => {
  it("encode l'objet et le message, retours à la ligne compris", () => {
    const url = insurerMailto(" contact@assureur.fr ", "Attestation — test", "Bonjour,\nMerci");
    expect(url).toBe(
      "mailto:contact@assureur.fr?subject=Attestation%20%E2%80%94%20test&body=Bonjour%2C%0AMerci",
    );
  });

  it("laisse l'adresse vide si l'artisan ne la connaît pas", () => {
    expect(insurerMailto("", "Objet", "Texte")).toBe("mailto:?subject=Objet&body=Texte");
  });
});
