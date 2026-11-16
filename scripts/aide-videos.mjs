#!/usr/bin/env node
// Dépôt des vidéos de l'aide à l'inscription (ADR 0349) dans le compartiment public `aide-videos`
// d'un projet Supabase hébergé, idempotent (fichiers remplacés). Aucune dépendance.
// Les vidéos ne sont pas dans le dépôt (public) : elles sont fabriquées dans medias/films/aide
// (versions légères web-<id>.mp4 et aperçus web-<id>.jpg) et déposées sous <id>.mp4 et <id>.jpg.
// La clé serveur est lue par l'API de gestion avec le jeton d'accès, jamais affichée.
//
// Usage :
//   export SUPABASE_ACCESS_TOKEN=…
//   node scripts/aide-videos.mjs --project <ref> --dossier medias/films/aide/sortie [--dry-run oui]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (acc, cur, i, all) => (cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1]]] : acc),
      [],
    ),
);
const { project, dossier } = args;
const dryRun = args["dry-run"] === "oui";
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!project || !dossier || !token) {
  console.error(
    "Usage : SUPABASE_ACCESS_TOKEN=… node scripts/aide-videos.mjs --project <ref> --dossier <dossier>",
  );
  process.exit(1);
}

const fichiers = readdirSync(dossier)
  .filter((f) => /^web-v\d{2}-[a-z-]+\.(mp4|jpg)$/.test(f))
  .sort();
if (!fichiers.length) {
  console.error(`Aucune vidéo web-<id>.mp4 dans ${dossier}`);
  process.exit(1);
}

const keys = await fetch(`https://api.supabase.com/v1/projects/${project}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!keys.ok) {
  console.error(`Clés du projet illisibles (${keys.status})`);
  process.exit(1);
}
const serviceKey = (await keys.json()).find((k) => k.name === "service_role")?.api_key;
if (!serviceKey) {
  console.error("Clé serveur introuvable");
  process.exit(1);
}

for (const fichier of fichiers) {
  const cible = fichier.replace(/^web-/, "");
  const type = fichier.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
  const corps = readFileSync(join(dossier, fichier));
  if (dryRun) {
    console.log(`(essai) ${cible} : ${Math.round(corps.length / 1024)} Ko`);
    continue;
  }
  const res = await fetch(`https://${project}.supabase.co/storage/v1/object/aide-videos/${cible}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": type,
      "x-upsert": "true",
      "Cache-Control": "max-age=86400",
    },
    body: corps,
  });
  console.log(
    `${res.ok ? "déposé" : `échec ${res.status}`} ${cible} (${Math.round(corps.length / 1024)} Ko)`,
  );
  if (!res.ok) process.exitCode = 1;
}
