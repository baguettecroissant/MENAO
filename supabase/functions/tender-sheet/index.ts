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
import { type PlanFile, readPlans } from "./plan.ts";
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
    .select("id, name, source_path, source_kind, sheet, plan_files, quantities_checked_at")
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
  tender: { id: string; source_kind: string | null; plan_files: unknown },
): Promise<Response> {
  const entries = Array.isArray(tender.plan_files)
    ? (tender.plan_files as { path?: unknown; kind?: unknown }[])
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
  let total = 0;
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
    files.push({ kind, bytes });
  }

  const reading = await readPlans(admin, files);
  if (reading.status !== "ok") {
    return json({ status: reading.status }, reading.status === "unavailable" ? 503 : 422);
  }
  const { error } = await supabase.rpc("artisan_import_plan_reading", {
    p_tender_id: tender.id,
    p_rooms: reading.rooms,
    p_counts: reading.counts,
    p_scale: reading.scale,
  });
  if (error) {
    console.error("tender-sheet : relevé refusé", error.code);
    return json(
      { status: error.code === "42501" ? "forbidden" : "error" },
      error.code === "42501" ? 403 : 500,
    );
  }
  return json({ status: "ok", rooms: reading.rooms.length, warnings: reading.warnings });
}
