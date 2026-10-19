/**
 * Fiche publique d'un artisan (SEO phase D, F-61, ADR 0144) : adresse `/artisans/<slug>` fixée par
 * la base à la validation du dossier, description pour les moteurs de recherche, et badge
 * « Assuré et vérifié par MENAO » que l'artisan colle sur son propre site.
 */

/** Adresse produite par la base (`app.slugify`) : minuscules, chiffres, tirets simples. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isArtisanSlug(value: string): boolean {
  return value.length > 0 && value.length <= 80 && SLUG_PATTERN.test(value);
}

export function artisanPageUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/artisans/${slug}`;
}

/** Présentation de l'artisan ramenée à une description de 155 caractères au plus. */
export function seoDescription(text: string | null | undefined, fallback: string, max = 155) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.!?…-]+$/, "")}…`;
}

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const ARTISAN_BADGE_SIZE = { width: 232, height: 64 } as const;

const FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * Badge SVG, autonome (ni script, ni lien, ni police externe). « Assuré et vérifié » seulement si
 * l'artisan a le badge de la fiche (ADR 0119) ; sinon une mention neutre, sans promesse.
 */
export function artisanBadgeSvg(verified: boolean): string {
  const { width, height } = ARTISAN_BADGE_SIZE;
  const [title, line1, line2] = verified
    ? ["Assuré et vérifié par MENAO", "Assuré et vérifié", "par MENAO · menao.fr"]
    : ["Artisan sur MENAO", "Artisan sur MENAO", "menao.fr"];
  const check = verified
    ? `<circle cx="50" cy="50" r="9" fill="#16a34a" stroke="#ffffff" stroke-width="2"/>` +
      `<path d="M45.8 50.2l2.9 2.9 5.5-5.8" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">` +
    `<title>${escapeXml(title)}</title>` +
    `<defs><linearGradient id="menao-badge-fond" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#1a2b85"/><stop offset="1" stop-color="#4869f6"/></linearGradient></defs>` +
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12" fill="#ffffff" stroke="#d7ddf3"/>` +
    `<rect x="10" y="10" width="44" height="44" rx="10" fill="url(#menao-badge-fond)"/>` +
    `<g transform="translate(14.4 16.9) scale(1.1)" fill="none" stroke="#ffffff" stroke-linecap="round">` +
    `<path d="M9.5 10.5 16 5.5l6.5 5" stroke-width="3.4" stroke-linejoin="round"/>` +
    `<path d="M5 16.5c5.8 7.2 16.2 7.2 22 0" stroke-width="4.6"/></g>` +
    check +
    `<text x="68" y="29" font-family="${FONT}" font-size="15" font-weight="700" fill="#0b1438">${escapeXml(line1)}</text>` +
    `<text x="68" y="47" font-family="${FONT}" font-size="12.5" font-weight="600" fill="#3451d1">${escapeXml(line2)}</text>` +
    `</svg>`
  );
}

/**
 * Badge à coller sur le site de l'artisan : lien vers sa fiche (lien suivi, utile au référencement
 * des deux sites) et image servie par MENAO, tenue à jour. Texte de remplacement neutre : il reste
 * vrai même si l'image n'annonce plus la vérification.
 */
export function artisanBadge(siteUrl: string, slug: string, name: string) {
  const site = siteUrl.replace(/\/+$/, "");
  const page = artisanPageUrl(site, slug);
  const image = `${site}/badge/${slug}.svg`;
  const { width, height } = ARTISAN_BADGE_SIZE;
  return {
    page,
    image,
    snippet:
      `<a href="${escapeXml(page)}"><img src="${escapeXml(image)}" width="${width}" height="${height}" ` +
      `alt="${escapeXml(`${name} sur MENAO`)}"></a>`,
  };
}
