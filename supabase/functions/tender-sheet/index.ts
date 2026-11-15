// Edge Function tender-sheet (F-136, F-137, ADR 0287, 0288) : le DPGF d'un appel d'offres.
// - « import » : lit le fichier de l'architecte (bucket privé tender-files) : Excel (feuille et
//   colonnes repérées) ou PDF (lu par un modèle de langage, pdf.ts). Propose pour chaque poste le
//   prix de la bibliothèque d'ouvrages de l'artisan ou d'un ancien devis (ADR 0294), et enregistre
//   les lignes (artisan_import_tender_lines, jeton de l'utilisateur : formule et entreprise
//   vérifiées par la base).
// - « export » : réécrit le fichier Excel de l'architecte avec les quantités et prix de l'artisan,
//   sans toucher à sa mise en page ni à ses formules (recalculées à l'ouverture), et ajoute une
//   feuille « Écarts MENAO » quand des quantités ont changé. DPGF venu d'un PDF : un classeur
//   MENAO au même contenu.
// - « plan » : appel d'offres créé depuis les plans (F-140, ADR 0291) : les plans déposés (PDF et
//   photos) sont lus par un modèle de langage (plan.ts), et le relevé (pièces, éléments comptés)
//   est enregistré (artisan_import_plan_reading, jeton de l'utilisateur).
//   Export d'un DPGF créé depuis les plans : classeur MENAO, après « J'ai vérifié les quantités »
//   (ADR 0292).
// Aucune donnée personnelle dans les journaux (CLAUDE.md règle 11).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type DpgfRow,
  type DpgfUnit,
  type PriceHistoryLine,
  suggestTenderPrice,
} from "../../../packages/core/src/dpgf.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { readDpgfPdf } from "./pdf.ts";
import {
  estimatesFromTraces,
  type PlanTrace,
  traceTargets,
} from "../../../packages/core/src/plan-measure.ts";
import {
  DEMOLITION_LOT,
  finishesFromNotes,
  idleLots,
  MAX_NOTE_IMAGES,
  type PlanNoteImage,
  planNoteWorks,
  planPageRole,
  planRoomNotes,
  projectPages,
} from "../../../packages/core/src/plan-notes.ts";
import { MAX_TILES_PER_READING } from "../../../packages/core/src/plan-tiles.ts";
import { MAX_PLAN_WORKS } from "../../../packages/core/src/plan-works.ts";
import { TRACE_TIMEOUT_MS, tracePlan } from "./contours.ts";
import { NOTES_TIMEOUT_MS, readPlanNotes } from "./notes.ts";
import { readPlanSymbols, SYMBOLS_TIMEOUT_MS } from "./symbols.ts";
import {
  ELECTRICAL_SYMBOLS,
  electricalPages,
  fixtureCounts,
  type FoundSymbol,
  imageSize,
  MAX_SYMBOLS,
  mergeSymbolReadings,
  normalizeSymbols,
  type PlanSymbol,
  symbolsInRooms,
} from "../../../packages/core/src/plan-symbols.ts";
import { type PlanFile, type PlanFileTile, readPlans } from "./plan.ts";
import {
  applyTenderPrices,
  bestSheet,
  buildTenderWorkbook,
  readWorkbook,
  type Sheet,
} from "./sheet.ts";

