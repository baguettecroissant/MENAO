#!/usr/bin/env node
// Secret client de « Se connecter avec Apple » pour Supabase Auth (ADR 0108), fabriqué sur le
// Mac à partir de la clé .p8 téléchargée chez Apple : un jeton signé (ES256) valable 6 mois au
// plus, la limite fixée par Apple. Aucune dépendance, aucun envoi sur le réseau.
// Le jeton est écrit sur la sortie standard : le copier directement, sans l'afficher.
//
// Usage :
//   node scripts/apple-client-secret.mjs --team <Team ID> --key-id <Key ID> \
//     --client-id fr.menao.web --p8 ~/chemin/AuthKey_XXXXXXXXXX.p8 | pbcopy
// Puis le coller dans Supabase (Authentication, Providers, Apple, « Secret Key (for OAuth) »).
// À refaire avant l'expiration (date affichée sur la sortie d'erreur).
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (acc, cur, i, all) => (cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1]]] : acc),
      [],
    ),
);
const team = args.team?.trim();
const keyId = args["key-id"]?.trim();
const clientId = (args["client-id"] ?? "fr.menao.web").trim();
const p8 = args.p8;
if (!/^[A-Z0-9]{10}$/.test(team ?? ""))
  throw new Error("--team : identifiant d'équipe Apple (10 caractères)");
if (!/^[A-Z0-9]{10}$/.test(keyId ?? ""))
  throw new Error("--key-id : identifiant de la clé (10 caractères)");
if (!p8) throw new Error("--p8 : chemin du fichier AuthKey_….p8");

// 180 jours, juste sous la limite d'Apple (6 mois).
const DAYS = 180;
const now = Math.floor(Date.now() / 1000);
const exp = now + DAYS * 24 * 3600;
const b64url = (value) => Buffer.from(value).toString("base64url");
const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
const payload = b64url(
  JSON.stringify({ iss: team, iat: now, exp, aud: "https://appleid.apple.com", sub: clientId }),
);
const key = createPrivateKey(readFileSync(p8, "utf8"));
// Signature ECDSA au format JWT (r || s, 64 octets), pas au format DER.
const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
  key,
  dsaEncoding: "ieee-p1363",
}).toString("base64url");

process.stdout.write(`${header}.${payload}.${signature}`);
process.stderr.write(
  `Secret Apple créé pour ${clientId}, valable jusqu'au ${new Date(exp * 1000).toLocaleDateString("fr-FR")}.\n`,
);
