import { parseTeam, teamIncluded, teamMemberName, teamSeatsLeft } from "@menao/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamInviteForm, TeamMemberActions } from "@/components/pro/team-forms";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";

const t = fr.pro.team;
const longDay = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

const TONES = {
  actif: "success",
  en_attente: "primary",
  suspendu_places: "warning",
  suspendu_patron: "neutral",
} as const;

/**
 * « Mon équipe » du patron (F-89, ADR 0240), depuis « Mon profil » : places de la formule (patron
 * compris), membres et leur état, invitation par e-mail. Formule Base : « Avec Premium et
 * Entreprise ».
 */
export default async function TeamPage() {
  const space = await requireProSpace();
  if (space.teamPosition !== "patron") redirect("/pro/mon-profil");
  const { data } = await space.supabase.rpc("my_team");
  const team = parseTeam(data);
  if (!team) redirect("/pro/mon-profil");
  const you = [space.firstName, space.lastName].filter(Boolean).join(" ").trim() || t.you;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2rem]">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.lead}</p>
        </div>

        {!teamIncluded(team) ? (
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{t.notIncluded.title}</h2>
            <p className="text-sm text-muted-foreground">{t.notIncluded.text}</p>
            <ButtonLink href="/pro/onboarding/formule" className="self-start">
              {t.notIncluded.cta}
            </ButtonLink>
          </Card>
        ) : (
          <>
            <section aria-labelledby="team-members" className="flex flex-col gap-2">
              <h2 id="team-members" className="ml-1 text-sm text-muted-foreground">
                {t.seats(team.used, team.seats)}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
                <li className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{you}</span>
                    <span className="text-sm text-muted-foreground">{t.patron}</span>
                  </div>
                </li>
                {team.members.map((member) => {
                  const name = teamMemberName(member);
                  return (
                    <li key={member.userId} className="flex flex-col gap-3 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{name}</span>
                          {member.email && name !== member.email && (
                            <span className="truncate text-sm text-muted-foreground">
                              {member.email}
                            </span>
                          )}
                          {member.since && (
                            <span className="text-xs text-subtle-foreground">
                              {t.since(longDay.format(new Date(member.since)))}
                            </span>
                          )}
                        </div>
                        <StatusBadge tone={TONES[member.state]}>
                          {t.states[member.state]}
                        </StatusBadge>
                      </div>
                      <TeamMemberActions
                        userId={member.userId}
                        name={name}
                        role={member.role}
                        suspended={
                          member.state === "suspendu_places" || member.state === "suspendu_patron"
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-medium">{t.invite.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {teamSeatsLeft(team) > 0 ? t.invite.hint : t.full}
                </p>
              </div>
              {teamSeatsLeft(team) > 0 && <TeamInviteForm />}
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
