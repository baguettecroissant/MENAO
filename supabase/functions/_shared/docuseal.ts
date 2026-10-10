// Prestataire de signature DocuSeal (F-13, décision D8 : signature simple, hébergement UE),
// derrière SignatureProvider. API : https://www.docuseal.com/docs/api — clé dans l'en-tête
// X-Auth-Token. Les champs à remplir sont des balises texte du PDF (quote-pdf.ts). ADR 0022.
import {
  SIGNER_ROLE,
  type CompletedSignature,
  type SignatureProvider,
  type SigningRequest,
  type SigningRequestInput,
} from "../../../packages/core/src/signature.ts";
import { env } from "./env.ts";

type Submitter = { id: number | string; embed_src?: string | null };
type Submission = {
  id: number | string;
  submitters?: Submitter[];
  completed_at?: string | null;
  audit_log_url?: string | null;
  combined_document_url?: string | null;
  documents?: { name: string; url: string }[];
};

const baseUrl = () => (env("DOCUSEAL_API_URL") || "https://api.docuseal.eu").replace(/\/+$/, "");

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "X-Auth-Token": env("DOCUSEAL_API_KEY"),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error(`DocuSeal ${init.method ?? "GET"} ${path} : HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** Code à usage unique avant d'accéder au devis : SMS (par défaut, si le numéro est connu), e-mail ou aucun. */
function verification(phone: string | null): Record<string, boolean> {
  const mode = env("DOCUSEAL_OTP") || "sms";
  if (mode === "aucun") return {};
  return mode === "sms" && phone ? { require_phone_2fa: true } : { require_email_2fa: true };
}

export const docuseal: SignatureProvider = {
  async createSigningRequest(input: SigningRequestInput): Promise<SigningRequest> {
    const response = await call<Submission | Submission[]>("/submissions/pdf", {
      method: "POST",
      body: JSON.stringify({
        name: input.filename.replace(/\.pdf$/i, ""),
        send_email: false,
        expire_at: input.expireAt,
        documents: [{ name: input.filename, file: input.pdfBase64 }],
        submitters: [
          {
            role: SIGNER_ROLE,
            name: input.signer.name,
            email: input.signer.email,
            ...(input.signer.phone ? { phone: input.signer.phone } : {}),
            external_id: input.externalId,
            send_email: false,
            completed_redirect_url: input.completedRedirectUrl,
            ...verification(input.signer.phone),
          },
        ],
      }),
    });
    const submission = Array.isArray(response) ? response[0] : response;
    const submitter = submission?.submitters?.[0];
    if (!submission || !submitter?.embed_src) {
      throw new Error("DocuSeal : réponse sans lien de signature");
    }
    return {
      submissionId: String(submission.id),
      submitterId: String(submitter.id),
      signingUrl: submitter.embed_src,
    };
  },

  async getCompletedSignature(submissionId: string): Promise<CompletedSignature> {
    const submission = await call<Submission>(`/submissions/${encodeURIComponent(submissionId)}`);
    return {
      completedAt: submission.completed_at ?? null,
      documentUrl: submission.combined_document_url ?? submission.documents?.[0]?.url ?? null,
      auditLogUrl: submission.audit_log_url ?? null,
    };
  },
};
