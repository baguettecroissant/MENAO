"use client";

import { teamMemberName, type ChantierTeamMember } from "@menao/core";
import { Users } from "lucide-react";
import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { saveChantierTeam } from "@/lib/artisan/team-actions";

const t = fr.pro.chantierTeam;

/**
 * « Équipe sur ce chantier » (ADR 0241) : le patron ou le chef d'équipe coche les membres qui y
 * travaillent. Un ouvrier ne voit que les chantiers qui lui sont attribués.
 */
export function ChantierTeamCard({
  chantierId,
  members,
}: {
  chantierId: string;
  members: ChantierTeamMember[];
}) {
  const [state, action, pending] = useActionState(saveChantierTeam, initialFormState);
  return (
    <section
      aria-labelledby="chantier-team-title"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <h2 id="chantier-team-title" className="flex items-center gap-2 text-[1.0625rem] font-medium">
        <Users aria-hidden="true" className="size-5 text-primary" />
        {t.title}
      </h2>
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="chantierId" value={chantierId} />
        <ul className="flex flex-col">
          {members.map((m) => (
            <li key={m.userId}>
              <label className="flex min-h-touch cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="userIds"
                  value={m.userId}
                  defaultChecked={m.assigned}
                  className="size-4 accent-primary"
                />
                <span className="font-medium">{teamMemberName({ ...m, email: null })}</span>
                <span className="text-muted-foreground">{fr.pro.team.roles[m.role]}</span>
              </label>
            </li>
          ))}
        </ul>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}
        <Button
          type="submit"
          variant="secondary"
          block={false}
          disabled={pending}
          className="sm:self-start sm:px-6"
        >
          {t.save}
        </Button>
      </form>
    </section>
  );
}
