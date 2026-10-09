/**
 * Contrôle des fichiers déposés (spec F-43) : type réel d'après la signature binaire et
 * suppression des métadonnées des images (EXIF, GPS, XMP, IPTC, commentaires).
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function process-upload.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type DetectedFileType = "pdf" | "jpeg" | "png";

export const MIME_TYPES: Record<DetectedFileType, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(data: Uint8Array, prefix: number[]): boolean {
  return data.length >= prefix.length && prefix.every((b, i) => data[i] === b);
}

export function detectFileType(data: Uint8Array): DetectedFileType | null {
  if (startsWith(data, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(data, PNG_SIGNATURE)) return "png";
  return null;
}

export function stripImageMetadata(data: Uint8Array, type: "jpeg" | "png"): Uint8Array {
  return type === "jpeg" ? stripJpeg(data) : stripPng(data);
}

/** Segments JPEG conservés avant l'image : APP0 (JFIF), APP2 (profil ICC), APP14 (Adobe). */
const JPEG_KEPT_APP = new Set([0xe0, 0xe2, 0xee]);

function stripJpeg(data: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [data.subarray(0, 2)];
  let i = 2;
  while (i < data.length) {
    if (data[i] !== 0xff) throw new Error("JPEG invalide");
    const marker = data[i + 1];
    if (marker === undefined) throw new Error("JPEG tronqué");
    if (marker === 0xff) {
      i += 1; // octet de remplissage
      continue;
    }
    if (marker === 0xda) {
      // Début des données d'image : tout le reste est conservé tel quel.
      out.push(data.subarray(i));
      break;
    }
    if (i + 3 >= data.length) throw new Error("JPEG tronqué");
    const length = ((data[i + 2] ?? 0) << 8) | (data[i + 3] ?? 0);
    const end = i + 2 + length;
    if (length < 2 || end > data.length) throw new Error("JPEG tronqué");
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const drop = marker === 0xfe || (isApp && !JPEG_KEPT_APP.has(marker));
    if (!drop) out.push(data.subarray(i, end));
    i = end;
  }
  return concat(out);
}

/** Chunks PNG de métadonnées supprimés. */
const PNG_DROPPED = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function stripPng(data: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [data.subarray(0, 8)];
  let i = 8;
  while (i < data.length) {
    if (i + 8 > data.length) throw new Error("PNG tronqué");
    const length =
      (((data[i] ?? 0) << 24) |
        ((data[i + 1] ?? 0) << 16) |
        ((data[i + 2] ?? 0) << 8) |
        (data[i + 3] ?? 0)) >>>
      0;
    const type = String.fromCharCode(...data.subarray(i + 4, i + 8));
    const end = i + 12 + length;
    if (end > data.length) throw new Error("PNG tronqué");
    if (!PNG_DROPPED.has(type)) out.push(data.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return concat(out);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}
