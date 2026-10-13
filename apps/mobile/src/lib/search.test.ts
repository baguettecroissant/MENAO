import { describe, expect, it } from "vitest";
import { MAX_DESCRIPTION_LENGTH, webSearchUrl } from "./search";

const SITE = "https://menao.example";

describe("webSearchUrl", () => {
  it("transmet la description et le métier, encodés", () => {
    expect(webSearchUrl(SITE, "  Fuite sous l'évier & robinet  ", "plombier")).toBe(
      `${SITE}/recherche?q=Fuite+sous+l%27%C3%A9vier+%26+robinet&metier=plombier`,
    );
  });

  it("ouvre la recherche vide sans description ni métier", () => {
    expect(webSearchUrl(SITE, "   ")).toBe(`${SITE}/recherche`);
    expect(webSearchUrl(SITE, "", "peintre")).toBe(`${SITE}/recherche?metier=peintre`);
  });

  it("tronque une description trop longue", () => {
    const url = new URL(webSearchUrl(SITE, "a".repeat(MAX_DESCRIPTION_LENGTH + 10)));
    expect(url.searchParams.get("q")).toHaveLength(MAX_DESCRIPTION_LENGTH);
  });
});
