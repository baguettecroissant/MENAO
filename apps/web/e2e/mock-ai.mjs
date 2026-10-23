// Faux serveurs pour les tests e2e : OpenRouter (API Messages compatible Anthropic, transcription
// audio) et Géoplateforme (géocodage appelé par l'Edge Function analyze-need). Aucune requête vers
// un vrai modèle en CI. Données entièrement fictives.
//
// Analyse : « fuite » → plombier à Nice, sûr ; « salle de bains » → plombier à Antibes, avec le
// carreleur en métier complémentaire (ADR 0167) ; « hésitant » → peu sûr au premier modèle, sûr au
// modèle de secours (vérifie le repli) ; « panne » → réponse invalide (vérifie le formulaire vide).
// Dictée de devis (balise <dictee>, F-19) : deux lignes fixes, dont une sans prix dicté.
// Lecture d'un document (photo ou PDF, ADR 0176) : le document attendu, lisible, valable encore
// dix ans (Kbis et URSSAF émis il y a dix jours).
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_AI_PORT ?? 18398);

function analysis(description, model) {
  const fallback = /sonnet/.test(model);
  if (/panne/i.test(description)) return "{ pas du json";
  if (/fuite/i.test(description)) {
    return JSON.stringify({
      metier: "plombier",
      lieu_type: "appartement",
      pieces: ["cuisine"],
      travaux: ["recherche-fuite"],
      surface_tranche: "moins_10",
      ville: "Nice",
      code_postal: "06000",
      adresse: null,
      date_souhaitee: null,
      urgence: true,
      resume: "Réparer une fuite sous l'évier de la cuisine.",
      budget_tranche: null,
      metiers_complementaires: [],
      brief_artisan:
        "Fuite sous l'évier de la cuisine d'un appartement à Nice, à traiter en urgence. À préciser lors de la visite : origine de la fuite et état des raccords.",
      confiance: 0.93,
    });
  }
  if (/salle de bains/i.test(description)) {
    return JSON.stringify({
      metier: "plombier",
      lieu_type: "appartement",
      pieces: ["salle-de-bain"],
      travaux: ["sanitaires"],
      surface_tranche: "moins_10",
      ville: "Antibes",
      code_postal: "06600",
      adresse: null,
      date_souhaitee: null,
      urgence: false,
      resume: "Refaire entièrement la salle de bains.",
      budget_tranche: null,
      metiers_complementaires: [{ metier: "carreleur", travaux: ["faience"] }],
      brief_artisan:
        "Rénovation complète d'une petite salle de bains d'appartement à Antibes. À préciser lors de la visite : équipements à remplacer et état des évacuations.",
      confiance: 0.9,
    });
  }
  return JSON.stringify({
    metier: fallback ? "peintre" : null,
    lieu_type: null,
    pieces: ["salon"],
    travaux: [],
    surface_tranche: null,
    ville: null,
    code_postal: null,
    adresse: null,
    date_souhaitee: null,
    urgence: false,
    resume: "Travaux de peinture.",
    budget_tranche: null,
    brief_artisan: null,
    metiers_complementaires: [],
    confiance: fallback ? 0.8 : 0.3,
  });
}

function quoteLines() {
  return JSON.stringify({
    lignes: [
      {
        type: "materiel",
        designation: "Siphon PVC 40 mm",
        description: null,
        quantite: 1,
        unite: "u",
        prix_unitaire_ht: 12.5,
        tva: 10,
      },
      {
        type: "main_oeuvre",
        designation: "Recherche de fuite",
        description: "Contrôle des raccords",
        quantite: 1.5,
        unite: "h",
        prix_unitaire_ht: null,
        tva: null,
      },
    ],
  });
}

function documentReading(content) {
  const expected = /Document attendu : (\w+)/.exec(JSON.stringify(content))?.[1] ?? "autre";
  const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  return JSON.stringify({
    type_document: expected,
    lisible: true,
    date_emission: day(-10),
    date_fin: day(3650),
    assureur: "Assurances Fictives",
    numero: "LU-0001",
    couverture: "France métropolitaine",
    siren: null,
  });
}

function geocoding(url) {
  const q = url.searchParams.get("q") ?? "";
  const municipality = url.searchParams.get("type") === "municipality";
  // Nice, et Antibes pour le chantier à plusieurs métiers (ADR 0170).
  const towns = [
    { match: /nice/i, label: "Nice", citycode: "06088", postcode: "06000", at: [7.26, 43.7] },
    {
      match: /antibes/i,
      label: "Antibes",
      citycode: "06004",
      postcode: "06600",
      at: [7.1255, 43.5804],
    },
  ];
  const features = municipality
    ? towns
        .filter((town) => town.match.test(q))
        .map((town) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: town.at },
          properties: {
            label: town.label,
            city: town.label,
            citycode: town.citycode,
            postcode: town.postcode,
            score: 0.95,
            type: "municipality",
          },
        }))
    : [];
  return { type: "FeatureCollection", features };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/") return send(200, { ok: true });
  if (url.pathname === "/search") return send(200, geocoding(url));

  if (!/^Bearer \S+/.test(req.headers.authorization ?? "")) {
    return send(401, { error: { message: "Unauthorized" } });
  }
  const body = await readJson(req);

  if (req.method === "POST" && url.pathname === "/v1/messages") {
    // Comme la vraie API : Sonnet 5.5 refuse le raisonnement désactivé.
    if (/sonnet/.test(body?.model ?? "") && body?.thinking?.type === "disabled") {
      return send(400, {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "Reasoning is mandatory for this endpoint and cannot be disabled.",
        },
      });
    }
    const content = body?.messages?.[0]?.content;
    const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
    const document =
      Array.isArray(content) &&
      content.some((block) => block?.type === "image" || block?.type === "document");
    return send(200, {
      id: "msg_mock",
      type: "message",
      role: "assistant",
      model: body?.model ?? "mock",
      content: [
        {
          type: "text",
          text: document
            ? documentReading(content)
            : text.includes("<dictee>")
              ? quoteLines()
              : analysis(text, body?.model ?? ""),
        },
      ],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 120, output_tokens: 80 },
    });
  }

  if (req.method === "POST" && url.pathname === "/v1/audio/transcriptions") {
    if (typeof body?.input_audio?.data !== "string") return send(400, { error: "audio" });
    return send(200, { text: "Fuite sous l'évier de la cuisine à Nice.", usage: { seconds: 3 } });
  }

  return send(404, { error: "not found" });
}).listen(PORT, "0.0.0.0", () => process.stdout.write(`Faux serveur IA sur le port ${PORT}\n`));
