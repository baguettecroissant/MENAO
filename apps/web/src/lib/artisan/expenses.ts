import "server-only";
import type { ExpenseLinePrefill, ExpenseRow } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

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

/** Dépenses de l'artisan (F-62), les plus récentes d'abord. La RLS limite aux siennes. */
export async function loadExpenses(supabase: Client): Promise<ExpenseRow[]> {
  const { data } = await supabase
    .from("expenses")
    .select(COLUMNS)
    .order("issued_on", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Selected[]).map(toRow);
}

export type ExpenseDetail = ExpenseRow & {
  notes: string | null;
  document_path: string | null;
  lines: ExpenseLinePrefill[];
};

/** Une dépense avec ses lignes, ou null (autre artisan, identifiant inconnu). */
export async function loadExpense(supabase: Client, id: string): Promise<ExpenseDetail | null> {
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

/** Pièce de la dépense : URL signée de 10 minutes (espace privé, CLAUDE.md règle 8). */
export async function expenseDocumentUrl(supabase: Client, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("expense-documents").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** Chantiers proposés dans le formulaire : titre et client, les plus récents d'abord. */
export async function expenseChantierOptions(
  supabase: Client,
): Promise<{ id: string; label: string }[]> {
  const { data } = await supabase.rpc("artisan_chantiers");
  return (data ?? []).map((c) => {
    const client = [c.client_first_name, c.client_last_name].filter(Boolean).join(" ");
    return { id: c.chantier_id, label: client ? `${c.title} — ${client}` : c.title };
  });
}
