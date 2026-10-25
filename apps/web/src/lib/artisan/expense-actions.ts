"use server";

import {
  parisToday,
  type ExpenseLinePrefill,
  type ExpensePrefill,
  type ExpenseReadingWarning,
} from "@menao/core";
import { expenseFormSchema, expenseLinesSchema } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { requireArtisan } from "./requests";

const UPLOAD_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}$/;

export type ExpenseReadResult =
  | {
      status: "ok";
      fields: ExpensePrefill;
      lines: ExpenseLinePrefill[];
      warnings: ExpenseReadingWarning[];
    }
  | { status: "unavailable" };

/**
 * Lecture d'une pièce déjà déposée dans « uploads » (F-62), par l'Edge Function read-expense :
 * champs à pré-remplir, lignes et alertes. En cas d'échec, l'artisan remplit les champs.
 */
export async function readExpense(path: string): Promise<ExpenseReadResult> {
  if (typeof path !== "string" || !UPLOAD_PATH.test(path)) return { status: "unavailable" };
  const { supabase } = await requireArtisan();
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    fields?: ExpensePrefill;
    lines?: ExpenseLinePrefill[];
    warnings?: ExpenseReadingWarning[];
  }>("read-expense", { method: "POST", body: { path } });
  if (error || data?.status !== "ok") return { status: "unavailable" };
  return {
    status: "ok",
    fields: data.fields ?? {},
    lines: data.lines ?? [],
    warnings: data.warnings ?? [],
  };
}

const FIELDS = [
  "title",
  "supplierName",
  "reference",
  "kind",
  "category",
  "issuedOn",
  "dueOn",
  "paidOn",
  "chantierId",
  "totalHt",
  "totalTva",
  "notes",
] as const;

/**
 * Création (`expenseId` null) ou modification d'une dépense (F-62), puis rangement de la pièce
 * choisie par process-upload. Les valeurs saisies sont renvoyées avec les erreurs : React vide le
 * formulaire après l'envoi.
 */
export async function saveExpense(
  expenseId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (expenseId !== null && !z.uuid().safeParse(expenseId).success) {
    return { error: fr.errors.generic };
  }
  const values: Record<string, string> = Object.fromEntries(
    FIELDS.map((name) => [name, text(formData, name) ?? ""]),
  );
  values.paid = checkbox(formData, "paid") ? "on" : "";
  // Case « Déjà payée » sans date : payée aujourd'hui.
  const paidOn = values.paid ? values.paidOn || parisToday() : "";
  const parsed = expenseFormSchema.safeParse({ ...values, paidOn });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  let lines: unknown;
  try {
    lines = JSON.parse(text(formData, "lines") || "[]");
  } catch {
    return { error: fr.errors.generic, values };
  }
  const parsedLines = expenseLinesSchema.safeParse(lines);
  if (!parsedLines.success) return { error: fr.errors.generic, values };
  const documentPath = text(formData, "documentPath") ?? "";
  if (documentPath && !UPLOAD_PATH.test(documentPath)) return { error: fr.errors.generic, values };

  const form = parsed.data;
  const { supabase } = await requireArtisan();
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
    p_lines: parsedLines.data.map((line) => ({
      designation: line.designation,
      reference: line.reference,
      quantity_milli: line.quantityMilli,
      unit: line.unit,
      unit_price_ht_cents: line.unitPriceHtCents,
      total_ht_cents: line.totalHtCents,
    })),
  });
  if (error || !id) return { error: fr.errors.generic, values };

  let documentFailed = false;
  if (documentPath) {
    const { data, error: uploadError } = await supabase.functions.invoke<{ status: string }>(
      "process-upload",
      { method: "POST", body: { purpose: "expense_document", path: documentPath, expenseId: id } },
    );
    documentFailed = !!uploadError || data?.status !== "ok";
  }
  revalidatePath("/pro/depenses");
  redirect(`/pro/depenses/${id}${documentFailed ? "?piece=echec" : ""}` as Route);
}

/** « Marquer comme payée » (aujourd'hui) ou « Marquer comme non payée ». */
export async function setExpensePaid(expenseId: string, paid: boolean): Promise<void> {
  if (!z.uuid().safeParse(expenseId).success) return;
  const { supabase } = await requireArtisan();
  await supabase.rpc("artisan_set_expense_paid", {
    p_expense_id: expenseId,
    p_paid_on: (paid ? parisToday() : null) as string,
  });
  revalidatePath("/pro/depenses");
  revalidatePath(`/pro/depenses/${expenseId}`);
}

/** Suppression définitive de la dépense et de sa pièce. */
export async function deleteExpense(expenseId: string): Promise<void> {
  if (!z.uuid().safeParse(expenseId).success) return;
  const { supabase } = await requireArtisan();
  const { data: path, error } = await supabase.rpc("artisan_delete_expense", {
    p_expense_id: expenseId,
  });
  if (!error && path) await supabase.storage.from("expense-documents").remove([path]);
  revalidatePath("/pro/depenses");
  redirect("/pro/depenses");
}
