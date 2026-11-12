// Edge Function tender-sheet (F-136, ADR 0287) : le DPGF Excel d'un appel d'offres.
// - « import » : lit le fichier de l'architecte (bucket privé tender-files), repère la feuille et
//   ses colonnes, propose pour chaque poste le prix d'un ancien devis de l'artisan, et enregistre
//   les lignes (artisan_import_tender_lines, jeton de l'utilisateur : formule et entreprise
//   vérifiées par la base).
// - « export » : réécrit le fichier de l'architecte avec les quantités et prix de l'artisan, sans
//   toucher à sa mise en page ni à ses formules (recalculées à l'ouverture), et ajoute une feuille
//   « Écarts MENAO » quand des quantités ont changé.
// Aucune donnée personnelle dans les journaux (CLAUDE.md règle 11).
import { createClient } from "@supabase/supabase-js";
import {
  type DpgfUnit,
  type PriceHistoryLine,
  suggestTenderPrice,
} from "../../../packages/core/src/dpgf.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { applyTenderPrices, bestSheet, readWorkbook, type Sheet } from "./sheet.ts";

const MAX_PER_HOUR = 60;
const MAX_BYTES = 15 * 1024 * 1024;
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
  const action = body?.action === "import" || body?.action === "export" ? body.action : null;
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
    .select("id, name, source_path, source_kind, sheet")
    .eq("id", tenderId)
    .maybeSingle();
  if (!tender) return json({ status: "not_found" }, 404);
  if (tender.source_kind !== "xlsx" || !tender.source_path) {
    return json({ status: "no_sheet" }, 422);
  }

  // Fichier lu avec la clé serveur, une fois l'accès vérifié.
  const { data: blob } = await admin.storage.from("tender-files").download(tender.source_path);
  if (!blob) return json({ status: "not_found" }, 404);
  if (blob.size > MAX_BYTES) return json({ status: "too_large" }, 413);
  const workbook = await readWorkbook(await blob.arrayBuffer());
  if (!workbook) return json({ status: "unreadable" }, 422);

  if (action === "import") {
    const found = bestSheet(workbook);
    if (!found) return json({ status: "no_header" }, 422);
    const { data: history } = await supabase.rpc("artisan_price_history");
    const prices: PriceHistoryLine[] = (
      (history ?? []) as {
        designation: string;
        unit: DpgfUnit;
        unit_price_ht_cents: number;
        used_on: string;
      }[]
    ).map((h) => ({
      designation: h.designation,
      unit: h.unit,
      unitPriceHtCents: h.unit_price_ht_cents,
      usedOn: h.used_on,
    }));
    const lines = found.parsed.rows.map((row) => {
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
        sheetRow: row.sheetRow,
      };
    });
    const sheet: Sheet = {
      name: found.sheet.name,
      headerRow: found.parsed.headerRow,
      columns: found.parsed.columns,
    };
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
      warnings: found.parsed.warnings,
    });
  }

  // Export : quantités et prix de l'artisan dans le fichier de l'architecte.
  const sheetInfo = tender.sheet as Partial<Sheet> | null;
  const sheet = sheetInfo?.name ? workbook.getWorksheet(sheetInfo.name) : undefined;
  const columns = sheetInfo?.columns;
  if (!sheet || !columns) return json({ status: "no_header" }, 422);
  const { data: rows } = await supabase
    .from("tender_lines")
    .select(
      "code, designation, unit_label, architect_quantity_milli, quantity_milli, unit_price_ht_cents, sheet_row",
    )
    .eq("tender_id", tender.id)
    .eq("kind", "poste")
    .order("position");
  applyTenderPrices(workbook, sheet, columns, rows ?? []);
  const bytes = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(bytes as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="DPGF-${slug(tender.name)}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
});
