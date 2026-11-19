import { ArrowLeft, Users } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TrainingSimulator } from "@/components/commercial/training-simulator";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";

const t = fr.admin.candidates.test;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Test de vente en entretien (F-183, lot 77, ADR 0380) : le simulateur de l'espace conseiller,
 * ouvert depuis la fiche du candidat ; la note du coach s'ajoute à sa fiche. Réservé aux admins.
 */
export default async function AdminCandidateTestPage({
  params,
}: PageProps<"/admin/candidats/[id]/test">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase
    .from("commercial_candidates")
    .select("id, first_name, last_name, stage")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.stage === "non_retenu") notFound();
  const back = `/admin/candidats/${c.id}` as Route;
  return (
    <div className="flex flex-col gap-5">
      <TextLink href={back} className="inline-flex items-center gap-1 self-start text-sm">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {c.first_name} {c.last_name}
      </TextLink>
      <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
        {t.title}
      </h1>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-[0.9375rem] text-primary-strong">
        <Users aria-hidden="true" className="size-5 shrink-0" />
        <span className="flex-1">{t.banner(c.first_name)}</span>
        <TextLink href={back} className="font-bold">
          {t.quit}
        </TextLink>
      </div>
      <p className="max-w-3xl text-muted-foreground">{t.intro}</p>
      <TrainingSimulator candidateId={c.id} />
    </div>
  );
}
