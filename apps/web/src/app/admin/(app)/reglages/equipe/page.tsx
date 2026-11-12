import type { Metadata } from "next";
import { AdminSectionHeader } from "@/components/admin/admin-tabs";
import { SummaryTile, SummaryTiles } from "@/components/admin/money";
import { StaffInviteForm } from "@/components/admin/staff-invite-form";
import { StaffTeam, type StaffMember } from "@/components/admin/staff-team";
import { Alert, Card, CardTitle } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";

const t = fr.admin.settingsPage;
const tt = t.team;
const invite = fr.admin.people.invite;

export const metadata: Metadata = { title: `${t.tabs.team} — ${fr.admin.title}` };

/**
 * Réglages, onglet « Équipe MENAO » (F-133, ADR 0284) : membres de l'équipe (accès, double
 * authentification, dernière connexion), changement et retrait d'accès, invitation (ADR 0210) et
 * ce que voit chaque accès. Retours : ?fait=acces, ?fait=retrait, ?erreur=1.
 */
export default async function AdminTeamPage({ searchParams }: PageProps<"/admin/reglages/equipe">) {
  const { fait, erreur } = await searchParams;
  const { supabase, userId } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_staff_members");
  const members = (data ?? []) as StaffMember[];
  const admins = members.filter((m) => m.role === "admin").length;
  const verifiers = members.filter((m) => m.role === "verification").length;
  const withMfa = members.filter((m) => m.double_auth).length;
  const pending = members.filter((m) => !m.derniere_connexion).length;

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionHeader
        set="settings"
        current="team"
        intro={t.intro}
        counts={{ team: members.length }}
      />
      {fait === "acces" && <Alert tone="success">{tt.roleChanged}</Alert>}
      {fait === "retrait" && <Alert tone="success">{tt.removed}</Alert>}
      {(erreur || error) && <Alert tone="error">{fr.errors.generic}</Alert>}
      <SummaryTiles label={tt.figuresLabel} columns={3}>
        <SummaryTile
          label={tt.members}
          value={String(members.length)}
          hint={tt.membersHint(admins, members.length - admins - verifiers, verifiers)}
        />
        <SummaryTile
          label={tt.mfa}
          value={tt.mfaValue(withMfa, members.length)}
          hint={tt.mfaHint(members.length - withMfa)}
          tone={withMfa < members.length ? "warning" : "default"}
        />
        <SummaryTile label={tt.pending} value={String(pending)} hint={tt.pendingHint(pending)} />
      </SummaryTiles>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <StaffTeam members={members} me={userId} />
          <Card className="flex flex-col gap-3">
            <CardTitle title={tt.rolesTitle} />
            <dl className="flex flex-col gap-2.5 text-sm">
              {(["admin", "support", "verification"] as const).map((role) => (
                <div key={role} className="flex gap-3">
                  <dt className="w-24 shrink-0 font-semibold">{invite.roles[role]}</dt>
                  <dd className="text-label">{tt.roles[role]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
        <Card id="inviter" className="flex scroll-mt-24 flex-col gap-4">
          <CardTitle title={invite.title} description={invite.lead} />
          <StaffInviteForm />
        </Card>
      </div>
    </div>
  );
}
