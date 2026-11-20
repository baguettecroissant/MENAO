// Edge Function process-upload (F-05, F-14, F-20, F-22, F-40, F-42, F-43, F-62, F-181, F-183) : vérifie un fichier déposé par l'utilisateur dans
// « uploads/<user_id>/<uuid> » (type réel, taille), supprime les métadonnées des images, puis le
// range dans son espace définitif et l'enregistre. Le fichier brut est toujours supprimé.
// TODO [À VALIDER] : analyse antivirus des documents (prestataire à choisir).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logoImageName } from "../../../packages/core/src/avatar.ts";
import { identitySides, isIdentityPiece } from "../../../packages/core/src/identity-document.ts";
import { messageAttachmentKind } from "../../../packages/core/src/messaging.ts";
import { MAX_PROJECT_PHOTOS } from "../../../packages/core/src/project.ts";
import {
  CANDIDATE_CV_MAX_BYTES,
  MAX_UPLOAD_BYTES,
  MIME_TYPES,
  detectFileType,
  stripImageMetadata,
  type DetectedFileType,
} from "../../../packages/core/src/files.ts";
import { teamArtisanId } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_UPLOADS_PER_HOUR = 60;
const MAX_PORTFOLIO_PHOTOS = 12;
const DOCUMENT_TYPES = new Set(["kbis", "decennale", "rc_pro", "identite", "urssaf"]);
const ALLOWED: Record<Purpose, DetectedFileType[]> = {
  document: ["pdf", "jpeg", "png"],
  avatar: ["jpeg", "png"],
  portfolio: ["jpeg", "png"],
  logo: ["jpeg", "png"],
  image_logo: ["jpeg", "png"],
  project_photo: ["jpeg", "png"],
  chantier_photo: ["jpeg", "png"],
  message_attachment: ["pdf", "jpeg", "png"],
  ticket_photo: ["jpeg", "png"],
  expense_document: ["pdf", "jpeg", "png"],
  candidate_cv: ["pdf"],
};
const EXTENSIONS: Record<DetectedFileType, string> = { pdf: "pdf", jpeg: "jpg", png: "png" };

type Purpose =
  | "document"
  | "avatar"
  | "portfolio"
  | "logo"
  | "image_logo"
  | "project_photo"
  | "chantier_photo"
  | "message_attachment"
  | "ticket_photo"
  | "expense_document"
  | "candidate_cv";
