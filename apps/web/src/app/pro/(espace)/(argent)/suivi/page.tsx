import { parseMoneyOverview } from "@menao/core";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { MoneyOverviewView } from "@/components/pro/money-overview-view";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.moneyOverview;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** « Suivi » de la rubrique Argent (F-87, ADR 0237 ; maquette du lot 37). */
export default async function MoneyOverviewPage() {
  const { supabase } = await requireTeamPermission("money");
  const { data } = await supabase.rpc("my_money_overview");
  const overview = parseMoneyOverview(data);
  if (!overview?.included) redirect("/pro/devis" as Route);

  return <MoneyOverviewView overview={overview} now={new Date()} />;
}
