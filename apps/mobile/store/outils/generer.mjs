// Visuels des stores (ADR 0097) : captures des vrais écrans de l'application (version web Expo,
// données fictives servies à la place de Supabase), mises en page aux formats App Store et Google
// Play, image de présentation Google Play et icône de notification Android.
//
// Prérequis : serveur Expo lancé (`pnpm --filter mobile start`, port 8081) et Chromium de
// Playwright installé. Usage, depuis la racine du dépôt :
//   node apps/mobile/store/outils/generer.mjs            (tout)
//   node apps/mobile/store/outils/generer.mjs --decouvrir (affiche les requêtes non servies)
/* eslint-disable no-console -- outil en ligne de commande : il rend compte de chaque étape. */
import { Buffer } from "node:buffer";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { IDS, donnees } from "./donnees.mjs";

const ici = dirname(fileURLToPath(import.meta.url));
const store = resolve(ici, "..");
const mobile = resolve(store, "..");
const requireWeb = createRequire(resolve(mobile, "../web/package.json"));
const requireMobile = createRequire(resolve(mobile, "package.json"));
const { chromium } = requireWeb("@playwright/test");
const decouvrir = process.argv.includes("--decouvrir");
const BASE = process.env.EXPO_URL ?? "http://localhost:8081";

// Adresse Supabase de l'application (publique) : toutes ses requêtes sont interceptées.
const envFile = readFileSync(resolve(mobile, ".env"), "utf8");
const supabaseUrl = new URL(envFile.match(/^EXPO_PUBLIC_SUPABASE_URL=(.*)$/m)[1].trim());
const ref = supabaseUrl.hostname.split(".")[0];

const police = (poids) =>
  pathToFileURL(
    requireMobile.resolve(`@expo-google-fonts/google-sans/${poids}/GoogleSans_${poids}.ttf`),
  ).href;

/** Écrans capturés, dans l'ordre des stores, avec leur accroche (textes déjà publiés). */
const ECRANS = [
  {
    nom: "1-accueil",
    chemin: "/accueil",
    titre: "Trouvez l'artisan pro du BTP dont vous avez besoin",
    sousTitre: "De la mise en relation à la réception du chantier.",
  },
  {
    nom: "2-recherche",
    chemin: "/recherche?metier=plombier",
    saisie:
      "Fuite sous l'évier de la cuisine à Nice : il faut remplacer le siphon et vérifier les joints.",
    titre: "Décrivez vos travaux avec vos mots, ou dictez-les",
    sousTitre: "MENAO prépare votre demande pour les artisans.",
  },
  {
    nom: "3-artisans",
    chemin: `/projet/${IDS.projet}/artisans`,
    role: "particulier",
    titre: "Des artisans vérifiés, décennale contrôlée",
    sousTitre: "Choisissez ceux à qui envoyer votre demande.",
  },
  {
    nom: "4-chantier",
    chemin: `/chantier/${IDS.chantierClient}`,
    role: "particulier",
    titre: "Suivez votre chantier, du devis à la réception",
    sousTitre: "Devis, acompte, suivi et messages au même endroit.",
  },
  {
    nom: "5-tableau-de-bord",
    chemin: "/",
    role: "artisan",
    titre: "Artisans : vos demandes et chantiers dans une seule app",
    sousTitre: "Rendez-vous, devis, acompte et suivi.",
  },
  {
    nom: "6-devis",
    chemin: `/pro-chantier/${IDS.chantierPro}/devis`,
    role: "artisan",
    titre: "Vous dictez, MENAO rédige le devis",
    sousTitre: "MENAO n'invente aucun prix : seuls ceux que vous dictez sont repris.",
  },
];

/** Formats demandés : iPhone 6,9 pouces (App Store) et téléphone 9:16 (Google Play). */
const FORMATS = [
  { dossier: "ios", largeur: 1320, hauteur: 2868, os: "ios" },
  { dossier: "android", largeur: 1080, hauteur: 1920, os: "android" },
];

// Écran capturé : iPhone de 390 × 844 points, moins la barre d'état et la zone de la barre
// d'accueil, dessinées par le cadre.
const ECRAN = { largeur: 390, hauteur: 844, barre: 47, bas: 34, densite: 3 };

const TRADES = [
  ["electricien", "Électricien"],
  ["plombier", "Plombier"],
  ["chauffagiste", "Chauffagiste"],
  ["climaticien", "Climaticien"],
  ["macon", "Maçon"],
  ["peintre", "Peintre"],
  ["plaquiste", "Plaquiste"],
  ["carreleur", "Carreleur"],
  ["menuisier", "Menuisier"],
  ["charpentier", "Charpentier"],
  ["couvreur", "Couvreur"],
  ["facadier", "Façadier"],
  ["serrurier", "Serrurier"],
  ["terrassier", "Terrassier"],
  ["paysagiste", "Paysagiste"],
].map(([code, label]) => ({ code, label }));

