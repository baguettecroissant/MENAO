#!/usr/bin/env node
// Configuration de l'authentification d'un projet Supabase hébergé (ADR 0100), idempotente.
// Aucune dépendance. Applique :
// - l'adresse du site et les adresses de retour autorisées ;
// - les objets et modèles d'e-mails français de supabase/config.toml (mêmes fichiers qu'en local) ;
// - avec --smtp oui : l'envoi par le SMTP de Resend (domaine vérifié chez Resend), qui lève la
//   limite de 2 e-mails par heure du service par défaut.
// N'affiche jamais la clé SMTP.
//
// Usage :
//   export SUPABASE_ACCESS_TOKEN=…   (et RESEND_SMTP_KEY=… avec --smtp oui)
//   node scripts/supabase-auth.mjs --project <ref> --site-url https://menao.fr \
//     [--extra-urls https://menao-web.vercel.app,http://localhost:3000] \
//     [--app-urls menao://**,exp://**] [--smtp oui] [--dry-run oui]
// --app-urls : retours de l'application après Google ou Apple (ADR 0108), repris tels quels ;
// exp://** (Expo Go) seulement sur staging.
import { readFileSync } from "node:fs";

const PRODUCTION_REF = "ffidtbwxiyqybyfdqmkj";
const TEMPLATES = ["confirmation", "magic_link", "recovery", "email_change"];

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (acc, cur, i, all) => (cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1]]] : acc),
      [],
    ),
);
const { SUPABASE_ACCESS_TOKEN, RESEND_SMTP_KEY } = process.env;
const project = args.project;
const siteUrl = args["site-url"]?.replace(/\/+$/, "");
if (!project || !siteUrl) throw new Error("--project et --site-url requis");
if (!/^https:\/\//.test(siteUrl) && !siteUrl.startsWith("http://localhost"))
  throw new Error("--site-url doit être en https");
if (project === PRODUCTION_REF && args.production !== "oui") {
  throw new Error("Projet de production : relancer avec --production oui après vérification");
}
if (!SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN manquant");
const smtp = args.smtp === "oui";
if (smtp && !RESEND_SMTP_KEY?.startsWith("re_")) throw new Error("RESEND_SMTP_KEY manquante");

// Objets et chemins des modèles, lus dans supabase/config.toml (sections [auth.email.template.*]).
const toml = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
function template(name) {
  const section = toml.split(`[auth.email.template.${name}]`)[1]?.split("\n[")[0];
  const subject = /subject = "(.*)"/.exec(section ?? "")?.[1];
  const path = /content_path = "\.\/(.*)"/.exec(section ?? "")?.[1];
  if (!subject || !path) throw new Error(`Modèle ${name} introuvable dans config.toml`);
  return { subject, content: readFileSync(new URL(`../${path}`, import.meta.url), "utf8") };
}

const extras = (args["extra-urls"] ?? "")
  .split(",")
  .map((u) => u.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const appUrls = (args["app-urls"] ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
if (project === PRODUCTION_REF && appUrls.some((u) => u.startsWith("exp:"))) {
  throw new Error("exp:// (Expo Go) est réservé à staging");
}
const config = {
  site_url: siteUrl,
  uri_allow_list: [...[siteUrl, ...extras].map((u) => `${u}/**`), ...appUrls].join(","),
};
for (const name of TEMPLATES) {
  const { subject, content } = template(name);
  config[`mailer_subjects_${name}`] = subject;
  config[`mailer_templates_${name}_content`] = content;
}
if (smtp) {
  Object.assign(config, {
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: RESEND_SMTP_KEY,
    smtp_admin_email: `notifications@${new URL(siteUrl).hostname}`,
    smtp_sender_name: "MENAO",
    // Avec un SMTP personnalisé, la limite par défaut (2 par heure) ne s'applique plus.
    rate_limit_email_sent: 100,
  });
}

const visible = Object.fromEntries(
  Object.entries(config).map(([k, v]) => [
    k,
    k === "smtp_pass" ? "(masquée)" : k.includes("_content") ? `${v.length} caractères` : v,
  ]),
);
console.log(`Projet ${project} :`, visible);
if (args["dry-run"] === "oui") process.exit(0);

const res = await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(config),
});
if (!res.ok) throw new Error(`Supabase a répondu ${res.status} : ${await res.text()}`);
const after = await res.json();
console.log("Appliqué :", {
  site_url: after.site_url,
  uri_allow_list: after.uri_allow_list,
  smtp_host: after.smtp_host,
  smtp_admin_email: after.smtp_admin_email,
  rate_limit_email_sent: after.rate_limit_email_sent,
});