type DocumentInput = {
  type: string;
  dateEmission?: string | null;
  dateFin?: string | null;
  numero?: string | null;
  assureur?: string | null;
  couverture?: string | null;
  /** Décennale : métiers couverts selon l'artisan (ADR 0116). */
  coveredTrades?: unknown;
  /** Pièce d'identité (ADR 0378) : carte d'identité, passeport ou titre de séjour. */
  piece?: unknown;
  /** Pièce d'identité : false si l'artisan refuse sa transmission à Stripe. */
  shareWithStripe?: unknown;
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

function respond(
  status: ProcessUploadStatus,
  httpStatus = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ status, ...extra }), {
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
      /** Pièce d'identité (ADR 0378) : second fichier déposé, le verso. */
      versoPath?: string;
      document?: DocumentInput;
      projectId?: string;
      chantierId?: string;
      ticketId?: string;
      expenseId?: string;
    } | null;
    // « Retirer ma photo » (ADR 0360) : aucun fichier à lire, la photo du compte est supprimée.
    if (body?.purpose === "avatar_remove") {
      try {
        await removeAvatar(admin, user.id);
        return respond("ok");
      } catch (error) {
        console.error(
          "process-upload : retrait de la photo",
          error instanceof Error ? error.name : "",
        );
        return respond("unavailable", 503);
      }
    }
    const purpose = body?.purpose as Purpose | undefined;
    const path = body?.path ?? "";
    if (!purpose || !(purpose in ALLOWED) || !new RegExp(`^${user.id}/${UUID}$`).test(path)) {
      return respond("invalid", 400);
    }
    // Verso d'une pièce d'identité : un second fichier brut, dans le même dossier de dépôt.
    const versoPath = typeof body?.versoPath === "string" ? body.versoPath : null;
    if (
      versoPath !== null &&
      (purpose !== "document" ||
        versoPath === path ||
        !new RegExp(`^${user.id}/${UUID}$`).test(versoPath))
    ) {
      return respond("invalid", 400);
    }
    const rawPaths = versoPath ? [path, versoPath] : [path];

    const { data: allowed } = await admin.rpc("consume_rate_limit", {
      p_key: `process-upload:${user.id}`,
      p_max: MAX_UPLOADS_PER_HOUR,
      p_window_seconds: 3600,
    });
    if (allowed !== true) {
      await admin.storage.from("uploads").remove(rawPaths);
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

      // CV d'une candidature de commercial (ADR 0382) : tout compte, même anonyme (le navigateur
      // du candidat) ; rangé dans son dossier, rattaché ensuite par apply_as_commercial.
      if (purpose === "candidate_cv") {
        if (bytes.length > CANDIDATE_CV_MAX_BYTES) return respond("too_large", 413);
        const cvPath = `${user.id}/${file.name}`;
        await store(admin, "candidate-cvs", cvPath, file);
        return respond("ok", 200, { path: cvPath });
      }

      if (purpose === "avatar") {
        await saveAvatar(admin, user.id, file);
        // Une photo remplace un logo affiché en entier (ADR 0355).
        await admin.from("artisans").update({ image_logo: false }).eq("user_id", user.id);
        return respond("ok");
      }
      if (purpose === "project_photo") {
        return await saveProjectPhoto(admin, user.id, body?.projectId, file);
      }
      if (purpose === "chantier_photo") {
        return await saveChantierPhoto(admin, user.id, body?.chantierId, file);
      }
      if (purpose === "message_attachment") {
        return await saveMessageAttachment(admin, user.id, body?.chantierId, file);
      }
      if (purpose === "ticket_photo") {
        return await saveTicketPhoto(admin, user.id, body?.ticketId, file);
      }

      // Justificatif d'une dépense : patron ou chef d'équipe (ADR 0241), jamais un ouvrier.
      if (purpose === "expense_document") {
        const artisanId = await teamArtisanId(admin, user.id, { managers: true });
        if (!artisanId) return respond("forbidden", 403);
        return await saveExpenseDocument(admin, artisanId, body?.expenseId, file);
      }

      // Logo, réalisations et documents du dossier : le patron seulement.
      const { data: artisan } = await admin
        .from("artisans")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!artisan) return respond("forbidden", 403);

      if (purpose === "logo") {
        await saveLogo(admin, artisan.id, file);
        return respond("ok");
      }
      // « Mon logo » comme image de la fiche (ADR 0355) : le même fichier sert sur la fiche
      // publique, en entier, et en tête des documents.
      if (purpose === "image_logo") {
        await saveLogo(admin, artisan.id, file);
        // Nom préfixé : chaque écran reconnaît un logo à son chemin et le montre en entier (ADR 0357).
        await saveAvatar(admin, user.id, { ...file, name: logoImageName(file.name) });
        const { error } = await admin
          .from("artisans")
          .update({ image_logo: true })
          .eq("id", artisan.id);
        if (error) throw error;
        return respond("ok");
      }
      if (purpose === "portfolio") return await savePortfolioPhoto(admin, artisan.id, file);
      // Verso d'une pièce d'identité : lu et nettoyé comme le recto.
      let verso: CleanFile | null = null;
      if (versoPath) {
        const cleaned = await cleanRawFile(admin, versoPath, ALLOWED.document);
        if (typeof cleaned === "string") {
          return respond(
            cleaned,
            cleaned === "not_found" ? 404 : cleaned === "too_large" ? 413 : 415,
          );
        }
        verso = cleaned;
      }
      return await saveDocument(admin, artisan, file, body?.document, verso);
    } catch (error) {
      console.error("process-upload : erreur", error instanceof Error ? error.name : "");
      return respond("unavailable", 503);
    } finally {
      await admin.storage.from("uploads").remove(rawPaths);
    }
  }),
);

type CleanFile = { bytes: Uint8Array; type: DetectedFileType; name: string };

/**
 * Fichier brut du dossier « uploads », contrôlé comme tout dépôt : taille, type réel lu dans son
 * contenu, données cachées des images retirées. Renvoie le fichier nettoyé, ou le statut du refus.
 */
