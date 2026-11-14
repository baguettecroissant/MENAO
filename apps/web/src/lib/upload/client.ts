import {
  MAX_PDF_PAGE_IMAGES,
  MAX_UPLOAD_BYTES,
  PLAN_SOURCE_SIDE,
  PLAN_VIEW_SIDE,
  planScale,
  planTileGrid,
  type PlanTile,
  TRACE_MAX_PIXELS,
} from "@menao/core";
import { createClient } from "@/lib/supabase/client";

/**
 * Dépose un fichier brut dans « uploads/<userId>/<uuid> ». Il sera vérifié puis rangé par
 * l'Edge Function process-upload (via une Server Action) ; le navigateur n'écrit jamais
 * dans les espaces définitifs.
 */
export async function uploadRaw(userId: string, file: Blob): Promise<string | null> {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return null;
  const path = `${userId}/${crypto.randomUUID()}`;
  const { error } = await createClient()
    .storage.from("uploads")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  return error ? null : path;
}

/**
 * Redimensionne une photo dans le navigateur (côté le plus long ≤ maxSide) et la réencode
 * en JPEG : fichier plus léger (spec §4.4) et sans métadonnées. L'orientation EXIF est
 * appliquée par createImageBitmap. Les métadonnées sont de toute façon retirées côté serveur.
 * Logos : PNG, pour garder la transparence (en JPEG, le fond transparent deviendrait noir).
 * `square` (photo de profil, affichée dans un cercle) : une photo presque carrée est recadrée au
 * centre ; un logo ou un bandeau est gardé entier, centré sur un carré avec une marge, pour que le
 * cercle ne le coupe jamais.
 */
export async function resizeImage(
  file: File,
  maxSide: number,
  {
    type = "image/jpeg",
    quality = 0.85,
    square = false,
  }: { type?: "image/jpeg" | "image/png"; quality?: number; square?: boolean } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const { width, height } = bitmap;
  const ratio = width / height;
  if (square && ratio >= 0.8 && ratio <= 1.25) {
    const crop = Math.min(width, height);
    canvas.width = canvas.height = Math.min(maxSide, crop);
    context?.drawImage(
      bitmap,
      (width - crop) / 2,
      (height - crop) / 2,
      crop,
      crop,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  } else if (square) {
    const side = Math.min(maxSide, Math.max(width, height));
    canvas.width = canvas.height = side;
    if (context && type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, side, side);
    }
    const scale = (side * 0.88) / Math.max(width, height);
    context?.drawImage(
      bitmap,
      (side - width * scale) / 2,
      (side - height * scale) / 2,
      width * scale,
      height * scale,
    );
  } else {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encodage impossible"))),
      type,
      quality,
    ),
  );
}

export type PlanView = { blob: Blob; tile: Pick<PlanTile, "col" | "row" | "cols" | "rows"> | null };

/**
 * Photo d'un plan préparée pour la lecture haute définition (F-159, ADR 0325) : la vue d'ensemble
 * (2 400 px au plus), puis les zones agrandies qui se chevauchent quand la photo est plus grande
 * que ce que le modèle lit en une image. La grille vient de packages/core ; rien n'est agrandi.
 */
export async function planViews(file: File, quality = 0.85): Promise<PlanView[]> {
  const bitmap = await createImageBitmap(file);
  const encode = (sx: number, sy: number, sw: number, sh: number, maxSide: number) => {
    // Jamais plus de pixels que le modèle n'en lit sans réduire l'image : les contours qu'il trace
    // sont alors exprimés dans les pixels de ce fichier (ADR 0326).
    const scale = Math.min(planScale(sw, sh, maxSide), Math.sqrt(TRACE_MAX_PIXELS / (sw * sh)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Encodage impossible"))),
        "image/jpeg",
        quality,
      ),
    );
  };
  const { width, height } = bitmap;
  // Grille calculée sur la photo ramenée à 6 400 px au plus, appliquée à ses pixels d'origine.
  const kept = planScale(width, height, PLAN_SOURCE_SIDE);
  const views: PlanView[] = [
    { blob: await encode(0, 0, width, height, PLAN_VIEW_SIDE), tile: null },
  ];
  for (const t of planTileGrid(Math.round(width * kept), Math.round(height * kept))) {
    views.push({
      blob: await encode(t.x / kept, t.y / kept, t.w / kept, t.h / kept, PLAN_VIEW_SIDE),
      tile: { col: t.col, row: t.row, cols: t.cols, rows: t.rows },
    });
  }
  bitmap.close();
  return views;
}

/**
 * Pages d'un PDF de plans rendues en images dans le navigateur (F-159 lot 4, ADR 0328) : une page
 * peut alors être tracée, affichée avec ses contours et mesurée à la main, comme une photo. Chaque
 * image tient dans ce que le modèle lit sans la réduire. pdf.js n'est chargé qu'ici, au dépôt. Un
 * PDF illisible ou protégé rend une liste vide : le PDF reste lu normalement.
 */
export async function pdfPageViews(
  file: File,
  quality = 0.85,
): Promise<{ page: number; blob: Blob }[]> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const document_ = await task.promise;
    const views: { page: number; blob: Blob }[] = [];
    const count = Math.min(document_.numPages, MAX_PDF_PAGE_IMAGES);
    for (let number = 1; number <= count; number++) {
      const page = await document_.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(
        PLAN_VIEW_SIDE / Math.max(base.width, base.height),
        Math.sqrt(TRACE_MAX_PIXELS / (base.width * base.height)),
      );
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob) views.push({ page: number, blob });
      page.cleanup();
    }
    await task.destroy();
    return views;
  } catch {
    return [];
  }
}

/**
 * Retire un fichier brut de « uploads » quand il ne sera pas envoyé : document remplacé après sa
 * lecture automatique (ADR 0176). Sans conséquence si process-upload l'a déjà retiré.
 */
export async function discardRaw(path: string): Promise<void> {
  await createClient().storage.from("uploads").remove([path]);
}
