import {
  exampleExpenses,
  parisToday,
  type ExpenseLinePrefill,
  type ExpensePrefill,
  type ExpenseReadingWarning,
  type ExpenseRow,
} from "@menao/core";
import type { ExpenseForm, ExpenseLineInput } from "@menao/validation";
import { expensesCsv } from "@menao/documents";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fr } from "@/i18n/fr";
import { examplesActive } from "./examples";
import { processDeposit } from "./photos";
import { supabase } from "./supabase";

const t = fr.proExpenses;

const COLUMNS =
  "id, title, supplier_name, reference, kind, category, issued_on, due_on, paid_on, total_ht_cents, total_tva_cents, total_ttc_cents, chantier_id, document_mime, chantier:chantiers(title)";

type Selected = Omit<ExpenseRow, "chantier_title" | "total_ttc_cents"> & {
  total_ttc_cents: number | null;
  chantier: { title: string } | null;
};

const toRow = ({ chantier, ...expense }: Selected): ExpenseRow => ({
  ...expense,
  total_ttc_cents: expense.total_ttc_cents ?? expense.total_ht_cents + expense.total_tva_cents,
  chantier_title: chantier?.title ?? null,
});

/**
 * Dépenses de l'artisan (F-62), les plus récentes d'abord, comme sur le site ; la RLS limite aux
 * siennes. Exemples (ADR 0184) : les dépenses fictives. Null en cas d'erreur.
 */
