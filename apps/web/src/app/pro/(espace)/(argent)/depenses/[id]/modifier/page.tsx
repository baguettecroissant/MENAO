import { formatEurosInput } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/pro/expense-form";
import { fr } from "@/i18n/fr";
import { expenseChantierOptions, loadExpense } from "@/lib/artisan/expenses";
import { requireProSpace } from "@/lib/artisan/space";

const f = fr.pro.expenses.form;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${f.editTitle} — MENAO` };

/** Modification d'une dépense (F-62) : mêmes champs, pièce remplaçable. */
export default async function EditExpensePage({
  params,
}: PageProps<"/pro/depenses/[id]/modifier">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const [expense, chantiers] = await Promise.all([
    loadExpense(supabase, id),
    expenseChantierOptions(supabase),
  ]);
  if (!expense) notFound();
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={`/pro/depenses/${id}` as Route}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary-strong hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {expense.title}
        </Link>
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{f.editTitle}</h1>
        <ExpenseForm
          expenseId={id}
          initial={{
            title: expense.title,
            supplierName: expense.supplier_name ?? "",
            reference: expense.reference ?? "",
            kind: expense.kind,
            category: expense.category ?? "",
            issuedOn: expense.issued_on,
            dueOn: expense.due_on ?? "",
            paidOn: expense.paid_on ?? "",
            paid: expense.paid_on ? "on" : "",
            chantierId: expense.chantier_id ?? "",
            totalHt: formatEurosInput(expense.total_ht_cents),
            totalTva: formatEurosInput(expense.total_tva_cents),
            notes: expense.notes ?? "",
          }}
          initialLines={expense.lines}
          hasDocument={expense.document_path !== null}
          chantiers={chantiers}
        />
      </div>
    </main>
  );
}
