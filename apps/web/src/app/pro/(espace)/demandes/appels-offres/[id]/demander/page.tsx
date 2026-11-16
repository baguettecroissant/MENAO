import type { PlanTrace } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanChat } from "@/components/pro/plan-chat";
import { fr } from "@/i18n/fr";
import { getPlanChat } from "@/lib/artisan/plan-chat";
import { requireTeamPermission } from "@/lib/artisan/space";
import { getTender, planFileLinks } from "@/lib/artisan/tenders";

const c = fr.pro.tenders.plan.chat;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${c.title} — MENAO` };
// Une réponse demande plusieurs allers-retours avec le modèle (2 minutes au plus, ADR 0346).
export const maxDuration = 150;

/**
 * « Demander à MENAO » (F-160, maquette du lot 59, ADR 0347) : le chat sur les plans d'un appel
 * d'offres créé depuis les plans, avec sa conversation et le nombre de questions du mois.
 */
export default async function PlanChatPage({
  params,
}: PageProps<"/pro/demandes/appels-offres/[id]/demander">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireTeamPermission("money");
  const found = await getTender(supabase, id);
  if (!found || found.tender.source_kind !== "plan") notFound();
  const { tender } = found;
  const [files, chat] = await Promise.all([
    planFileLinks(supabase, tender.plan_files),
    getPlanChat(supabase, id),
  ]);
  const traces = (Array.isArray(tender.plan_traces) ? tender.plan_traces : []) as PlanTrace[];

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={`/pro/demandes/appels-offres/${id}` as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {c.back(tender.name)}
        </Link>
        <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2.25rem]">{c.title}</h1>
        <PlanChat
          tenderId={id}
          initialMessages={chat.messages}
          quota={chat.quota}
          files={files}
          traces={traces}
        />
      </div>
    </main>
  );
}
