// Faux serveur API Sirene pour les tests e2e : aucune requête vers l'INSEE en CI.
// SIRET commençant par 00008 → entreprise active du bâtiment ; 00009 → entreprise fermée ;
// autre → 404. Données entièrement fictives.
// Aussi l'annuaire RGE de l'ADEME (/rge/lines, ADR 0118) : qualifications fictives pour les SIRET
// commençant par 00008, aucune pour les autres.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_SIRENE_PORT ?? 18399);

function etablissement(siret, active) {
  return {
    header: { statut: 200, message: "ok" },
    etablissement: {
      siren: siret.slice(0, 9),
      siret,
      statutDiffusionEtablissement: "O",
      etablissementSiege: true,
      uniteLegale: {
        etatAdministratifUniteLegale: active ? "A" : "C",
        statutDiffusionUniteLegale: "O",
        denominationUniteLegale: active ? "MENUISERIE EXEMPLE" : "ANCIENNE ENTREPRISE EXEMPLE",
        categorieJuridiqueUniteLegale: "5499",
        activitePrincipaleUniteLegale: "43.32A",
      },
      adresseEtablissement: {
        numeroVoieEtablissement: "1",
        typeVoieEtablissement: "RUE",
        libelleVoieEtablissement: "DE L'EXEMPLE",
        codePostalEtablissement: "06000",
        libelleCommuneEtablissement: "NICE",
        codeCommuneEtablissement: "06088",
      },
      periodesEtablissement: [
        {
          dateFin: null,
          etatAdministratifEtablissement: active ? "A" : "F",
          activitePrincipaleEtablissement: "43.32A",
        },
      ],
    },
  };
}

function rgeLines(siret) {
  if (!siret.startsWith("00008")) return [];
  const common = {
    siret,
    organisme: "qualibat",
    nom_certificat: "QUALIBAT-RGE",
    meta_domaine: "Travaux d'efficacité énergétique",
    particulier: true,
    lien_date_debut: "2025-01-01",
    lien_date_fin: "2099-01-01",
  };
  return [
    {
      ...common,
      code_qualification: "0000D001",
      nom_qualification: "Isolation (0000D001)",
      domaine: "Isolation des combles perdus",
    },
    {
      ...common,
      code_qualification: "0000D002",
      nom_qualification: "Menuiseries (0000D002)",
      domaine: "Fenêtres, volets, portes donnant sur l'extérieur",
    },
  ];
}

createServer((req, res) => {
  const match = /^\/siret\/(\d{14})$/.exec(req.url ?? "");
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.url === "/") return send(200, { ok: true });
  if (req.url?.startsWith("/rge/lines")) {
    const siret = new URL(req.url, "http://localhost").searchParams.get("siret_eq") ?? "";
    const results = rgeLines(siret);
    return send(200, { total: results.length, results });
  }
  if (!req.headers["x-insee-api-key-integration"]) return send(401, { message: "Unauthorized" });
  if (!match) return send(404, { header: { statut: 404, message: "Aucun élément trouvé" } });
  const siret = match[1];
  if (siret.startsWith("00008")) return send(200, etablissement(siret, true));
  if (siret.startsWith("00009")) return send(200, etablissement(siret, false));
  return send(404, {
    header: { statut: 404, message: `Aucun élément trouvé pour le siret ${siret}` },
  });
}).listen(PORT, "0.0.0.0", () => process.stdout.write(`Faux serveur Sirene sur le port ${PORT}\n`));
