// Edge Function process-upload (F-05, F-14, F-43) : vérifie un fichier déposé par l'utilisateur dans
// « uploads/<user_id>/<uuid> » (type réel, taille), supprime les métadonnées des images, puis le
// range dans son espace définitif et l'enregistre. Le fichier brut est toujours supprimé.
// TODO [À VALIDER] : analyse antivirus des documents (prestataire à choisir).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MAX_PROJECT_PHOTOS } from "../../../packages/core/src/project.ts";
import {
  MAX_UPLOAD_BYTES,
  MIME_TYPES,
  detectFileType,
  stripImageMetadata,
  type DetectedFileType,
} from "../../../packages/core/src/files.ts";
import { withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_UPLOADS_PER_HOUR = 60;
const MAX_PORTFOLIO_PHOTOS = 12;
const DOCUMENT_TYPES = new Set(["kbis", "decennale", "rc_pro", "identite"]);
const ALLOWED: Record<Purpose, DetectedFileType[]> = {
  document: ["pdf", "jpeg", "png"],
  avatar: ["jpeg", "png"],
  portfolio: ["jpeg", "png"],
  project_photo: ["jpeg", "png"],
};
const EXTENSIONS: Record<DetectedFileType, string> = { pdf: "pdf", jpeg: "jpg", png: "png" };

type Purpose = "document" | "avatar" | "portfolio" | "project_photo";
type DocumentInput = {
  type: string;
  dateEmission?: string | null;
  dateFin?: string | null;
  numero?: string | null;
  assureur?: string | null;
  couverture?: string | null;
};

export type ProcessUploadStatus =
  | "ok"
  | "invalid"
  | "invalid_type"
  | "too_large"
  | "not_found"
  | "locked"
  | "limit"
  | "forbidden"
  | "rate_limited"
  | "unavailable";

function respond(status: ProcessUploadStatus, httpStatus = 200): Response {
  return new Response(JSON.stringify({ status }), {
    status: httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const isoDate = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
const shortText = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return respond("forbidden", 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return respond("forbidden", 403);

    const body = (await req.json().catch(() => null)) as {
      purpose?: string;
      path?: string;
      document?: DocumentInput;
      projectId?: string;
    } | null;
    const purpose = body?.purpose as Purpose | undefined;
    const path = body?.path ?? "";
    if (!purpose || !(purpose in ALLOWED) || !new RegExp(`^${user.id}/${UUID}$`).test(path)) {
      return respond("invalid", 400);
    }

    const { data: allowed } = await admin.rpc("consume_rate_limit", {
      p_key: `process-upload:${user.id}`,
      p_max: MAX_UPLOADS_PER_HOUR,
      p_window_seconds: 3600,
    });
    if (allowed !== true) {
      await admin.storage.from("uploads").remove([path]);
      return respond("rate_limited", 429);
    }

    try {
      const { data: blob, error: downloadError } = await admin.storage
        .from("uploads")
        .download(path);
      if (downloadError || !blob) return respond("not_found", 404);
      if (blob.size > MAX_UPLOAD_BYTES) return respond("too_large", 413);

      let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
      const type = detectFileType(bytes);
      if (!type || !ALLOWED[purpose].includes(type)) return respond("invalid_type", 415);
      if (type !== "pdf") {
        try {
          bytes = stripImageMetadata(bytes, type);
        } catch {
          return respond("invalid_type", 415);
        }
      }
      const file = { bytes, type, name: `${crypto.randomUUID()}.${EXTENSIONS[type]}` };

      if (purpose === "avatar") return await saveAvatar(admin, user.id, file);
      if (purpose === "project_photo") {
        return await saveProjectPhoto(admin, user.id, body?.projectId, file);
      }

      const { data: artisan } = await admin
        .from("artisans")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!artisan) return respond("forbidden", 403);

      return purpose === "portfolio"
        ? await savePortfolioPhoto(admin, artisan.id, file)
        : await saveDocument(admin, artisan, file, body?.document);
    } catch (error) {
      console.error("process-upload : erreur", error instanceof Error ? error.name : "");
      return respond("unavailable", 503);
    } finally {
      await admin.storage.from("uploads").remove([path]);
    }
  }),
);

type CleanFile = { bytes: Uint8Array; type: DetectedFileType; name: string };

async function store(admin: SupabaseClient, bucket: string, path: string, file: CleanFile) {
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, file.bytes, { contentType: MIME_TYPES[file.type], upsert: false });
  if (error) throw error;
}