/** Session fictive (jeton non signé, jamais envoyé ailleurs qu'à l'interception). */
function session(role) {
  const id = role === "artisan" ? IDS.artisan : IDS.particulier;
  const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "demo@exemple.invalid",
    app_metadata: { role },
    user_metadata: {},
    is_anonymous: false,
    created_at: "2026-09-01T09:00:00Z",
  };
  const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: id, exp, role: "authenticated", app_metadata: { role } })}.demo`;
  return {
    user,
    value: {
      access_token: token,
      refresh_token: "demo",
      expires_at: exp,
      expires_in: 24 * 3600,
      token_type: "bearer",
      user,
    },
  };
}

/** Répond à une requête Supabase avec les données fictives ; null si elle n'est pas prévue. */
function repondre(request, role, data, user) {
  const url = new URL(request.url());
  const path = url.pathname;
  const single = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object");
  if (path.startsWith("/auth/v1/user")) return { json: user };
  if (path.startsWith("/rest/v1/rpc/")) {
    const fn = path.slice("/rest/v1/rpc/".length);
    return fn in data.rpc ? { json: data.rpc[fn] } : null;
  }
  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length);
    if (request.method() === "HEAD") {
      return { status: 200, headers: { "content-range": "*/0" }, body: "" };
    }
    if (table === "trades") return { json: TRADES };
    const value = data.tables[table];
    if (value === undefined) return null;
    const resolved = typeof value === "function" ? value(role) : value;
    const rows = Array.isArray(resolved) ? resolved : [resolved];
    return { json: single ? (rows[0] ?? null) : rows };
  }
  if (path.startsWith("/functions/v1/")) return { json: {} };
  if (path.startsWith("/storage/v1/object/public/avatars/") && avatar) {
    return { body: avatar, contentType: "image/png" };
  }
  return null;
}

/** Photo de profil de démonstration : initiales sur dégradé bleu (aucun visage). */
let avatar = null;
async function preparerAvatar(browser) {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  await page.setContent(
    `<body style="margin:0"><div style="width:256px;height:256px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#86a0fb,#3451d1);color:#fff;font:600 104px system-ui,sans-serif;letter-spacing:-4px">NE</div></body>`,
  );
  avatar = await page.screenshot();
  await page.close();
}

async function capturer(browser, ecran, sortie) {
  const data = donnees(new Date());
  const context = await browser.newContext({
    viewport: { width: ECRAN.largeur, height: ECRAN.hauteur - ECRAN.barre - ECRAN.bas },
    deviceScaleFactor: ECRAN.densite,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    reducedMotion: "reduce",
  });
  const s = ecran.role ? session(ecran.role) : null;
  if (s) {
    await context.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [`sb-${ref}-auth-token`, JSON.stringify(s.value)],
    );
  }
  const manquantes = new Set();
  await context.route(
    (u) => u.hostname === supabaseUrl.hostname,
    async (route) => {
      const reponse = repondre(route.request(), ecran.role, data, s?.user);
      if (reponse) return route.fulfill(reponse);
      const u = new URL(route.request().url());
      manquantes.add(`${route.request().method()} ${u.pathname}${u.search}`);
      // Requête non prévue : réponse vide, sans jamais joindre Supabase.
      return route.fulfill({ json: u.pathname.includes("/rpc/") ? null : [] });
    },
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error(`  ${ecran.nom} : ${e.message}`));
  await page.goto(BASE + ecran.chemin, { waitUntil: "load" });
  await page.waitForTimeout(5000);
  if (ecran.saisie) {
    await page.locator("textarea").first().fill(ecran.saisie);
    await page.locator("textarea").first().blur();
    await page.waitForTimeout(500);
  }
  // Avertissements de développement d'Expo masqués.
  await page.addStyleTag({
    content: "[data-testid*='logbox'], #logbox { display: none !important; }",
  });
  await page.screenshot({ path: sortie });
  // Couleur du bas de l'écran, prolongée sous la barre d'accueil.
  const fond = await page.evaluate(
    ([x, y]) => {
      for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
        const color = getComputedStyle(el).backgroundColor;
        if (color && color !== "transparent" && !color.endsWith(", 0)")) return color;
      }
      return "#f9f7f0";
    },
    [ECRAN.largeur / 2, ECRAN.hauteur - ECRAN.barre - ECRAN.bas - 2],
  );
  if (manquantes.size && decouvrir) {
    console.log(`  ${ecran.nom}, requêtes non servies :\n    ${[...manquantes].join("\n    ")}`);
  }
  await context.close();
  return fond;
}

const LOGO = `<svg viewBox="0 0 32 28" fill="none"><path d="M9.5 10.5 16 5.5l6.5 5" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 16.5c5.8 7.2 16.2 7.2 22 0" stroke="#fff" stroke-width="4.6" stroke-linecap="round"/></svg>`;

