import { parisToday } from "@menao/core";
import type { Metadata } from "next";
import Link from "next/link";
import { ExpenseForm } from "@/components/pro/expense-form";
import { fr } from "@/i18n/fr";
import { expenseChantierOptions } from "@/lib/artisan/expenses";
import { requireTeamPermission } from "@/lib/artisan/space";

const f = fr.pro.expenses.form;

export const metadata: Metadata = { title: `${f.newTitle} — MENAO` };

/** Nouvelle dépense (F-62) : pièce en photo ou en PDF, lue par l'IA, puis vérifiée. */
export default async function NewExpensePage({
  searchParams,
}: PageProps<"/pro/depenses/nouvelle">) {
  const { chantier } = await searchParams;
  const { supabase } = await requireTeamPermission("money");
  const chantiers = await expenseChantierOptions(supabase);
  const chantierId =
    typeof chantier === "string" && chantiers.some((c) => c.id === chantier) ? chantier : "";
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/pro/depenses"
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {f.back}
        </Link>
        <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2rem]">{f.newTitle}</h1>
        <ExpenseForm
          expenseId={null}
          initial={{
            title: "",
            supplierName: "",
            reference: "",
            kind: "facture",
            category: "",
            issuedOn: parisToday(),
            dueOn: "",
            paidOn: "",
            paid: "",
            chantierId,
            totalHt: "",
            totalTva: "",
            notes: "",
          }}
          initialLines={[]}
          hasDocument={false}
          chantiers={chantiers}
        />
      </div>
    </main>
  );
}
