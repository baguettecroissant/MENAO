// Faux DocuSeal pour les tests e2e (F-13) : création d'une signature depuis un PDF, page de
// signature, webhook signé en HMAC vers l'Edge Function signature-webhook, puis documents signés.
// Aucune requête vers le vrai prestataire en CI. Données entièrement fictives.
import { createHmac } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_DOCUSEAL_PORT ?? 18397);
const API_KEY = "cle-factice-ci";
const WEBHOOK_SECRET = "whsec_menao_ci";
// Le navigateur ouvre la page de signature sur l'hôte ; le webhook part vers Supabase local.
const PUBLIC_URL = `http://localhost:${PORT}`;
const WEBHOOK_URL =
  process.env.MOCK_DOCUSEAL_WEBHOOK_URL ?? "http://127.0.0.1:54321/functions/v1/signature-webhook";

/** Plus petit PDF valide : document signé et journal de preuve fictifs. */
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

/** Soumissions en mémoire : identifiant → { submitter, completed }. */
const submissions = new Map();
let next = 1;

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

async function postWebhook(submission) {
  const body = JSON.stringify({
    event_type: "form.completed",
    timestamp: new Date().toISOString(),
    data: {
      id: submission.submitter.id,
      submission_id: submission.id,
      external_id: submission.submitter.external_id,
      status: "completed",
      completed_at: submission.completed_at,
    },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Docuseal-Signature": `${timestamp}.${signature}`,
    },
    body,
  });
  process.stdout.write(`Faux DocuSeal : webhook ${response.status}\n`);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", PUBLIC_URL);
  // Fichiers téléchargés par l'Edge Function (depuis Docker) : adresse construite sur l'hôte appelé.
  const origin = `http://${req.headers.host ?? `localhost:${PORT}`}`;

  if (req.method === "GET" && url.pathname === "/") return send(res, 200, { ok: true });
  if (req.method === "GET" && url.pathname.startsWith("/files/")) {
    return send(res, 200, PDF, "application/pdf");
  }

  // Page de signature hébergée : un bouton qui signe, envoie le webhook puis redirige.
  const page = url.pathname.match(/^\/s\/([a-z0-9-]+)(\/sign)?$/);
  if (page) {
    const submission = [...submissions.values()].find((s) => s.submitter.slug === page[1]);
    if (!submission) return send(res, 404, "Inconnue", "text/plain; charset=utf-8");
    if (req.method === "GET" && !page[2]) {
      return send(
        res,
        200,
        `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Faux DocuSeal</title>
<h1>Signature du document</h1><form method="post" action="/s/${page[1]}/sign"><button>Signer le document</button></form>`,
        "text/html; charset=utf-8",
      );
    }
    if (req.method === "POST" && page[2]) {
      submission.completed_at = new Date().toISOString();
      await postWebhook(submission);
      res.writeHead(303, { Location: submission.submitter.completed_redirect_url });
      return res.end();
    }
  }

  // API (Edge Functions) : clé obligatoire.
  if (req.headers["x-auth-token"] !== API_KEY)
    return send(res, 401, { error: "Not authenticated" });

  if (req.method === "POST" && url.pathname === "/submissions/pdf") {
    const body = await readJson(req);
    const signer = body.submitters?.[0] ?? {};
    if (!body.documents?.[0]?.file || signer.role !== "Client" || !signer.completed_redirect_url) {
      return send(res, 422, { error: "Requête incomplète" });
    }
    const id = next++;
    const slug = `signature-${id}`;
    const submission = {
      id,
      completed_at: null,
      submitter: {
        id: 1000 + id,
        slug,
        external_id: signer.external_id,
        completed_redirect_url: signer.completed_redirect_url,
      },
    };
    submissions.set(id, submission);
    return send(res, 200, {
      id,
      status: "pending",
      submitters: [
        { id: submission.submitter.id, slug, embed_src: `${PUBLIC_URL}/s/${slug}`, status: "sent" },
      ],
    });
  }

  const get = url.pathname.match(/^\/submissions\/(\d+)$/);
  if (req.method === "GET" && get) {
    const submission = submissions.get(Number(get[1]));
    if (!submission) return send(res, 404, { error: "Not found" });
    return send(res, 200, {
      id: submission.id,
      status: submission.completed_at ? "completed" : "pending",
      completed_at: submission.completed_at,
      audit_log_url: `${origin}/files/audit-${submission.id}.pdf`,
      combined_document_url: null,
      documents: [{ name: "devis", url: `${origin}/files/signed-${submission.id}.pdf` }],
    });
  }

  return send(res, 404, { error: "Not found" });
}).listen(PORT, "0.0.0.0", () => process.stdout.write(`Faux DocuSeal sur le port ${PORT}\n`));
