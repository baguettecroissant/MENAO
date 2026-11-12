// Lecture et réécriture du classeur Excel d'un DPGF (Edge Function tender-sheet, ADR 0287).
import ExcelJS from "exceljs";
import {
  type DpgfCell,
  type DpgfColumns,
  type ParsedDpgf,
  parseDpgfGrid,
} from "../../../packages/core/src/dpgf.ts";

const MAX_ROWS = 3000;
const MAX_COLUMNS = 30;

export type Sheet = { name: string; headerRow: number; columns: DpgfColumns };

/** Valeur lisible d'une cellule exceljs : formule → résultat, texte enrichi → texte, date → ISO. */
export function cellValue(value: ExcelJS.CellValue): DpgfCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value) return cellValue(value.result as ExcelJS.CellValue);
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
  }
  return null;
}

export function grid(sheet: ExcelJS.Worksheet): DpgfCell[][] {
  const rows: DpgfCell[][] = [];
  const last = Math.min(sheet.rowCount, MAX_ROWS);
  const width = Math.min(sheet.columnCount, MAX_COLUMNS);
  for (let r = 1; r <= last; r++) {
    const row = sheet.getRow(r);
    const cells: DpgfCell[] = [];
    for (let c = 1; c <= width; c++) {
      cells.push(cellValue(row.getCell(c).value));
    }
    rows.push(cells);
  }
  return rows;
}

/** Feuille du DPGF : celle qui a le plus de postes parmi les feuilles lisibles. */
export function bestSheet(
  workbook: ExcelJS.Workbook,
): { sheet: ExcelJS.Worksheet; parsed: ParsedDpgf } | null {
  let best:
    | { sheet: ExcelJS.Worksheet; parsed: ParsedDpgf; posts: number }
    | null = null;
  for (const sheet of workbook.worksheets) {
    if (sheet.state !== "visible") continue;
    const parsed = parseDpgfGrid(grid(sheet));
    if (!parsed) continue;
    const posts = parsed.rows.filter((r) => r.kind === "poste").length;
    if (!best || posts > best.posts) best = { sheet, parsed, posts };
  }
  return best;
}

export async function readWorkbook(
  bytes: ArrayBuffer,
): Promise<ExcelJS.Workbook | null> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    return workbook;
  } catch {
    return null;
  }
}

export type TenderSheetLine = {
  code: string | null;
  designation: string;
  unit_label: string | null;
  architect_quantity_milli: number | null;
  quantity_milli: number | null;
  unit_price_ht_cents: number | null;
  sheet_row: number | null;
};

/**
 * Quantités (quand l'entreprise les a changées) et prix unitaires dans les cellules du DPGF ; total
 * de la ligne écrit seulement si l'architecte n'y a pas mis de formule. Feuille « Écarts MENAO »
 * quand des quantités ont changé ; formules recalculées à l'ouverture.
 */
export function applyTenderPrices(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  columns: DpgfColumns,
  rows: readonly TenderSheetLine[],
): number {
  const gaps: (string | number | null)[][] = [];
  for (const line of rows) {
    if (!line.sheet_row) continue;
    const row = sheet.getRow(line.sheet_row);
    const quantity = line.quantity_milli;
    if (quantity !== null && quantity !== line.architect_quantity_milli) {
      if (columns.quantity !== null && columns.quantity !== undefined) {
        row.getCell(columns.quantity + 1).value = quantity / 1000;
      }
      gaps.push([
        line.code,
        line.designation,
        line.unit_label,
        line.architect_quantity_milli === null
          ? null
          : line.architect_quantity_milli / 1000,
        quantity / 1000,
      ]);
    }
    const price = line.unit_price_ht_cents;
    if (price === null) continue;
    if (columns.unitPrice !== null && columns.unitPrice !== undefined) {
      row.getCell(columns.unitPrice + 1).value = price / 100;
    }
    if (
      columns.total !== null && columns.total !== undefined && quantity !== null
    ) {
      const cell = row.getCell(columns.total + 1);
      // Une formule de l'architecte (quantité × prix) reste en place et se recalcule.
      if (!cell.formula) {
        cell.value = Math.round((quantity * price) / 1000) / 100;
      }
    }
    row.commit();
  }
  if (gaps.length > 0) {
    const name = workbook.getWorksheet("Écarts MENAO")
      ? "Écarts MENAO (2)"
      : "Écarts MENAO";
    const note = workbook.addWorksheet(name);
    note.addRow(["Quantités modifiées par l'entreprise par rapport au DPGF"]);
    note.addRow([]);
    note.addRow([
      "N°",
      "Désignation",
      "Unité",
      "Quantité du DPGF",
      "Quantité de l'entreprise",
    ]);
    for (const gap of gaps) note.addRow(gap);
    note.getRow(1).font = { bold: true };
    note.getRow(3).font = { bold: true };
    note.getColumn(2).width = 60;
  }
  workbook.calcProperties.fullCalcOnLoad = true;
  return gaps.length;
}