async function cleanRawFile(
  admin: SupabaseClient,
  path: string,
  allowed: DetectedFileType[],
): Promise<CleanFile | "not_found" | "too_large" | "invalid_type"> {
  const { data: blob, error } = await admin.storage.from("uploads").download(path);
  if (error || !blob) return "not_found";
  if (blob.size > MAX_UPLOAD_BYTES) return "too_large";
  let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
  const type = detectFileType(bytes);
  if (!type || !allowed.includes(type)) return "invalid_type";
  if (type !== "pdf") {
    try {
      bytes = stripImageMetadata(bytes, type);
    } catch {
      return "invalid_type";
    }
  }
  return { bytes, type, name: `${crypto.randomUUID()}.${EXTENSIONS[type]}` };
}

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
}

/** Photo du compte retirée pour de bon : chemin effacé, puis fichier supprimé (ADR 0360). */
async function removeAvatar(admin: SupabaseClient, userId: string) {
  const { data: previous } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", userId)
    .single();
  if (!previous?.avatar_path) return;
  const { error } = await admin
    .from("profiles")
    .update({ avatar_path: null })
    .eq("user_id", userId);
  if (error) throw error;
  // Artisan : l'image de la fiche n'est plus un logo (ADR 0355).
  await admin.from("artisans").update({ image_logo: false }).eq("user_id", userId);
  await admin.storage.from("avatars").remove([previous.avatar_path]);
}