const BARRE_ETAT = `<div class="barre"><span>9:41</span><svg viewBox="0 0 66 12" class="icones"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/><path d="M30 3.5a9 9 0 0 1 12 0l-1.6 1.7a6.6 6.6 0 0 0-8.8 0ZM32.6 6.4a5.4 5.4 0 0 1 6.8 0L36 10Z"/><rect x="45" y="1" width="18" height="10" rx="3" fill="none" stroke="#111728" stroke-opacity=".4"/><rect x="47" y="3" width="13" height="6" rx="1.5"/><rect x="64" y="4" width="1.6" height="4" rx=".8" fill-opacity=".4"/></svg></div>`;

/** Page HTML d'un visuel : fond bleu MENAO, accroche, téléphone avec la capture. */
function cadre({ largeur, hauteur, os }, ecran, capture, fond) {
  const u = largeur / 100; // unité : 1 % de la largeur
  const haut = os === "ios" ? 30 : 28; // hauteur réservée au texte, en % de la largeur
  const telLargeur = Math.min(largeur * 0.76, ((hauteur - haut * u * 1.15 - 4 * u) * 390) / 844);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face { font-family: GS; src: url(${police("500Medium")}); font-weight: 500; }
@font-face { font-family: GS; src: url(${police("400Regular")}); font-weight: 400; }
* { box-sizing: border-box; margin: 0; }
body { width: ${largeur}px; height: ${hauteur}px; overflow: hidden; font-family: GS, sans-serif;
  background: linear-gradient(165deg, #5f7ffb 0%, #4869f6 45%, #3451d1 100%); position: relative; }
.filigrane { position: absolute; width: ${70 * u}px; right: ${-18 * u}px; bottom: ${-8 * u}px; opacity: .08; }
.texte { position: absolute; top: ${6 * u}px; left: ${7 * u}px; right: ${7 * u}px; text-align: center; color: #fff; }
h1 { font-weight: 500; font-size: ${os === "ios" ? 6.6 * u : 6 * u}px; line-height: 1.15; letter-spacing: -0.02em; }
p { margin-top: ${2 * u}px; font-size: ${os === "ios" ? 3.4 * u : 3.1 * u}px; line-height: 1.35; opacity: .88; }
.tel { position: absolute; left: 50%; transform: translateX(-50%); top: ${haut * u * 1.15}px;
  width: ${telLargeur}px; aspect-ratio: 390 / 844; border-radius: ${telLargeur * 0.13}px;
  background: #0e1430; padding: ${telLargeur * 0.028}px;
  box-shadow: 0 ${3 * u}px ${8 * u}px rgba(10, 18, 60, .35); }
.ecran { width: 100%; height: 100%; border-radius: ${telLargeur * 0.105}px; overflow: hidden; background: #f9f7f0;
  display: flex; flex-direction: column; position: relative; }
.barre { height: ${(ECRAN.barre / ECRAN.hauteur) * 100}%; flex: none; display: flex; align-items: center;
  justify-content: space-between; padding: 0 ${telLargeur * 0.09}px; font-weight: 500;
  font-size: ${telLargeur * 0.042}px; color: #111728; background: #f9f7f0; }
.icones { height: ${telLargeur * 0.03}px; fill: #111728; }
.capture { flex: 1; min-height: 0; width: 100%; object-fit: cover; object-position: top; display: block; }
.bas { height: ${(ECRAN.bas / ECRAN.hauteur) * 100}%; flex: none; background: ${fond};
  display: flex; align-items: center; justify-content: center; }
.bas span { width: 36%; height: ${telLargeur * 0.013}px; border-radius: 999px; background: #111728; }
.ilot { position: absolute; top: ${telLargeur * 0.025}px; left: 50%; transform: translateX(-50%);
  width: ${telLargeur * 0.3}px; height: ${telLargeur * 0.085}px; border-radius: 999px; background: #0e1430;
  display: ${os === "ios" ? "block" : "none"}; }
</style></head><body>
<div class="filigrane">${LOGO}</div>
<div class="texte"><h1>${ecran.titre}</h1><p>${ecran.sousTitre}</p></div>
<div class="tel"><div class="ecran">${BARRE_ETAT}<img class="capture" src="${pathToFileURL(capture).href}"><div class="bas"><span></span></div><div class="ilot"></div></div></div>
</body></html>`;
}

/** Image de présentation Google Play (1024 × 500) : logo, accroche, téléphone en biais. */
function presentation(capture) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face { font-family: GS; src: url(${police("500Medium")}); font-weight: 500; }
@font-face { font-family: GS; src: url(${police("400Regular")}); font-weight: 400; }
* { box-sizing: border-box; margin: 0; }
body { width: 1024px; height: 500px; overflow: hidden; font-family: GS, sans-serif; color: #fff;
  background: linear-gradient(120deg, #5f7ffb 0%, #4869f6 50%, #3451d1 100%); position: relative; }
.marque { position: absolute; left: 64px; top: 64px; display: flex; align-items: center; gap: 14px;
  font-weight: 500; font-size: 44px; letter-spacing: -0.03em; }
.marque svg { width: 50px; }
h1 { position: absolute; left: 64px; top: 180px; width: 600px; font-weight: 500; font-size: 43px;
  line-height: 1.12; letter-spacing: -0.02em; }
p { position: absolute; left: 64px; top: 320px; width: 520px; font-size: 22px; line-height: 1.4; opacity: .88; }
.tel { position: absolute; right: 70px; top: 48px; width: 300px; aspect-ratio: 390 / 844; border-radius: 40px;
  background: #0e1430; padding: 9px; transform: rotate(6deg); box-shadow: 0 24px 60px rgba(10, 18, 60, .4); }
.tel img { width: 100%; height: 100%; border-radius: 32px; object-fit: cover; object-position: top; display: block; }
</style></head><body>
<div class="marque">${LOGO}<span>menao</span></div>
<h1>Trouvez l'artisan pro du BTP<br>dont vous avez besoin</h1>
<p>Artisans vérifiés, devis, signature et suivi de chantier.</p>
<div class="tel"><img src="${pathToFileURL(capture).href}"></div>
</body></html>`;
}

async function rendre(browser, html, largeur, hauteur, sortie, options = {}) {
  const dossier = mkdtempSync(join(tmpdir(), "menao-store-"));
  const fichier = join(dossier, "page.html");
  writeFileSync(fichier, html);
  const page = await browser.newPage({ viewport: { width: largeur, height: hauteur } });
  await page.goto(pathToFileURL(fichier).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: sortie, ...options });
  await page.close();
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
await preparerAvatar(browser);
const brutes = mkdtempSync(join(tmpdir(), "menao-captures-"));
for (const ecran of ECRANS) {
  const capture = join(brutes, `${ecran.nom}.png`);
  const fond = await capturer(browser, ecran, capture);
  if (decouvrir) continue;
  for (const format of FORMATS) {
    const dossier = join(store, format.dossier);
    mkdirSync(dossier, { recursive: true });
    await rendre(
      browser,
      cadre(format, ecran, capture, fond),
      format.largeur,
      format.hauteur,
      join(dossier, `${ecran.nom}.jpg`),
      { type: "jpeg", quality: 90 },
    );
  }
  console.log(`visuel ${ecran.nom}`);
}
if (!decouvrir) {
  await rendre(
    browser,
    presentation(join(brutes, "1-accueil.png")),
    1024,
    500,
    join(store, "android", "presentation-1024x500.jpg"),
    { type: "jpeg", quality: 92 },
  );
  console.log("image de présentation Google Play");
  // Icône haute résolution de Google Play (512 × 512), tirée de l'icône de l'application.
  await rendre(
    browser,
    `<!doctype html><body style="margin:0"><img src="${pathToFileURL(resolve(mobile, "assets", "icon.png")).href}" style="width:512px;height:512px;display:block"></body>`,
    512,
    512,
    join(store, "android", "icone-512.png"),
  );
  console.log("icône Google Play");
  // Icône de notification Android : logo blanc sur fond transparent, 96 × 96.
  await rendre(
    browser,
    `<!doctype html><body style="margin:0;background:transparent"><div style="width:96px;height:96px;display:flex;align-items:center;justify-content:center">${LOGO.replace("<svg ", '<svg width="80" ')}</div></body>`,
    96,
    96,
    resolve(mobile, "assets", "notification-icon.png"),
    { omitBackground: true },
  );
  console.log("icône de notification");
}
await browser.close();
