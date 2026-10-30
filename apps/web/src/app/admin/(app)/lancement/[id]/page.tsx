import { mondayOf, parisToday } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { ListPanel, ListRow } from "@/components/list-kit";
import { LaunchMemberDeleteForm, LaunchMemberForm } from "@/components/launch/admin-forms";
import { LaunchBoard } from "@/components/launch/launch-board";
import { MemberFigures } from "@/components/launch/member-figures";
import { Alert, ButtonLink, Card, CardTitle, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getLaunchMember, listLaunchAccounts, listLaunchMemberTasks } from "@/lib/admin/launch";
import { getLaunchFigures, listAcquisitionCodes } from "@/lib/admin/launch-figures";
import { parseLaunchView } from "@/lib/launch/board";

const t = fr.admin.launch;
const r = t.figures.results;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Tableau d'un membre de l'équipe de lancement (F-66, ADR 0208), tel qu'il le voit (ses tâches et
 * celles partagées avec toute l'équipe), avec les titres cliquables vers la modification, l'ajout
 * d'une tâche, ses résultats (objectif contre réalisé, ses codes de suivi : lot 2, ADR 0209), puis
 * la fiche du membre (compte relié, objectif interne) et son retrait. Réservé aux admins.
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
  const [member, tasks, accounts, figures, codes] = await Promise.all([
    getLaunchMember(supabase, id),
    listLaunchMemberTasks(supabase, id),
    listLaunchAccounts(supabase),
    getLaunchFigures(supabase),
    listAcquisitionCodes(supabase),
  ]);
  if (!member) notFound();
  const today = figures?.today ?? parisToday();
  // Chiffres du membre (membres actifs seulement) et ses codes de suivi.
  const results = figures?.members.find((row) => row.member_id === member.id) ?? null;
  const ownCodes = codes.filter((code) => code.member_id === member.id);

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
        today={today}
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
        <CardTitle title={r.title} />
        {!figures ? (
          <Alert tone="error">{t.figures.error}</Alert>
        ) : results ? (
          <MemberFigures member={results} targets={figures.targets} currentWeek={mondayOf(today)} />
        ) : (
          <p className="text-sm text-muted-foreground">{r.inactive}</p>
        )}
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-sm font-medium">{r.codes}</h3>
          {ownCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{r.noCodes}</p>
          ) : (
            <ListPanel label={r.codes}>
              {ownCodes.map((code) => (
                <ListRow
                  key={code.id}
                  href={`/admin/lancement/codes/${code.id}`}
                  label={t.codes.edit(code.code)}
                  title={<span className="font-mono text-sm">{code.code}</span>}
                  detail={`${code.libelle} · ${t.channels[code.canal]}`}
                  value={t.codes.counts(code.inscrits, code.valides)}
                  status={code.active ? undefined : { text: t.codes.inactive, tone: "neutral" }}
                />
              ))}
            </ListPanel>
          )}
        </div>
      </Card>

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