export async function loadExpenses(): Promise<ExpenseRow[] | null> {
  if (examplesActive()) return exampleExpenses();
  const { data, error } = await supabase
    .from("expenses")
    .select(COLUMNS)
    .order("issued_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return null;
  return ((data ?? []) as Selected[]).map(toRow).filter((row) => !pendingDeletions.has(row.id));
}

/** Dépenses supprimées à l'instant, encore annulables (ADR 0195) : absentes des listes. */
const pendingDeletions = new Set<string>();

export function hideExpense(id: string): void {
  pendingDeletions.add(id);
}

export function unhideExpense(id: string): void {
  pendingDeletions.delete(id);
}

export type ExpenseDetail = ExpenseRow & {
  notes: string | null;
  document_path: string | null;
  lines: ExpenseLinePrefill[];
};

/** Une dépense avec ses lignes ; null si elle est introuvable (ou autre artisan). */
export async function loadExpense(id: string): Promise<ExpenseDetail | null> {
  if (examplesActive()) {
    const example = exampleExpenses().find((expense) => expense.id === id);
    return example ? { ...example, notes: null, document_path: null, lines: [] } : null;
  }
  const { data } = await supabase
    .from("expenses")
    .select(
      `${COLUMNS}, notes, document_path, lines:expense_lines(designation, reference, quantity_milli, unit, unit_price_ht_cents, total_ht_cents, position)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { notes, document_path, lines, ...rest } = data as Selected & {
    notes: string | null;
    document_path: string | null;
    lines: {
      designation: string;
      reference: string | null;
      quantity_milli: number | null;
      unit: ExpenseLinePrefill["unit"];
      unit_price_ht_cents: number | null;
      total_ht_cents: number | null;
      position: number;
    }[];
  };
  return {
    ...toRow(rest),
    notes,
    document_path,
    lines: [...lines]
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        designation: line.designation,
        reference: line.reference,
        quantityMilli: line.quantity_milli,
        unit: line.unit,
        unitPriceHtCents: line.unit_price_ht_cents,
        totalHtCents: line.total_ht_cents,
      })),
  };
}

/**
 * Fiche d'une dépense, avec l'URL signée de sa pièce (10 minutes, espace privé, CLAUDE.md règle 8) ;
 * null si elle est introuvable.
 */
export async function loadExpenseView(
  id: string,
): Promise<(ExpenseDetail & { documentUrl: string | null }) | null> {
  const expense = await loadExpense(id);
  if (!expense) return null;
  if (!expense.document_path) return { ...expense, documentUrl: null };
  const { data } = await supabase.storage
    .from("expense-documents")
    .createSignedUrl(expense.document_path, 600);
  return { ...expense, documentUrl: data?.signedUrl ?? null };
}

/** Chantiers proposés dans le formulaire (titre), les plus récents d'abord. */
export async function loadExpenseChantiers(): Promise<{ id: string; label: string }[]> {
  if (examplesActive()) return [];
  const { data } = await supabase.rpc("artisan_chantiers");
  return (data ?? []).map((c) => ({ id: c.chantier_id, label: c.title }));
}

export type ExpenseReadResult =
  | {
      status: "ok";
      fields: ExpensePrefill;
      lines: ExpenseLinePrefill[];
      warnings: ExpenseReadingWarning[];
    }
  | { status: "unavailable" };

/**
 * Lecture d'une pièce déjà déposée dans « uploads » (F-62), par l'Edge Function read-expense,
 * comme sur le site. En cas d'échec, l'artisan remplit les champs lui-même.
 */
export async function readExpense(path: string): Promise<ExpenseReadResult> {
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    fields?: ExpensePrefill;
    lines?: ExpenseLinePrefill[];
    warnings?: ExpenseReadingWarning[];
  }>("read-expense", { body: { path } });
  if (error || data?.status !== "ok") return { status: "unavailable" };
  return {
    status: "ok",
    fields: data.fields ?? {},
    lines: data.lines ?? [],
    warnings: data.warnings ?? [],
  };
}

/**
 * Création (`expenseId` null) ou modification d'une dépense, puis rangement de la pièce déposée
 * par process-upload, comme sur le site. Renvoie l'identifiant de la dépense, avec
 * `documentFailed` si la pièce n'a pas pu être rangée ; null si la dépense n'a pas été enregistrée.
 */
export async function saveExpense(
  expenseId: string | null,
  form: ExpenseForm,
  lines: ExpenseLineInput[],
  documentPath: string | null,
): Promise<{ id: string; documentFailed: boolean } | null> {
  const { data: id, error } = await supabase.rpc("artisan_save_expense", {
    p_expense_id: expenseId as string,
    p_expense: {
      title: form.title,
      supplier_name: form.supplierName,
      reference: form.reference,
      kind: form.kind,
      category: form.category,
      issued_on: form.issuedOn,
      due_on: form.dueOn,
      paid_on: form.paidOn,
      chantier_id: form.chantierId,
      total_ht_cents: form.totalHtCents,
      total_tva_cents: form.totalTvaCents,
      notes: form.notes,
    },
    p_lines: lines.map((line) => ({
      designation: line.designation,
      reference: line.reference,
      quantity_milli: line.quantityMilli,
      unit: line.unit,
      unit_price_ht_cents: line.unitPriceHtCents,
      total_ht_cents: line.totalHtCents,
    })),
  });
  if (error || !id) return null;
  if (!documentPath) return { id, documentFailed: false };
  const status = await processDeposit({ purpose: "expense_document", expenseId: id }, documentPath);
  return { id, documentFailed: status !== "ok" };
}

/** « Marquer comme payée » (aujourd'hui) ou « Marquer comme non payée ». */
export async function setExpensePaid(expenseId: string, paid: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc("artisan_set_expense_paid", {
    p_expense_id: expenseId,
    p_paid_on: (paid ? parisToday() : null) as string,
  });
  return !error && data === true;
}

/** Suppression définitive de la dépense et de sa pièce. */
export async function deleteExpense(expenseId: string): Promise<boolean> {
  const { data: path, error } = await supabase.rpc("artisan_delete_expense", {
    p_expense_id: expenseId,
  });
  if (error) return false;
  if (path) await supabase.storage.from("expense-documents").remove([path]);
  return true;
}

/**
 * Export des dépenses pour le comptable (F-62) : même fichier CSV que le site (`expensesCsv`),
 * écrit dans le cache de l'application puis proposé au partage (e-mail, Fichiers…).
 */
export async function shareExpensesCsv(): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const expenses = await loadExpenses();
    if (!expenses) return false;
    const csv = expensesCsv(
      t.csv.headers,
      [...expenses].reverse().map((expense) => ({
        issuedOn: expense.issued_on,
        supplier: expense.supplier_name ?? "",
        reference: expense.reference ?? "",
        title: expense.title,
        kind: t.kinds[expense.kind],
        category: expense.category ? t.categories[expense.category] : "",
        chantier: expense.chantier_title ?? "",
        totalHtCents: expense.total_ht_cents,
        totalTvaCents: expense.total_tva_cents,
        totalTtcCents: expense.total_ttc_cents,
        dueOn: expense.due_on ?? "",
        paidOn: expense.paid_on ?? "",
      })),
    );
    const file = new File(Paths.cache, t.csv.filename);
    file.create({ overwrite: true });
    await file.write(csv);
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
    return true;
  } catch {
    return false;
  }
}

/** Clé de la fiche d'une dépense dans la mémoire des écrans. */
export const expenseScreenKey = (id: string) => `depense:${id}`;
