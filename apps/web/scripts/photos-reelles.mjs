// Remplacement des photos d'illustration du site par de vraies photos (ADR 0098) : recadrage aux
// formats du site, WebP léger sans métadonnées (ni position GPS), puis images de partage refaites
// avec le même gabarit (ADR 0094). Voir docs/images/photos-reelles.md.
//
// Usage, depuis la racine du dépôt :
//   node apps/web/scripts/photos-reelles.mjs <dossier>   photos nommées par emplacement
//   node apps/web/scripts/photos-reelles.mjs --partage   images de partage seules, d'après le site
//   node apps/web/scripts/photos-reelles.mjs --variantes versions réduites seules, d'après le site
//
// Noms acceptés : accueil-bandeau.jpg, plombier.jpg, electricien.png… (JPEG, PNG, WebP ou HEIC).
// Cadrage facultatif dans le nom : « plombier@50,30.jpg » garde le point situé à 50 % de la
// largeur et 30 % de la hauteur (centre par défaut).
/* eslint-disable no-console -- outil en ligne de commande : il rend compte de chaque fichier. */
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(web, "public", "images");
const require = createRequire(join(web, "package.json"));
const { chromium } = require("@playwright/test");

/** Emplacements du site : fichier, format et libellé de l'image de partage. */
const EMPLACEMENTS = {
  "accueil-bandeau": { fichier: "accueil-bandeau.webp", largeur: 1536, hauteur: 1024 },
  electricien: { metier: "Électricien" },
  plombier: { metier: "Plombier" },
  chauffagiste: { metier: "Chauffagiste" },
  climaticien: { metier: "Climaticien" },
  macon: { metier: "Maçon" },
  peintre: { metier: "Peintre" },
  plaquiste: { metier: "Plaquiste" },
  carreleur: { metier: "Carreleur" },
  menuisier: { metier: "Menuisier" },
  charpentier: { metier: "Charpentier" },
  couvreur: { metier: "Couvreur" },
  facadier: { metier: "Façadier" },
  serrurier: { metier: "Serrurier" },
  terrassier: { metier: "Terrassier" },
  paysagiste: { metier: "Paysagiste" },
};
const formatDe = (code) =>
  code === "accueil-bandeau"
    ? EMPLACEMENTS[code]
    : { fichier: `metiers/${code}.webp`, largeur: 800, hauteur: 1200 };
/** Version réduite, même cadrage, pour les petits écrans et les vignettes (srcset, ADR 0103). */
const varianteDe = (code) =>
  code === "accueil-bandeau"
    ? { fichier: "accueil-bandeau-960.webp", largeur: 960, hauteur: 640 }
    : { fichier: `metiers/${code}-400.webp`, largeur: 400, hauteur: 600 };
const QUALITE_WEBP = 0.82;

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Photo en data URL (même origine que la page : le canevas peut l'exporter). HEIC via sips. */
function dataUrl(chemin) {
  let source = chemin;
  let ext = extname(chemin).toLowerCase();
  if (ext === ".heic" || ext === ".heif") {
    source = join(mkdtempSync(join(tmpdir(), "menao-heic-")), "photo.jpg");
    execFileSync("sips", ["-s", "format", "jpeg", chemin, "--out", source], { stdio: "ignore" });
    ext = ".jpg";
  }
  const type = TYPES[ext];
  if (!type) throw new Error(`format non pris en charge : ${basename(chemin)}`);
  return `data:${type};base64,${readFileSync(source).toString("base64")}`;
}

/** Recadre (object-fit: cover) et encode en WebP ; renvoie les octets. */
async function recadrer(page, src, { largeur, hauteur }, x, y) {
  const base64 = await page.evaluate(
    async ({ src, largeur, hauteur, x, y, qualite }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const echelle = Math.max(largeur / img.naturalWidth, hauteur / img.naturalHeight);
      const l = largeur / echelle;
      const h = hauteur / echelle;
      const sx = Math.min(Math.max(img.naturalWidth * x - l / 2, 0), img.naturalWidth - l);
      const sy = Math.min(Math.max(img.naturalHeight * y - h / 2, 0), img.naturalHeight - h);
      const canvas = document.createElement("canvas");
      canvas.width = largeur;
      canvas.height = hauteur;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, l, h, 0, 0, largeur, hauteur);
      return canvas.toDataURL("image/webp", qualite).split(",")[1];
    },
    { src, largeur, hauteur, x, y, qualite: QUALITE_WEBP },
  );
  return Buffer.from(base64, "base64");
}

const police = (poids) =>
  pathToFileURL(
    createRequire(resolve(web, "../mobile/package.json")).resolve(
      `@expo-google-fonts/google-sans/${poids}/GoogleSans_${poids}.ttf`,
    ),
  ).href;

