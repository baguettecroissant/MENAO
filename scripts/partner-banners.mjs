#!/usr/bin/env node
// Bannières du kit partenaire (ADR 0141) : SVG statiques aux couleurs de MENAO, servies par le
// site (apps/web/public/bannieres). Textes repris du site, aucune promesse nouvelle.
// Usage : node scripts/partner-banners.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../apps/web/public/bannieres/", import.meta.url);
const FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const STRONG = "#3451d1";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&#39;");

/** Logo (toit et sourire), blanc, `size` = largeur en px. */
function mark(x, y, size, opacity = 1) {
  const k = size / 32;
  return `<g transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="#fff" stroke-opacity="${opacity}" stroke-linecap="round">
    <path d="M9.5 10.5 16 5.5l6.5 5" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M5 16.5c5.8 7.2 16.2 7.2 22 0" stroke-width="4.6"/>
  </g>`;
}
function logo(x, y, size) {
  return `${mark(x, y, size)}<text x="${x + size * 1.15}" y="${y + size * 0.72}" font-family="${FONT}" font-size="${size * 0.82}" font-weight="700" letter-spacing="-0.5" fill="#fff">menao</text>`;
}
function text(
  x,
  y,
  size,
  value,
  { weight = 700, opacity = 1, anchor = "start", fill = "#fff" } = {},
) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" fill-opacity="${opacity}" text-anchor="${anchor}">${esc(value)}</text>`;
}
function pill(x, y, w, h, label, size) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff"/>
  ${text(x + w / 2, y + h / 2 + size * 0.36, size, label, { anchor: "middle", fill: STRONG })}`;
}
function svg(w, h, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <defs>
    <linearGradient id="fond" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1438"/>
      <stop offset="0.45" stop-color="#1a2b85"/>
      <stop offset="0.8" stop-color="#4869f6"/>
      <stop offset="1" stop-color="#8ea4fb"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="${Math.min(12, h / 6)}" fill="url(#fond)"/>
  ${body}
</svg>
`;
}

const CLIENT = "MENAO : trouvez un artisan du bâtiment vérifié";
const PRO = "MENAO pour les artisans : des chantiers près de chez vous, sans commission";

const banners = {
  "particuliers-728x90": svg(
    728,
    90,
    CLIENT,
    [
      logo(20, 30, 30),
      text(146, 42, 18, "Trouvez un artisan du bâtiment vérifié"),
      text(146, 63, 12, "Artisans vérifiés · Gratuit pour vous · Sans engagement", {
        weight: 500,
        opacity: 0.85,
      }),
      pill(548, 25, 160, 40, "Décrire mon projet", 15),
    ].join("\n  "),
  ),
  "particuliers-300x250": svg(
    300,
    250,
    CLIENT,
    [
      logo(24, 24, 30),
      text(24, 104, 24, "Trouvez un artisan"),
      text(24, 134, 24, "du bâtiment vérifié"),
      text(24, 164, 13, "Artisans vérifiés · Gratuit pour vous", { weight: 500, opacity: 0.85 }),
      pill(24, 188, 252, 40, "Décrire mon projet", 15),
    ].join("\n  "),
  ),
  "particuliers-160x600": svg(
    160,
    600,
    CLIENT,
    [
      logo(20, 30, 28),
      text(20, 150, 21, "Trouvez"),
      text(20, 177, 21, "un artisan"),
      text(20, 204, 21, "du bâtiment"),
      text(20, 231, 21, "vérifié"),
      text(20, 300, 13, "✓ Artisans vérifiés", { weight: 500, opacity: 0.9 }),
      text(20, 324, 13, "✓ Gratuit pour vous", { weight: 500, opacity: 0.9 }),
      text(20, 348, 13, "✓ Sans engagement", { weight: 500, opacity: 0.9 }),
      mark(20, 380, 120, 0.14),
      pill(12, 524, 136, 44, "Décrire mon projet", 12.5),
    ].join("\n  "),
  ),
  "particuliers-320x50": svg(
    320,
    50,
    CLIENT,
    [
      mark(12, 12, 26),
      text(46, 30, 13, "Trouvez un artisan vérifié"),
      pill(220, 10, 90, 30, "Commencer", 12.5),
    ].join("\n  "),
  ),
  "artisans-728x90": svg(
    728,
    90,
    PRO,
    [
      logo(20, 30, 30),
      text(146, 42, 17, "Artisans : des chantiers près de chez vous"),
      text(146, 63, 12, "0 % de commission · Paiements versés sur votre compte", {
        weight: 500,
        opacity: 0.85,
      }),
      pill(528, 25, 180, 40, "Créer mon compte pro", 14),
    ].join("\n  "),
  ),
  "artisans-300x250": svg(
    300,
    250,
    PRO,
    [
      logo(24, 24, 30),
      text(24, 98, 22, "Artisans du bâtiment :"),
      text(24, 126, 22, "des chantiers"),
      text(24, 154, 22, "près de chez vous"),
      text(24, 178, 13, "0 % de commission", { weight: 500, opacity: 0.85 }),
      pill(24, 192, 252, 40, "Créer mon compte pro", 15),
    ].join("\n  "),
  ),
};

mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(banners)) {
  writeFileSync(new URL(`menao-${name}.svg`, OUT), content);
  console.log(`menao-${name}.svg`);
}
