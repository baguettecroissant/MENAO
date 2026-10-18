import { GUIDES } from "../src/content/guides";
import { expect, test } from "./test";

// Rubrique Guides (ADR 0135). Hors production, les brouillons sont visibles pour la relecture,
// mais jamais indexés ni listés dans le sitemap.

test("guides : sommaire, article, brouillon non indexé, absent du sitemap", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Guides" }).click();
  await expect(page).toHaveURL(/\/guides$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Les guides");

  await page.getByRole("link", { name: /Comment choisir un artisan du bâtiment/ }).click();
  await expect(page).toHaveURL(/\/guides\/choisir-un-artisan$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Comment choisir un artisan du bâtiment",
  );
  await expect(page.getByRole("heading", { name: "L'essentiel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/guides\/choisir-un-artisan$/,
  );

  const draft = GUIDES.find((g) => g.slug === "choisir-un-artisan");
  if (draft?.draft) {
    await expect(page.getByText("Brouillon en relecture : non publié")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const guide of GUIDES) {
    expect(sitemap.includes(`/guides/${guide.slug}</loc>`), guide.slug).toBe(!guide.draft);
  }
  expect((await page.goto("/guides/inconnu"))?.status()).toBe(404);
});

test("guides : intertitres uniques et liens internes valides", async ({ request }) => {
  const slugs = GUIDES.map((g) => g.slug);
  expect(new Set(slugs).size).toBe(slugs.length);

  const internal = new Set<string>();
  for (const guide of GUIDES) {
    const ids = guide.body.flatMap((b) => (b.type === "h2" ? [b.id] : []));
    expect(new Set(ids).size, `intertitres de ${guide.slug}`).toBe(ids.length);
    expect(guide.sources.length, `sources de ${guide.slug}`).toBeGreaterThan(0);
    for (const source of guide.sources) expect(source.url).toMatch(/^https:\/\//);
    for (const link of guide.related) internal.add(link.href.split("#")[0] ?? link.href);
    for (const match of JSON.stringify(guide.body).matchAll(/\]\((\/[^)\s]*)\)/g)) {
      internal.add(match[1] ?? "");
    }
  }
  for (const href of internal) {
    expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
  }
});