const MAX_PER_HOUR = 60;
/** Lectures de PDF par le modèle : plus coûteuses, limitées à part. */
const MAX_PDF_PER_HOUR = 20;
const MAX_BYTES = 15 * 1024 * 1024;
/** Plans envoyés ensemble au modèle : sous la limite d'une requête une fois encodés. */
const MAX_PLAN_BYTES = 20 * 1024 * 1024;
/** Photo envoyée au modèle : 5 Mo au plus (le navigateur la réduit avant l'envoi). */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "appel-d-offres";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const admin = adminClient();
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
  const user = userData?.user;
  if (!user) return json({ status: "forbidden" }, 401);

  const body = (await req.json().catch(() => null)) as {
    action?: unknown;
    tenderId?: unknown;
  } | null;
  const action =
    body?.action === "import" || body?.action === "export" || body?.action === "plan"
      ? body.action
      : null;
  const tenderId =
    typeof body?.tenderId === "string" && UUID.test(body.tenderId) ? body.tenderId : null;
  if (!action || !tenderId) return json({ status: "invalid" }, 400);

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `tender-sheet:${user.id}`,
    p_max: MAX_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  // Appel d'offres lu avec le jeton de l'utilisateur : la base décide de l'accès.
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
  });
  const { data: tender } = await supabase
    .from("tenders")
    .select(
      "id, name, source_path, source_kind, sheet, plan_files, plan_trades, quantities_checked_at",
    )
    .eq("id", tenderId)
    .maybeSingle();
  if (!tender) return json({ status: "not_found" }, 404);
  if (action === "plan") return await readTenderPlans(admin, supabase, user.id, tender);
  const filename = `DPGF-${slug(tender.name)}.xlsx`;
  // DPGF créé depuis les plans (ADR 0292) : classeur MENAO, seulement après « J'ai vérifié les
  // quantités » (l'artisan en reste responsable au forfait).
  if (action === "export" && tender.source_kind === "plan") {
    if (!tender.quantities_checked_at) return json({ status: "not_checked" }, 409);
    const rows = await tenderRows(supabase, tender.id);
    return xlsxResponse(
      (await buildTenderWorkbook(tender.name, rows).xlsx.writeBuffer()) as ArrayBuffer,
      filename,
    );
  }
  if (!tender.source_path || (tender.source_kind !== "xlsx" && tender.source_kind !== "pdf")) {
    return json({ status: "no_sheet" }, 422);
  }

  // Fichier lu avec la clé serveur, une fois l'accès vérifié.
  const { data: blob } = await admin.storage.from("tender-files").download(tender.source_path);
  if (!blob) return json({ status: "not_found" }, 404);
  if (blob.size > MAX_BYTES) return json({ status: "too_large" }, 413);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (action === "import") {
    let rows: DpgfRow[];
    let warnings: string[];
    let sheet: Sheet | Record<string, never> = {};
    if (tender.source_kind === "pdf") {
      // « %PDF » en tête : le bucket n'a vérifié que le type annoncé par le navigateur.
      if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
        return json({ status: "unreadable" }, 422);
      }
      const { data: pdfAllowed } = await admin.rpc("consume_rate_limit", {
        p_key: `tender-pdf:${user.id}`,
        p_max: MAX_PDF_PER_HOUR,
        p_window_seconds: 3600,
      });
      if (pdfAllowed !== true) return json({ status: "rate_limited" }, 429);
      const reading = await readDpgfPdf(admin, bytes);
      if (reading.status !== "ok") {
        return json({ status: reading.status }, reading.status === "unavailable" ? 503 : 422);
      }
      rows = reading.rows;
      warnings = reading.warnings;
    } else {
      const workbook = await readWorkbook(bytes.buffer as ArrayBuffer);
      if (!workbook) return json({ status: "unreadable" }, 422);
      const found = bestSheet(workbook);
      if (!found) return json({ status: "no_header" }, 422);
      rows = found.parsed.rows;
      warnings = found.parsed.warnings;
      sheet = {
        name: found.sheet.name,
        headerRow: found.parsed.headerRow,
        columns: found.parsed.columns,
      };
    }
    const { data: history } = await supabase.rpc("artisan_price_history");
    const prices: PriceHistoryLine[] = (
      (history ?? []) as {
        designation: string;
        unit: DpgfUnit;
        unit_price_ht_cents: number;
        used_on: string;
        source: string;
      }[]
    ).map((h) => ({
      designation: h.designation,
      unit: h.unit,
      unitPriceHtCents: h.unit_price_ht_cents,
      usedOn: h.used_on,
      source: h.source === "bibliotheque" ? ("bibliotheque" as const) : ("devis" as const),
    }));
    const lines = rows.map((row) => {
      const suggestion = row.kind === "poste" ? suggestTenderPrice(row, prices) : null;
      return {
        kind: row.kind,
        code: row.code,
        designation: row.designation,
        lot: row.lot,
        unitLabel: row.unitLabel,
        unit: row.unit,
        quantityMilli: row.quantityMilli,
        unitPriceHtCents: suggestion?.unitPriceHtCents ?? null,
        priceReference: suggestion?.reference ?? null,
        priceSource: suggestion?.source ?? null,
        sheetRow: row.sheetRow,
      };
    });
    const { error } = await supabase.rpc("artisan_import_tender_lines", {
      p_tender_id: tender.id,
      p_sheet: sheet,
      p_lines: lines,
    });
    if (error) {
      console.error("tender-sheet : import refusé", error.code);
      return json(
        { status: error.code === "42501" ? "forbidden" : "error" },
        error.code === "42501" ? 403 : 500,
      );
    }
    const posts = lines.filter((l) => l.kind === "poste");
    return json({
      status: "ok",
      posts: posts.length,
      priced: posts.filter((l) => l.unitPriceHtCents !== null).length,
      warnings,
    });
  }

  // Export : quantités et prix de l'artisan.
  const rows = await tenderRows(supabase, tender.id);
  let output: ArrayBuffer;
  if (tender.source_kind === "pdf") {
    output = (await buildTenderWorkbook(tender.name, rows).xlsx.writeBuffer()) as ArrayBuffer;
  } else {
    const workbook = await readWorkbook(bytes.buffer as ArrayBuffer);
    if (!workbook) return json({ status: "unreadable" }, 422);
    const sheetInfo = tender.sheet as Partial<Sheet> | null;
    const sheet = sheetInfo?.name ? workbook.getWorksheet(sheetInfo.name) : undefined;
    const columns = sheetInfo?.columns;
    if (!sheet || !columns) return json({ status: "no_header" }, 422);
    applyTenderPrices(
      workbook,
      sheet,
      columns,
      rows.filter((r) => r.kind === "poste"),
    );
    output = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  }
  return xlsxResponse(output, filename);
});

