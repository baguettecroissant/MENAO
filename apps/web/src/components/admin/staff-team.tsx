import { MoreHorizontal } from "lucide-react";
import { SheetChip } from "@/components/pro/sheet";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { TeamRole } from "@/lib/admin/guard";
import { removeStaff, setStaffRole } from "@/lib/admin/staff-actions";
import { formatDay, formatTimeAgo } from "@/lib/format";

const t = fr.admin.settingsPage.team;

export type StaffMember = {
  user_id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  role: TeamRole;
  double_auth: boolean;
  derniere_connexion: string | null;
  invite_le: string | null;
};

const ROLE_TONES = { admin: "neutral", support: "primary", verification: "success" } as const;

const fullName = (m: StaffMember) =>
  [m.prenom, m.nom].filter(Boolean).join(" ") || m.email || m.user_id.slice(0, 8);
const initials = (m: StaffMember) =>
  ((m.prenom?.[0] ?? "") + (m.nom?.[0] ?? "")).toUpperCase() || (m.email?.[0] ?? "?").toUpperCase();

/**
 * Membres de l'équipe (F-133, ADR 0284) : accès, double authentification, dernière connexion, et
 * le menu « ⋯ » d'un autre membre (changer l'accès, retirer l'accès avec confirmation). Jamais
 * sur sa propre ligne. Sans script : menus en <details>, ouverts dans la ligne (le tableau défile
 * sur téléphone).
 */
export function StaffTeam({ members, me }: { members: StaffMember[]; me: string }) {
  if (members.length === 0) return <p className="text-muted-foreground">{t.empty}</p>;
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <table className="admin-table w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">{t.listLabel}</caption>
        <thead className="border-b border-border bg-background text-[0.8125rem] text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              {t.columns.member}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t.columns.access}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t.columns.mfa}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t.columns.lastSeen}
            </th>
            <th scope="col" className="px-5 py-3">
              <span className="sr-only">{t.columns.member}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((m) => {
            const name = fullName(m);
            return (
              <tr key={m.user_id} className="align-middle">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white"
                    >
                      {initials(m)}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold">{name}</span>
                      <span className="text-[0.8125rem] text-muted-foreground">{m.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <SheetChip tone={ROLE_TONES[m.role]}>
                    {fr.admin.people.invite.roles[m.role]}
                  </SheetChip>
                </td>
                <td className="px-3 py-3.5">
                  <SheetChip tone={m.double_auth ? "success" : "warning"} dot>
                    {m.double_auth ? t.mfaOn : t.mfaOff}
                  </SheetChip>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap text-label">
                  {m.derniere_connexion
                    ? formatTimeAgo(m.derniere_connexion)
                    : m.invite_le
                      ? t.neverSeen(formatDay(m.invite_le))
                      : "—"}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {m.user_id === me ? (
                    <span className="text-[0.8125rem] text-muted-foreground">{t.you}</span>
                  ) : (
                    <MemberMenu member={m} name={name} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MemberMenu({ member, name }: { member: StaffMember; name: string }) {
  // Les deux autres accès (ADR 0286).
  const others = (["admin", "verification", "support"] as const).filter((r) => r !== member.role);
  return (
    <details className="inline-flex flex-col items-end text-left">
      <summary
        aria-label={t.actions(name)}
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-surface outline-none hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </summary>
      <div className="mt-2 flex w-72 flex-col gap-1 rounded-card border border-border bg-surface p-1.5 shadow-card">
        <span className="px-3 pt-2 pb-1 text-[0.6875rem] font-bold tracking-wider text-muted-foreground uppercase">
          {t.changeAccess}
        </span>
        {others.map((role) => (
          <form key={role} action={setStaffRole}>
            <input type="hidden" name="userId" value={member.user_id} />
            <input type="hidden" name="role" value={role} />
            <button
              type="submit"
              className="w-full rounded-input px-3 py-2.5 text-left text-sm font-medium hover:bg-background"
            >
              {t.makeRole[role]}
            </button>
          </form>
        ))}
        <details>
          <summary className="cursor-pointer list-none rounded-input px-3 py-2.5 text-sm font-medium text-danger hover:bg-background [&::-webkit-details-marker]:hidden">
            {t.remove}
          </summary>
          <form action={removeStaff} className="flex flex-col gap-2.5 px-3 pt-1 pb-2">
            <input type="hidden" name="userId" value={member.user_id} />
            <p className="text-[0.8125rem] text-label">{t.removeConfirm(name)}</p>
            <Button type="submit" variant="danger" size="sm">
              {t.removeYes}
            </Button>
          </form>
        </details>
      </div>
    </details>
  );
}
