import type { Metadata } from "next";
import { OverviewScreen } from "@/components/admin/overview-screen";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getActivity, getOverview, getTodo } from "@/lib/admin/overview";

export const metadata: Metadata = { title: `${fr.admin.overview.title} — ${fr.admin.title}` };

/** Page d'accueil du back-office (F-58, ADR 0045) : vue d'ensemble de toute la plateforme. */
export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const [overview, activity, todo] = await Promise.all([
    getOverview(supabase),
    getActivity(supabase),
    getTodo(supabase),
  ]);
  if (!overview) return <Alert tone="error">{fr.errors.generic}</Alert>;
  return <OverviewScreen overview={overview} activity={activity} todo={todo} now={new Date()} />;
}