/** Lignes du DPGF, lues avec le jeton de l'utilisateur. */
async function tenderRows(supabase: SupabaseClient, tenderId: string) {
  const { data } = await supabase
    .from("tender_lines")
    .select(
      "kind, code, designation, unit_label, architect_quantity_milli, quantity_milli, unit_price_ht_cents, sheet_row",
    )
    .eq("tender_id", tenderId)
    .order("position");
  return (data ?? []) as {
    kind: string;
    code: string | null;
    designation: string;
    unit_label: string | null;
    architect_quantity_milli: number | null;
    quantity_milli: number | null;
    unit_price_ht_cents: number | null;
    sheet_row: number | null;
  }[];
}

function xlsxResponse(output: ArrayBuffer, filename: string): Response {
  return new Response(new Uint8Array(output), {
    headers: {
      // Type binaire générique : supabase-js ne rend un Blob que pour octet-stream et PDF (sinon du
      // texte, qui abîme le classeur) ; la route du site rétablit le type Excel.
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Durée laissée à la lecture puis aux tracés, sous la limite d'une Edge Function (150 s). */
const FUNCTION_BUDGET_MS = 140_000;
/** En dessous, la seconde lecture des symboles sur les zones agrandies n'est pas lancée. */
const MIN_ZONE_MS = 45_000;
/** En dessous, il ne reste pas le temps de tracer : le relevé est rendu sans estimation. */
const MIN_TRACE_MS = 35_000;

const MAGIC: Record<PlanFile["kind"], number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
};

/** Lecture des plans d'un appel d'offres créé depuis les plans, et enregistrement du relevé. */
async function readTenderPlans(
  admin: SupabaseClient,
  supabase: SupabaseClient,
  userId: string,
  tender: { id: string; source_kind: string | null; plan_files: unknown; plan_trades: unknown },
): Promise<Response> {
  const entries = Array.isArray(tender.plan_files)
    ? (tender.plan_files as {
        path?: unknown;
        kind?: unknown;
        tiles?: unknown;
        pages?: unknown;
        symbolZones?: unknown;
      }[])
    : [];
  if (tender.source_kind !== "plan" || entries.length === 0) {
    return json({ status: "no_sheet" }, 422);
  }
  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `tender-pdf:${userId}`,
    p_max: MAX_PDF_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const files: PlanFile[] = [];
  // Zones agrandies des symboles (ADR 0338) : lues seulement sur les plans d'électricité.
  const symbolZones: {
    file: number;
    page: number;
    path: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }[] = [];
  entries.forEach((entry, i) => {
    const list = Array.isArray(entry.symbolZones) ? entry.symbolZones.slice(0, 48) : [];
    for (const z of list as Record<string, unknown>[]) {
      const [page, x, y, w, h] = [z.page, z.x, z.y, z.w, z.h];
      if (
        typeof z.path === "string" &&
        [page, x, y, w, h].every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0) &&
        (w as number) > 0 &&
        (h as number) > 0
      ) {
        symbolZones.push({
          file: i + 1,
          page: page as number,
          path: z.path,
          x: x as number,
          y: y as number,
          w: w as number,
          h: h as number,
        });
      }
    }
  });
  let total = 0;
  let zoneCount = 0;
  for (const entry of entries) {
    const kind =
      entry.kind === "pdf" || entry.kind === "jpg" || entry.kind === "png" ? entry.kind : null;
    if (!kind || typeof entry.path !== "string") return json({ status: "unreadable" }, 422);
    const { data: blob } = await admin.storage.from("tender-files").download(entry.path);
    if (!blob) return json({ status: "not_found" }, 404);
    total += blob.size;
    if (total > MAX_PLAN_BYTES || (kind !== "pdf" && blob.size > MAX_PHOTO_BYTES)) {
      return json({ status: "too_large" }, 413);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Signature du fichier : le bucket n'a vérifié que le type annoncé par le navigateur.
    if (!MAGIC[kind].every((byte, i) => bytes[i] === byte)) {
      return json({ status: "unreadable" }, 422);
    }
    // Zones agrandies d'une photo (ADR 0325) : lues tant que la requête garde sa taille ; une zone
    // manquante ou abîmée est laissée de côté, la vue d'ensemble suffit à lire le plan.
    const tiles: PlanFileTile[] = [];
    const zones = kind !== "pdf" && Array.isArray(entry.tiles) ? entry.tiles.slice(0, 6) : [];
    for (const zone of zones as Record<string, unknown>[]) {
      const [col, row, cols, rows] = [zone.col, zone.row, zone.cols, zone.rows].map((n) =>
        typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 3 ? n : null,
      );
      if (typeof zone.path !== "string" || !col || !row || !cols || !rows) continue;
      if (zoneCount >= MAX_TILES_PER_READING) break;
      const { data: tileBlob } = await admin.storage.from("tender-files").download(zone.path);
      if (!tileBlob || tileBlob.size > MAX_PHOTO_BYTES) continue;
      if (total + tileBlob.size > MAX_PLAN_BYTES) break;
      const tileBytes = new Uint8Array(await tileBlob.arrayBuffer());
      if (!MAGIC.jpg.every((byte, i) => tileBytes[i] === byte)) continue;
      total += tileBlob.size;
      zoneCount++;
      tiles.push({ col, row, cols, rows, bytes: tileBytes });
    }
    // Pages d'un PDF rendues en images (ADR 0328) : gardées pour le tracé ; une page manquante ou
    // abîmée est laissée de côté.
    const pageImages: { page: number; bytes: Uint8Array }[] = [];
    const rendered = kind === "pdf" && Array.isArray(entry.pages) ? entry.pages.slice(0, 12) : [];
    for (const item of rendered as Record<string, unknown>[]) {
      const page = item.page;
      if (typeof item.path !== "string" || typeof page !== "number" || !Number.isInteger(page)) {
        continue;
      }
      const { data: pageBlob } = await admin.storage.from("tender-files").download(item.path);
      if (!pageBlob || pageBlob.size > MAX_PHOTO_BYTES) continue;
      const pageBytes = new Uint8Array(await pageBlob.arrayBuffer());
      if (!MAGIC.jpg.every((byte, i) => pageBytes[i] === byte)) continue;
      pageImages.push({ page, bytes: pageBytes });
    }
    files.push({ kind, bytes, tiles, pageImages });
  }

  // Métiers de l'appel d'offres (codes de la table des métiers) : lots où ranger les ouvrages.
  const trades = Array.isArray(tender.plan_trades)
    ? tender.plan_trades.filter(
        // Le lot « Démolition » n'est pas un métier : il n'est pas proposé à la lecture.
        (c): c is string =>
          typeof c === "string" && /^[a-z0-9-]{1,60}$/.test(c) && c !== DEMOLITION_LOT,
      )
    : [];
  const started = Date.now();
  // Images des plans : photos, et pages de PDF rendues en images (ADR 0328).
  const images = files.flatMap((file, i) =>
    file.kind === "pdf"
      ? (file.pageImages ?? []).map((p) => ({
          file: i + 1,
          page: p.page,
          bytes: p.bytes,
          mediaType: "image/jpeg" as const,
        }))
      : [
          {
            file: i + 1,
            page: 1,
            bytes: file.bytes,
            mediaType: file.kind === "png" ? ("image/png" as const) : ("image/jpeg" as const),
          },
        ],
  );
  // Ouvrages écrits (ADR 0330) : une lecture par image, lancée en même temps que la lecture des
  // plans pour tenir dans le temps de la fonction. Une lecture en échec ne retire que ses notes.
  const notesPending = Promise.all(
    images.slice(0, MAX_NOTE_IMAGES).map((image) =>
      readPlanNotes(
        admin,
        image.bytes,
        image.mediaType,
        Math.min(NOTES_TIMEOUT_MS, FUNCTION_BUDGET_MS - 25_000),
      )
        .then((raw): PlanNoteImage | null =>
          raw ? { file: image.file, page: image.page, raw } : null,
        )
        .catch(() => null),
    ),
  );
  // Symboles (ADR 0336) : une lecture du plan entier par image, en même temps que le reste.
  const symbolsPending = Promise.all(
    images.slice(0, MAX_NOTE_IMAGES).map(async (image) => {
      const size = imageSize(image.bytes);
      if (!size) return null;
      const raw = await readPlanSymbols(
        admin,
        image.bytes,
        image.mediaType,
        size.width,
        size.height,
        Math.min(SYMBOLS_TIMEOUT_MS, FUNCTION_BUDGET_MS - 25_000),
      ).catch(() => null);
      if (!raw) return null;
      const found = normalizeSymbols(raw, size.width, size.height);
      // Seconde lecture sur les zones agrandies (ADR 0338) : seulement pour un plan qui porte des
      // symboles électriques, et s'il reste le temps de la faire.
      const zones = symbolZones.filter((z) => z.file === image.file && z.page === image.page);
      const left = FUNCTION_BUDGET_MS - (Date.now() - started) - 10_000;
      let zoneFound: FoundSymbol[] | null = null;
      if (
        zones.length > 0 &&
        left >= MIN_ZONE_MS &&
        found.filter((f) => ELECTRICAL_SYMBOLS.includes(f.type)).length >= 5
      ) {
        const read = await Promise.all(
          zones.map(async (z) => {
            const { data: blob } = await admin.storage.from("tender-files").download(z.path);
            if (!blob || blob.size > MAX_PHOTO_BYTES) return null;
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const zoneSize = imageSize(bytes);
            if (!zoneSize) return null;
            const zoneRaw = await readPlanSymbols(
              admin,
              bytes,
              "image/jpeg",
              zoneSize.width,
              zoneSize.height,
              Math.min(SYMBOLS_TIMEOUT_MS, left),
            ).catch(() => null);
            return zoneRaw
              ? normalizeSymbols(zoneRaw, zoneSize.width, zoneSize.height, {
                  x: z.x,
                  y: z.y,
                  scale: zoneSize.width / z.w,
                })
              : null;
          }),
        );
        // Une zone manquante fausserait la fusion : la seconde lecture ne compte que complète.
        if (read.every((r) => r !== null)) zoneFound = read.flat() as FoundSymbol[];
      }
      return {
        file: image.file,
        page: image.page,
        ...size,
        found,
        zoneFound,
        legend: (Array.isArray(raw.legende) ? raw.legende : [])
          .filter((l): l is string => typeof l === "string")
          .map((l) => l.trim().slice(0, 160))
          .filter(Boolean)
          .slice(0, 12),
      };
    }),
  );
  const reading = await readPlans(admin, files, trades);
  if (reading.status !== "ok") {
    return json({ status: reading.status }, reading.status === "unavailable" ? 503 : 422);
  }
  const { error } = await supabase.rpc("artisan_import_plan_reading", {
    p_tender_id: tender.id,
    p_rooms: reading.rooms,
    p_counts: reading.counts,
    p_scale: reading.scale,
    p_works: reading.works,
    p_pages: reading.pages,
    p_levels: reading.levels,
  });
  if (error) {
    console.error("tender-sheet : relevé refusé", error.code);
    return json(
      { status: error.code === "42501" ? "forbidden" : "error" },
      error.code === "42501" ? 403 : 500,
    );
  }
  // Mesure à l'échelle (ADR 0326, 0328) : photos et pages de PDF rendues en images. Les pages que
  // la lecture a reconnues comme plans de niveau sont tracées, dans le temps que la lecture a
  // laissé à la fonction ; un tracé en échec ou sans échelle sûre n'estime rien.
  // Existant et projet (ADR 0340) : le type de chaque plan vient de la lecture des notes, attendue
  // au plus 10 s de plus ; un plan de l'existant (démolition) ne sert ni aux tracés ni aux comptes.
  const notesEarly = await Promise.race([
    notesPending,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
  ]);
  const roles = (notesEarly ?? [])
    .filter((n): n is PlanNoteImage => n !== null)
    .map((n) => ({ file: n.file, page: n.page, role: planPageRole(n.raw.type_plan) }));
  const budget = FUNCTION_BUDGET_MS - (Date.now() - started);
  const traced =
    budget < MIN_TRACE_MS
      ? []
      : await Promise.all(
          traceTargets(projectPages(images, roles), reading.pages).map((image) =>
            tracePlan(
              admin,
              image.bytes,
              image.file,
              image.page,
              Math.min(TRACE_TIMEOUT_MS, budget - 5_000),
              // Pièces relevées sur cette image (photo : page 1) : le tracé les cherche par leur nom.
              [
                ...new Set(
                  reading.rooms
                    .filter((r) => r.file === image.file && (r.page ?? 1) === image.page)
                    .map((r) => r.name),
                ),
              ],
            ).catch(() => null),
          ),
        );
  const traces = traced.filter((trace): trace is PlanTrace => trace !== null);
  // Tracés gardés et pièces sans surface estimées ; toujours appelé, pour effacer d'anciens tracés.
  const estimates = estimatesFromTraces(
    reading.rooms.map((r) => ({ name: r.name, file: r.file, page: r.page, areaCm2: r.areaCm2 })),
    traces,
  );
  const { data: estimated, error: traceError } = await supabase.rpc("artisan_import_plan_traces", {
    p_tender_id: tender.id,
    p_traces: traces,
    p_estimates: estimates,
  });
  if (traceError) console.error("tender-sheet : tracés refusés", traceError.code);

  // Ouvrages écrits : quantités tirées des pièces du relevé, estimations comprises.
  const noted = (await notesPending).filter((n): n is PlanNoteImage => n !== null);
  const allRoles = noted.map((n) => ({
    file: n.file,
    page: n.page,
    role: planPageRole(n.raw.type_plan),
  }));
  // Symboles des plans d'électricité, rattachés aux pièces tracées ; toujours enregistrés, pour
  // effacer ceux d'une lecture précédente.
  const read = (await symbolsPending).filter((r) => r !== null);
  const electrical = (found: readonly FoundSymbol[]) =>
    found.filter((f) => ELECTRICAL_SYMBOLS.includes(f.type));
  const projectRead = projectPages(read, allRoles);
  const kept = electricalPages(
    projectRead.map((r) => ({
      file: r.file,
      page: r.page,
      planType: String(
        noted.find((n) => n.file === r.file && n.page === r.page)?.raw.type_plan ?? "",
      ),
      electrical: electrical(r.found).length,
    })),
  );
  const symbols: PlanSymbol[] = symbolsInRooms(
    read
      .filter((r) => kept.some((k) => k.file === r.file && k.page === r.page))
      .flatMap((r) =>
        mergeSymbolReadings(
          electrical(r.found),
          electrical(r.zoneFound ?? []),
          r.width,
          r.height,
        ).map((s) => ({
          ...s,
          file: r.file,
          page: r.page,
        })),
      ),
    traces,
  ).slice(0, MAX_SYMBOLS);
  // Pages comptées : taille de l'image (pour poser les symboles à l'écran) et convention lue.
  const legend = read
    .filter((r) => kept.some((k) => k.file === r.file && k.page === r.page))
    .map((r) => ({
      file: r.file,
      page: r.page,
      width: r.width,
      height: r.height,
      lines: r.legend,
    }));
  const { error: symbolsError } = await supabase.rpc("artisan_import_plan_symbols", {
    p_tender_id: tender.id,
    p_symbols: symbols,
    p_legend: legend,
    // Portes, menuiseries et appareils sanitaires (ADR 0339) : compte du plan le plus complet,
    // repris là où le relevé n'a rien.
    p_counts: fixtureCounts(projectRead),
    // Type de chaque plan lu et son rôle, pour le résumé « MENAO a lu vos plans ».
    p_page_labels: noted.map((n) => ({
      file: n.file,
      page: n.page,
      label: typeof n.raw.type_plan === "string" ? n.raw.type_plan : "",
      role: planPageRole(n.raw.type_plan),
    })),
  });
  if (symbolsError) console.error("tender-sheet : symboles refusés", symbolsError.code);
  const noteWorks = planNoteWorks(
    noted,
    reading.rooms.map((room, i) => {
      const estimate = estimates.find((e) => e.position === i + 1);
      return {
        name: room.name,
        areaCm2: room.areaCm2 ?? estimate?.areaCm2 ?? null,
        estimated: room.areaCm2 === null || room.source === "photo" || room.uncertain,
      };
    }),
    MAX_PLAN_WORKS - reading.works.length,
  );
  let written = 0;
  if (noteWorks.length > 0) {
    const { data: added, error: notesError } = await supabase.rpc("artisan_import_plan_notes", {
      p_tender_id: tender.id,
      p_works: noteWorks,
      // Lots choisis que les plans ne mentionnent pas : décochés par défaut (ADR 0333).
      p_idle: idleLots(
        trades,
        noteWorks,
        noted.map((n) => (typeof n.raw.type_plan === "string" ? n.raw.type_plan : "")),
        symbols.length ? ["electricien"] : [],
      ),
    });
    if (notesError) console.error("tender-sheet : ouvrages écrits refusés", notesError.code);
    else written = typeof added === "number" ? added : 0;
  }
  // Revêtements écrits par pièce (ADR 0331) : notes gardées, étape « Revêtements » pré-remplie.
  const finishes = planRoomNotes(noted, reading.rooms).flatMap((notes, i) =>
    notes
      ? [
          {
            position: i + 1,
            floorNote: notes.floor,
            wallsNote: notes.walls,
            ceilingNote: notes.ceiling,
            ...finishesFromNotes(notes),
          },
        ]
      : [],
  );
  if (finishes.length > 0) {
    const { error: finishError } = await supabase.rpc("artisan_import_plan_finishes", {
      p_tender_id: tender.id,
      p_finishes: finishes,
    });
    if (finishError) console.error("tender-sheet : revêtements lus refusés", finishError.code);
  }
  return json({
    status: "ok",
    estimated: typeof estimated === "number" ? estimated : 0,
    rooms: reading.rooms.length,
    works: reading.works.length + written,
    symbols: symbolsError ? 0 : symbols.length,
    warnings: reading.warnings,
  });
}