async function saveAvatar(admin: SupabaseClient, userId: string, file: CleanFile) {
  const path = `${userId}/${file.name}`;
  await store(admin, "avatars", path, file);
  const { data: previous } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", userId)
    .single();
  const { error } = await admin
    .from("profiles")
    .update({ avatar_path: path })
    .eq("user_id", userId);
  if (error) throw error;
  if (previous?.avatar_path) await admin.storage.from("avatars").remove([previous.avatar_path]);
  return respond("ok");
}

// Photos du projet d'un particulier (F-05, F-07), session anonyme comprise.
async function saveProjectPhoto(
  admin: SupabaseClient,
  userId: string,
  projectId: string | undefined,
  file: CleanFile,
) {
  if (!projectId || !new RegExp(`^${UUID}$`).test(projectId)) return respond("invalid", 400);
  const { data: project } = await admin
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!project) return respond("forbidden", 403);
  if (project.status !== "brouillon" && project.status !== "criteres_valides") {
    return respond("locked", 409);
  }
  const { count } = await admin
    .from("project_photos")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if ((count ?? 0) >= MAX_PROJECT_PHOTOS) return respond("limit", 409);
  const path = `${projectId}/${file.name}`;
  await store(admin, "project-photos", path, file);
  const { error } = await admin
    .from("project_photos")
    .insert({ project_id: projectId, storage_path: path, sort_order: count ?? 0 });
  if (error) {
    await admin.storage.from("project-photos").remove([path]);
    throw error;
  }
  return respond("ok");
}

async function savePortfolioPhoto(admin: SupabaseClient, artisanId: string, file: CleanFile) {
  const { count } = await admin
    .from("artisan_photos")
    .select("id", { count: "exact", head: true })
    .eq("artisan_id", artisanId);
  if ((count ?? 0) >= MAX_PORTFOLIO_PHOTOS) return respond("limit", 409);
  const path = `${artisanId}/${file.name}`;
  await store(admin, "portfolio", path, file);
  const { error } = await admin
    .from("artisan_photos")
    .insert({ artisan_id: artisanId, storage_path: path, sort_order: count ?? 0 });
  if (error) throw error;
  return respond("ok");
}

async function saveDocument(
  admin: SupabaseClient,
  artisan: { id: string; status: string },
  file: CleanFile,
  doc: DocumentInput | undefined,
) {
  // Brouillon ou refus : le dépôt remplace le document du même type. Artisan validé ou suspendu :
  // c'est un renouvellement (F-51), le document validé en cours est conservé jusqu'à la
  // validation du nouveau. Pendant la vérification du dossier, les documents sont figés.
  const onboarding = artisan.status === "brouillon" || artisan.status === "refuse";
  const renewal = artisan.status === "valide" || artisan.status === "suspendu";
  if (!onboarding && !renewal) return respond("locked", 409);
  if (!doc || !DOCUMENT_TYPES.has(doc.type)) return respond("invalid", 400);

  const path = `${artisan.id}/${doc.type}-${file.name}`;
  await store(admin, "artisan-documents", path, file);

  const { data: previous } = await admin
    .from("artisan_documents")
    .select("id, storage_path")
    .eq("artisan_id", artisan.id)
    .eq("type", doc.type)
    .in("status", onboarding ? ["en_attente", "refuse", "valide"] : ["en_attente", "refuse"]);
  if (previous?.length) {
    await admin
      .from("artisan_documents")
      .delete()
      .in(
        "id",
        previous.map((p) => p.id),
      );
  }

  const { error } = await admin.from("artisan_documents").insert({
    artisan_id: artisan.id,
    type: doc.type,
    storage_path: path,
    mime_type: MIME_TYPES[file.type],
    size_bytes: file.bytes.length,
    date_emission: isoDate(doc.dateEmission),
    date_fin: isoDate(doc.dateFin),
    numero: shortText(doc.numero, 60),
    assureur: shortText(doc.assureur, 120),
    couverture: shortText(doc.couverture, 200),
  });
  if (error) {
    await admin.storage.from("artisan-documents").remove([path]);
    throw error;
  }
  if (previous?.length) {
    await admin.storage.from("artisan-documents").remove(previous.map((p) => p.storage_path));
  }
  return respond("ok");
}