/** Image de partage 1200 × 630, même gabarit que celles générées pour l'ADR 0094. */
function partage(photo, metier) {
  // Espaces insécables : « l'artisan du BTP » reste sur une ligne, comme sur le site.
  const titre = metier ?? "Trouvez l'artisan\u00a0du\u00a0BTP";
  const suite = metier ? "dans les Alpes‑Maritimes" : "dont vous avez besoin";
  const puces = ["Gratuit pour vous", "Artisans vérifiés", "Paiement direct à l'artisan"];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face { font-family: GS; src: url(${police("500Medium")}); font-weight: 500; }
@font-face { font-family: GS; src: url(${police("400Regular")}); font-weight: 400; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: #1a2a8c; font-family: GS, sans-serif; }
.photo { position: absolute; top: 0; right: 0; height: 100%; width: 62%; object-fit: cover; }
.voile { position: absolute; inset: 0; background: linear-gradient(90deg, #1a2a8c 0%, rgba(37,57,184,.96) 46%, rgba(37,57,184,.55) 66%, rgba(37,57,184,0) 82%); }
.texte { position: relative; height: 100%; width: 660px; padding: 64px; display: flex; flex-direction: column; justify-content: space-between; color: #fff; }
.logo { display: flex; align-items: center; gap: 13px; font-weight: 500; font-size: 38px; letter-spacing: -0.03em; line-height: 1; }
.logo svg { width: 45px; }
h1 { font-weight: 500; font-size: 54px; line-height: 1.06; letter-spacing: -0.02em; }
h1 span { color: #b9c8ff; }
p { margin-top: 20px; font-size: 23px; line-height: 1.35; color: rgba(255,255,255,.86); }
.puces { display: flex; gap: 12px; font-size: 17px; }
.puces span { border-radius: 999px; border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.1); padding: 8px 16px; white-space: nowrap; }
</style></head><body>
<img class="photo" src="${photo}"><div class="voile"></div>
<div class="texte">
  <div class="logo"><svg viewBox="0 0 32 28" fill="none"><path d="M9.5 10.5 16 5.5l6.5 5" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 16.5c5.8 7.2 16.2 7.2 22 0" stroke="#fff" stroke-width="4.6" stroke-linecap="round"/></svg>menao</div>
  <div><h1>${titre}<br><span>${suite}</span></h1><p>Artisans vérifiés. Devis, signature, paiement et suivi du chantier au même endroit.</p></div>
  <div class="puces">${puces.map((p) => `<span>${p}</span>`).join("")}</div>
</div></body></html>`;
}

async function refairePartage(browser, code) {
  const metier = EMPLACEMENTS[code].metier ?? null;
  const photo = pathToFileURL(join(publicDir, formatDe(code).fichier)).href;
  const dossier = mkdtempSync(join(tmpdir(), "menao-partage-"));
  const fichier = join(dossier, "page.html");
  writeFileSync(fichier, partage(photo, metier));
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(fichier).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const sortie = join(publicDir, "og", `${code === "accueil-bandeau" ? "menao" : code}.jpg`);
  await page.screenshot({ path: sortie, type: "jpeg", quality: 82 });
  await page.close();
  console.log(`  partage : ${sortie.slice(web.length + 1)}`);
}

const args = process.argv.slice(2);
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
try {
  if (args.includes("--partage")) {
    for (const code of Object.keys(EMPLACEMENTS)) await refairePartage(browser, code);
  } else if (args.includes("--variantes")) {
    const page = await browser.newPage();
    for (const code of Object.keys(EMPLACEMENTS)) {
      const variante = varianteDe(code);
      const octets = await recadrer(
        page,
        dataUrl(join(publicDir, formatDe(code).fichier)),
        variante,
        0.5,
        0.5,
      );
      writeFileSync(join(publicDir, variante.fichier), octets);
      console.log(`public/images/${variante.fichier} (${Math.round(octets.length / 1000)} Ko)`);
    }
  } else {
    const dossier = args[0];
    if (!dossier)
      throw new Error("indiquez le dossier des photos (voir docs/images/photos-reelles.md)");
    const page = await browser.newPage();
    let traitees = 0;
    for (const nom of readdirSync(dossier).sort()) {
      const m = nom.match(/^([a-z-]+)(?:@(\d{1,3}),(\d{1,3}))?\.[a-z]+$/i);
      if (!m || !(m[1] in EMPLACEMENTS)) {
        if (!nom.startsWith(".")) console.warn(`ignoré (nom inconnu) : ${nom}`);
        continue;
      }
      const code = m[1];
      const x = m[2] ? Number(m[2]) / 100 : 0.5;
      const y = m[3] ? Number(m[3]) / 100 : 0.5;
      const format = formatDe(code);
      const octets = await recadrer(page, dataUrl(join(dossier, nom)), format, x, y);
      writeFileSync(join(publicDir, format.fichier), octets);
      const variante = varianteDe(code);
      writeFileSync(
        join(publicDir, variante.fichier),
        await recadrer(page, dataUrl(join(dossier, nom)), variante, x, y),
      );
      console.log(
        `${nom} → public/images/${format.fichier} (${Math.round(octets.length / 1000)} Ko)`,
      );
      await refairePartage(browser, code);
      traitees += 1;
    }
    console.log(
      traitees
        ? `${traitees} photo(s) remplacée(s). Pensez à mettre à jour docs/images/photos-generees.md et photos-reelles.md.`
        : "Aucune photo reconnue.",
    );
  }
} finally {
  await browser.close();
}
