import { parseTeam, teamIncluded, teamMemberName, teamSeatsLeft } from "@menao/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamInviteForm, TeamMemberActions } from "@/components/pro/team-forms";
import { SheetChip, sheetCard } from "@/components/pro/sheet";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";

const t = fr.pro.team;
const longDay = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

const TONES = {
  actif: "success",
  en_attente: "warning",
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

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((part) => part.slice(0, 1))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const percent =
    team.seats > 0 ? Math.round((Math.min(team.used, team.seats) / team.seats) * 100) : 0;
  // Refonte « Nette » (ADR 0253) : jauge des comptes, membres à gauche, invitation à droite.
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.lead}</p>
        </div>

        {!teamIncluded(team) ? (
          <section className={`${sheetCard} max-w-2xl`}>
            <h2 className="text-lg">{t.notIncluded.title}</h2>
            <p className="text-sm text-muted-foreground">{t.notIncluded.text}</p>
            <ButtonLink href="/pro/onboarding/formule" className="self-start">
              {t.notIncluded.cta}
            </ButtonLink>
          </section>
        ) : (
          <>
            <section
              aria-labelledby="team-seats"
              className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:gap-6 sm:p-6"
            >
              <div className="flex flex-col gap-1">
                <h2 id="team-seats" className="font-sans text-sm font-semibold text-label">
                  {t.seatsTitle}
                </h2>
                <span className="font-display text-[2rem] leading-none font-bold tabular-nums">
                  {t.seatsValue(team.used, team.seats)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <span
                  role="meter"
                  aria-label={t.seats(team.used, team.seats)}
                  aria-valuemin={0}
                  aria-valuemax={team.seats}
                  aria-valuenow={Math.min(team.used, team.seats)}
                  className="h-2.5 overflow-hidden rounded-pill bg-background"
                >
                  <span
                    className="block h-full rounded-pill bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  {t.seats(team.used, team.seats)}
                </span>
              </div>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <section aria-labelledby="team-members" className="flex min-w-0 flex-col gap-3">
                <h2 id="team-members" className="flex items-baseline gap-2 text-lg sm:text-xl">
                  {t.membersTitle}
                  <span className="font-sans text-sm font-semibold text-muted-foreground">
                    {team.members.length + 1}
                  </span>
                </h2>
                <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
                  <li className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary-strong">
                      {initials(you)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-bold">{you}</span>
                      <span className="text-sm text-muted-foreground">{t.patron}</span>
                    </div>
                    <SheetChip tone="success" dot>
                      {t.states.actif}
                    </SheetChip>
                  </li>
                  {team.members.map((member) => {
                    const name = teamMemberName(member);
                    return (
                      <li key={member.userId} className="flex flex-col gap-3 px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary-strong">
                            {initials(name)}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-bold">{name}</span>
                            <span className="truncate text-sm text-muted-foreground">
                              {[
                                t.roles[member.role],
                                member.email && name !== member.email ? member.email : null,
                                member.since
                                  ? t.since(longDay.format(new Date(member.since)))
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </div>
                          <SheetChip tone={TONES[member.state]} dot>
                            {t.states[member.state]}
                          </SheetChip>
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
                <p className="text-[0.8125rem] text-muted-foreground">{t.workerNote}</p>
              </section>

              <section aria-labelledby="team-invite" className={sheetCard}>
                <div className="flex flex-col gap-1">
                  <h2 id="team-invite" className="text-lg">
                    {t.invite.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {teamSeatsLeft(team) > 0 ? t.invite.hint : t.full}
                  </p>
                </div>
                {teamSeatsLeft(team) > 0 && <TeamInviteForm />}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
