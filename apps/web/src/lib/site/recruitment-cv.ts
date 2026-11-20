import { CANDIDATE_CV_MAX_BYTES } from "@menao/core";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { uploadRaw } from "@/lib/upload/client";

export type CvUploadResult =
  { status: "ok"; path: string } | { status: "too_large" | "invalid_type" | "unavailable" };

/**
 * CV d'une candidature (lot 79, ADR 0382), envoyé depuis le navigateur sans passer par Vercel :
 * session anonyme du visiteur, dépôt dans « uploads », puis process-upload vérifie le PDF (type
 * réel, 5 Mo au plus) et le range dans le stockage privé des CV. Renvoie son chemin, rattaché
 * ensuite à la candidature par apply_as_commercial.
 */
export async function uploadCandidateCv(file: File): Promise<CvUploadResult> {
  if (file.size > CANDIDATE_CV_MAX_BYTES) return { status: "too_large" };
  if (file.type && file.type !== "application/pdf") return { status: "invalid_type" };
  const session = await ensureSession();
  if (!session) return { status: "unavailable" };
  const raw = await uploadRaw(session.userId, file);
  if (!raw) return { status: "unavailable" };
  const result = await invokeFunction<{ status: string; path?: string }>(
    session.supabase,
    "process-upload",
    { purpose: "candidate_cv", path: raw },
  );
  if (result.status === "ok" && "path" in result && result.path) {
    return { status: "ok", path: result.path };
  }
  if (result.status === "too_large" || result.status === "invalid_type") {
    return { status: result.status };
  }
  return { status: "unavailable" };
}
