import { parisToday } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { LaunchMemberDeleteForm, LaunchMemberForm } from "@/components/launch/admin-forms";
import { LaunchBoard } from "@/components/launch/launch-board";
import { Alert, ButtonLink, Card, CardTitle, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getLaunchMember, listLaunchAccounts, listLaunchMemberTasks } from "@/lib/admin/launch";
import { parseLaunchView } from "@/lib/launch/board";

const t = fr.admin.launch;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Tableau d'un membre de l'équipe de lancement (F-66, ADR 0208), tel qu'il le voit (ses tâches et
 * celles partagées avec toute l'équipe), avec les titres cliquables vers la modification, l'ajout
 * d'une tâche, puis la fiche du membre (compte relié, objectif interne) et son retrait. Réservé
 * aux admins.
 */
export default async function AdminLaunchMemberPage({
  params,
  searchParams,
}: PageProps<"/admin/lancement/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const view = parseLaunchView(query.vue);
  // Retour d'une action (fiche, tâche, copie) : message de réussite.
  const done = typeof query.fait === "string" ? query.fait : null;
  const count = Number(typeof query.n === "string" ? query.n : 0) || 0;
  const doneMessage =
    done === "membre"
      ? t.member.saved
      : done === "tache"
        ? t.done.tache
        : done === "tache-supprimee"
          ? t.done.tacheSupprimee
          : done === "copie"
            ? t.copy.copied(count)
            : null;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [member, tasks, accounts] = await Promise.all([
    getLaunchMember(supabase, id),
    listLaunchMemberTasks(supabase, id),
    listLaunchAccounts(supabase),
  ]);
  if (!member) notFound();

  return (
    <div className="flex flex-col gap-6">
      <TextLink
        href={"/admin/lancement" as Route}
        className="inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.member.back}
      </TextLink>

      {doneMessage && <Alert tone="success">{doneMessage}</Alert>}

      <LaunchBoard
        member={member}
        tasks={tasks}
        today={parisToday()}
        view={view}
        path={`/admin/lancement/${member.id}`}
        admin
        headingLevel={1}
        actions={
          <ButtonLink
            href={`/admin/lancement/taches/nouvelle?membre=${member.id}` as Route}
            size="sm"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t.member.addTask}
          </ButtonLink>
        }
      />

      <Card className="flex flex-col gap-4 lg:max-w-3xl">
        <CardTitle title={t.member.edit} />
        <LaunchMemberForm member={member} accounts={accounts} />
        <div className="border-t border-border pt-4">
          <LaunchMemberDeleteForm id={member.id} />
        </div>
      </Card>
    </div>
  );
}