// Logo des documents (ADR 0038). L'ancien logo n'est effacé que s'il n'est repris dans aucun devis
// envoyé : ces documents, et ceux qui en découlent, le gardent.
async function saveLogo(admin: SupabaseClient, artisanId: string, file: CleanFile) {
  const path = `${artisanId}/${file.name}`;
  await store(admin, "artisan-logos", path, file);
  const { data: previous } = await admin
    .from("artisans")
    .select("logo_path")
    .eq("id", artisanId)
    .single();
  const { error } = await admin.from("artisans").update({ logo_path: path }).eq("id", artisanId);
  if (error) throw error;
  if (previous?.logo_path) {
    const { count } = await admin
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .neq("status", "brouillon")
      .eq("document->issuer->>logo_path", previous.logo_path);
    if (count === 0) await admin.storage.from("artisan-logos").remove([previous.logo_path]);
  }
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

// Photos du journal de chantier (F-22). Les règles (artisan du chantier, journal ouvert, 100 photos
// au plus) sont vérifiées par record_chantier_photo ; le fichier est retiré si l'ajout est refusé.
async function saveChantierPhoto(
  admin: SupabaseClient,
  userId: string,
  chantierId: string | undefined,
  file: CleanFile,
) {
  if (!chantierId || !new RegExp(`^${UUID}$`).test(chantierId)) return respond("invalid", 400);
  const path = `${chantierId}/${file.name}`;
  await store(admin, "chantier-photos", path, file);
  const { data: status, error } = await admin.rpc("record_chantier_photo", {
    p_chantier_id: chantierId,
    p_user_id: userId,
    p_storage_path: path,
  });
  if (error || status !== "ok") {
    await admin.storage.from("chantier-photos").remove([path]);
    if (error) throw error;
    return status === "locked" || status === "limit"
      ? respond(status, 409)
      : respond("forbidden", 403);
  }
  return respond("ok");
}

// Pièce jointe de la conversation d'un chantier (F-40) : photo ou document PDF, par une partie.
async function saveMessageAttachment(
  admin: SupabaseClient,
  userId: string,
  chantierId: string | undefined,
  file: CleanFile,
) {
  if (!chantierId || !new RegExp(`^${UUID}$`).test(chantierId)) return respond("invalid", 400);
  const path = `${chantierId}/${file.name}`;
  await store(admin, "message-attachments", path, file);
  const { data: status, error } = await admin.rpc("record_message_attachment", {
    p_chantier_id: chantierId,
    p_user_id: userId,
    p_kind: messageAttachmentKind(file.type),
    p_storage_path: path,
  });
  if (error || status !== "ok") {
    await admin.storage.from("message-attachments").remove([path]);
    if (error) throw error;
    return status === "locked" || status === "limit"
      ? respond(status, 409)
      : respond("forbidden", 403);
  }
  return respond("ok");
}

// Photo d'un signalement (F-42), par son déclarant.
async function saveTicketPhoto(
  admin: SupabaseClient,
  userId: string,
  ticketId: string | undefined,
  file: CleanFile,
) {
  if (!ticketId || !new RegExp(`^${UUID}$`).test(ticketId)) return respond("invalid", 400);
  const path = `${ticketId}/${file.name}`;
  await store(admin, "ticket-photos", path, file);
  const { data: status, error } = await admin.rpc("record_ticket_photo", {
    p_ticket_id: ticketId,
    p_user_id: userId,
    p_storage_path: path,
  });
  if (error || status !== "ok") {
    await admin.storage.from("ticket-photos").remove([path]);
    if (error) throw error;
    return status === "locked" || status === "limit"
      ? respond(status, 409)
      : respond("forbidden", 403);
  }
  return respond("ok");
}

// Pièce d'une dépense (F-62, ADR 0186) : facture ou ticket de l'artisan, dans un espace privé. Une
// nouvelle pièce remplace la précédente.
async function saveExpenseDocument(
  admin: SupabaseClient,
  artisanId: string,
  expenseId: string | undefined,
  file: CleanFile,
) {
  if (!expenseId || !new RegExp(`^${UUID}$`).test(expenseId)) return respond("invalid", 400);
  const { data: expense } = await admin
    .from("expenses")
    .select("id, document_path")
    .eq("id", expenseId)
    .eq("artisan_id", artisanId)
    .maybeSingle();
  if (!expense) return respond("forbidden", 403);
  const path = `${artisanId}/${expenseId}/${file.name}`;
  await store(admin, "expense-documents", path, file);
  const { error } = await admin
    .from("expenses")
    .update({ document_path: path, document_mime: MIME_TYPES[file.type] })
    .eq("id", expenseId);
  if (error) {
    await admin.storage.from("expense-documents").remove([path]);
    throw error;
  }
  if (expense.document_path) {
    await admin.storage.from("expense-documents").remove([expense.document_path]);
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
  verso: CleanFile | null = null,
) {
  // Brouillon ou refus : le dépôt remplace le document du même type. Artisan validé ou suspendu :
  // c'est un renouvellement (F-51), le document validé en cours est conservé jusqu'à la
  // validation du nouveau. Dossier envoyé (inscription progressive, ADR 0376) : les attestations
  // se déposent encore, et une pièce refusée se remplace ; un document déjà validé est gardé,
  // comme pour un renouvellement.
  const onboarding = artisan.status === "brouillon" || artisan.status === "refuse";
  const renewal = artisan.status === "valide" || artisan.status === "suspendu";
  const verification = artisan.status === "en_verification";
  if (!onboarding && !renewal && !verification) return respond("locked", 409);
  if (!doc || !DOCUMENT_TYPES.has(doc.type)) return respond("invalid", 400);
  // Pièce d'identité (ADR 0378) : type de pièce, et verso pour une carte ou un titre de séjour.
  // Sans type (application d'avant F-181) : une pièce en un seul fichier, comme avant.
  const piece = doc.type === "identite" && isIdentityPiece(doc.piece) ? doc.piece : null;
  if (verso && (!piece || !identitySides(piece).includes("verso"))) return respond("invalid", 400);
  if (piece && identitySides(piece).includes("verso") && !verso) return respond("invalid", 400);

  const path = `${artisan.id}/${doc.type}-${file.name}`;
  await store(admin, "artisan-documents", path, file);
  const versoStored = verso ? `${artisan.id}/${doc.type}-verso-${verso.name}` : null;
  if (verso && versoStored) {
    try {
      await store(admin, "artisan-documents", versoStored, verso);
    } catch (error) {
      await admin.storage.from("artisan-documents").remove([path]);
      throw error;
    }
  }
  const stored = versoStored ? [path, versoStored] : [path];

  const { data: previous } = await admin
    .from("artisan_documents")
    .select("id, storage_path, verso_path")
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
    piece,
    verso_path: versoStored,
    verso_mime_type: verso ? MIME_TYPES[verso.type] : null,
    partage_stripe: doc.shareWithStripe !== false,
    covered_trades:
      doc.type === "decennale" && Array.isArray(doc.coveredTrades)
        ? [
            ...new Set(
              doc.coveredTrades.filter(
                (c): c is string => typeof c === "string" && /^[a-z0-9-]{1,60}$/.test(c),
              ),
            ),
          ].slice(0, 30)
        : null,
  });
  if (error) {
    await admin.storage.from("artisan-documents").remove(stored);
    throw error;
  }
  if (previous?.length) {
    await admin.storage
      .from("artisan-documents")
      .remove(
        previous.flatMap((p) => (p.verso_path ? [p.storage_path, p.verso_path] : [p.storage_path])),
      );
  }
  return respond("ok");
}
