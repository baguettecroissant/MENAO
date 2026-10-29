import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_BONUS_KINDS,
  COMMERCIAL_BONUS_STATUSES,
  ZONE_CODES_MAX,
  commercialBonusesCsv,
  formatZoneCodes,
  matchesZone,
  parseZoneCodes,
  type CommercialBonusExportRow,
} from "../src/commercial-results";

// Noms fictifs ; montants fictifs (1, 2 centimes…) : les vrais montants sont réglés dans le
// back-office (règle 15).
function row(overrides: Partial<CommercialBonusExportRow> = {}): CommercialBonusExportRow {
  return {
    commercial: "Commercial Exemple",
    code: "exemple-06",
    artisan: "Plomberie Fictive",
    kind: "validation",
    amountCents: 1,
    validatedAt: "2026-11-18T03:45:00+00:00",
    ...overrides,
  };
}

describe("primes des commerciaux : types et états (F-65)", () => {
  it("reprend les enums de la base", () => {
    expect(COMMERCIAL_BONUS_KINDS).toEqual(["validation", "abonnement"]);
    expect(COMMERCIAL_BONUS_STATUSES).toEqual(["en_attente", "validee", "annulee", "payee"]);
  });
});

describe("zone d'un commercial : saisie", () => {
  it("virgules, points-virgules, espaces et retours à la ligne ; dédoublonnés et triés", () => {
    expect(parseZoneCodes("061, 06000;06100\n06000  0610\t83")).toEqual({
      codes: ["06000", "061", "0610", "06100", "83"],
      invalid: [],
    });
  });

  it("vide ou seulement des séparateurs : aucune zone", () => {
    expect(parseZoneCodes("")).toEqual({ codes: [], invalid: [] });
    expect(parseZoneCodes(" ,; \n ")).toEqual({ codes: [], invalid: [] });
  });

  it("codes invalides à part, dédoublonnés, dans l'ordre de saisie", () => {
    expect(parseZoneCodes("6, 06000, 060000, 2A, nice, 6, 06-1")).toEqual({
      codes: ["06000"],
      invalid: ["6", "060000", "2A", "nice", "06-1"],
    });
  });

  it("200 codes au plus : les suivants (après tri) passent en invalides", () => {
    const all = Array.from({ length: ZONE_CODES_MAX + 2 }, (_, i) => String(10000 + i));
    const { codes, invalid } = parseZoneCodes([...all].reverse().join(","));
    expect(ZONE_CODES_MAX).toBe(200);
    expect(codes).toHaveLength(200);
    expect(codes[0]).toBe("10000");
    expect(codes[199]).toBe("10199");
    expect(invalid).toEqual(["10200", "10201"]);
  });

  it("affichage : codes séparés par une virgule", () => {
    expect(formatZoneCodes(["06000", "061"])).toBe("06000, 061");
    expect(formatZoneCodes([])).toBe("");
    const parsed = parseZoneCodes("061 06000");
    expect(parseZoneCodes(formatZoneCodes(parsed.codes))).toEqual(parsed);
  });
});

describe("zone d'un commercial : prospects dans la zone", () => {
  it("code postal qui commence par l'un des codes", () => {
    expect(matchesZone("06100", ["061", "83"])).toBe(true);
    expect(matchesZone("83000", ["061", "83"])).toBe(true);
    expect(matchesZone("06000", ["061", "83"])).toBe(false);
    expect(matchesZone("06000", ["06000"])).toBe(true);
  });

  it("zone vide : tout est dans la zone", () => {
    expect(matchesZone("75001", [])).toBe(true);
    expect(matchesZone(null, [])).toBe(true);
  });

  it("sans code postal : hors zone", () => {
    expect(matchesZone(null, ["06"])).toBe(false);
    expect(matchesZone("", ["06"])).toBe(false);
  });
});

describe("export des primes à payer (CSV)", () => {
  it("séparateur point-virgule, montants en euros à la française, champs échappés", () => {
    const csv = commercialBonusesCsv([
      row({ commercial: "Commercial ; Exemple" }),
      row({
        artisan: 'Menuiserie "Fictive"',
        kind: "abonnement",
        amountCents: 2,
        validatedAt: "2026-11-20T10:00:00Z",
      }),
      row({ amountCents: 123456 }),
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Commercial;Code;Artisan;Type;Montant (EUR);Validée le",
      '"Commercial ; Exemple";exemple-06;Plomberie Fictive;Dossier validé;0,01;2026-11-18',
      'Commercial Exemple;exemple-06;"Menuiserie ""Fictive""";Abonnement;0,02;2026-11-20',
      "Commercial Exemple;exemple-06;Plomberie Fictive;Dossier validé;1234,56;2026-11-18",
    ]);
  });

  it("sans BOM (ajouté par la route), en-tête seul sans prime", () => {
    const csv = commercialBonusesCsv([]);
    expect(csv).toBe("Commercial;Code;Artisan;Type;Montant (EUR);Validée le");
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
  });

  it("dates au jour de Paris (heure d'hiver et d'été)", () => {
    const day = (validatedAt: string) =>
      commercialBonusesCsv([row({ validatedAt })])
        .split("\r\n")[1]
        ?.split(";")[5];
    expect(day("2026-10-29T23:30:00Z")).toBe("2026-10-30");
    expect(day("2026-10-29T22:59:00Z")).toBe("2026-10-29");
    expect(day("2026-07-14T22:30:00Z")).toBe("2026-07-15");
    expect(day("2026-07-14T21:30:00Z")).toBe("2026-07-14");
    expect(day("")).toBe("");
    expect(day("pas une date")).toBe("");
  });

  it("type inconnu : repris tel quel", () => {
    expect(commercialBonusesCsv([row({ kind: "autre" })]).split("\r\n")[1]).toContain(";autre;");
  });

  it("neutralise les formules de tableur (=, +, -, @)", () => {
    const csv = commercialBonusesCsv([
      row({ commercial: '=HYPERLINK("x")', code: "+33", artisan: "@SOMME(A1)" }),
      row({ artisan: "-2+3" }),
    ]);
    expect(csv.split("\r\n").slice(1)).toEqual([
      '"\'=HYPERLINK(""x"")";\'+33;\'@SOMME(A1);Dossier validé;0,01;2026-11-18',
      "Commercial Exemple;exemple-06;'-2+3;Dossier validé;0,01;2026-11-18",
    ]);
  });
});
