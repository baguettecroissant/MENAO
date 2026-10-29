import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LaunchTaskDeleteForm, LaunchTaskForm } from "@/components/launch/admin-forms";
import { Card, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getLaunchTask, listLaunchMembers } from "@/lib/admin/launch";
import { toLaunchCategory } from "@/lib/launch/board";

const t = fr.admin.launch;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Adresse de création : /admin/lancement/taches/nouvelle (?membre=… pour le responsable). */
const NEW = "nouvelle";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Création ou modification d'une tâche de lancement (F-66, ADR 0208) : formulaire complet, puis
 * suppression confirmée. Retour sur le tableau du responsable, ou sur la vue d'équipe pour une
 * tâche de toute l'équipe. Réservé aux admins.
 */
export default async function AdminLaunchTaskPage({
  params,
  searchParams,
}: PageProps<"/admin/lancement/taches/[id]">) {
  const { id } = await params;
  const isNew = id === NEW;
  if (!isNew && !UUID.test(id)) notFound();
  const query = await searchParams;
  const preset = typeof query.membre === "string" && UUID.test(query.membre) ? query.membre : null;
  const { supabase } = await requireAdmin();
  const [members, task] = await Promise.all([
    listLaunchMembers(supabase),
    isNew ? Promise.resolve(null) : getLaunchTask(supabase, id),
  ]);
  if (!isNew && !task) notFound();
  const memberId = task ? task.member_id : members.some((m) => m.id === preset) ? preset : null;
  const owner = members.find((m) => m.id === memberId);

  return (
    <div className="flex flex-col gap-6">
      <TextLink
        href={(owner ? `/admin/lancement/${owner.id}` : "/admin/lancement") as Route}
        className="inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {owner ? t.task.backTo(owner.nom) : t.task.backTeam}
      </TextLink>
      <h1 className="text-2xl font-medium tracking-tight">
        {task ? t.task.editTitle : t.task.newTitle}
      </h1>
      <Card className="flex flex-col gap-4 lg:max-w-3xl">
        <LaunchTaskForm
          task={task ? { ...task, categorie: toLaunchCategory(task.categorie) } : undefined}
          members={members.map((m) => ({ id: m.id, nom: m.nom }))}
          defaultMemberId={memberId}
        />
        {task && (
          <div className="border-t border-border pt-4">
            <LaunchTaskDeleteForm id={task.id} memberId={task.member_id} />
          </div>
        )}
      </Card>
    </div>
  );
}
