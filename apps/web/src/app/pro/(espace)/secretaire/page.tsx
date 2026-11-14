import { parisMonthStart, parseAiAgents, voiceGauge } from "@menao/core";
import { CalendarDays, CircleCheck, Phone, Send } from "lucide-react";
import type { Metadata } from "next";
import { SecretaryView, type SecretaryViewName } from "@/components/pro/secretary-view";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.secretaryPage;
const ts = fr.pro.onboarding.plans.secretary;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

type View = SecretaryViewName;
const MESSAGE_COLUMNS =
  "id, kind, caller_name, caller_phone, city, reason, urgent, appointment_at, done_at, created_at";

/**
 * Rubrique « Secrétaire » (ADR 0244) : d'abord les appels à traiter (rappeler, rendez-vous pris),
 * puis l'historique, l'essai et les réglages. Patron et chef d'équipe (ADR 0241). Hors formule :
 * présentation, et lien vers les formules pour le patron.
 */
export default async function SecretaryPage({ searchParams }: PageProps<"/pro/secretaire">) {
  const { vue } = await searchParams;
  const view: View = vue === "traites" ? "traites" : vue === "reglages" ? "reglages" : "a-traiter";
  const space = await requireTeamPermission("secretary");
  const { supabase, artisanId } = space;
  const { data: agentsData } = await supabase.rpc("my_ai_agents");
  const agents = parseAiAgents(agentsData);
  const patron = space.teamPosition === "patron";

  if (!agents.agents.secretary) {
    const n = t.notIncluded;
    const icons = [Phone, CalendarDays, Send];
    // Refonte « Nette » (lot 46, ADR 0315) : ce qu'elle fait à gauche, un exemple d'appel à droite.
    return (
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
          <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2rem]">{t.title}</h1>
          <div className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_1fr]">
            <Card className="flex flex-col items-start gap-4 sm:p-7">
              <StatusBadge tone="primary">{n.badge}</StatusBadge>
              <h2 className="font-display text-[1.625rem] leading-[1.15] font-bold tracking-tight">
                {n.title}
              </h2>
              <p className="text-[0.9375rem] leading-normal text-label">{n.lead}</p>
              <ul className="flex flex-col gap-3">
                {n.points.map(([title, text], i) => {
                  const Icon = icons[i] ?? Phone;
                  return (
                    <li key={title} className="flex items-start gap-3">
                      <span className="flex size-[2.125rem] shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-soft text-primary-strong">
                        <Icon aria-hidden="true" className="size-[1.0625rem]" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <b className="text-[0.9375rem] font-semibold">{title}</b>
                        <span className="text-[0.84375rem] leading-[1.4] text-muted-foreground">
                          {text}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {patron ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
                  <ButtonLink href="/pro/onboarding/formule" block={false}>
                    {n.cta}
                  </ButtonLink>
                  <span className="text-[0.8125rem] text-muted-foreground">{n.included}</span>
                </div>
              ) : (
                <p className="text-sm font-semibold">{n.askPatron}</p>
              )}
            </Card>
            <Card className="flex flex-col gap-3" role="region" aria-label={n.example.label}>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-success-soft text-success">
                  <Phone aria-hidden="true" className="size-[1.0625rem]" />
                </span>
                <span className="flex flex-col">
                  <b className="text-[0.90625rem] font-semibold">{n.example.incoming}</b>
                  <span className="text-[0.78125rem] text-muted-foreground">{n.example.busy}</span>
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-[0.875rem] bg-background p-3">
                {n.example.lines.map(([who, text]) => (
                  <p
                    key={text}
                    className={`max-w-[80%] rounded-[0.875rem] border border-border px-3 py-2.5 text-[0.84375rem] leading-[1.4] ${
                      who === "client" ? "self-end bg-primary-soft" : "self-start bg-surface"
                    }`}
                  >
                    <b className="block text-xs font-semibold text-muted-foreground">
                      {who === "client" ? n.example.client : n.example.secretary}
                    </b>
                    {text}
                  </p>
                ))}
              </div>
              <p className="flex items-center gap-2.5 rounded-xl bg-success-soft px-3 py-2.5 text-[0.84375rem]">
                <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                <span>
                  <b>{n.example.booked}</b> {n.example.bookedDetail}
                </span>
              </p>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  const monthStart = new Date(parisMonthStart(new Date()) * 1000).toISOString();
  const [{ data: settings }, { data: todo }, { data: done }, { count: hours }, { data: month }] =
    await Promise.all([
      supabase
        .from("secretary_settings")
        .select("display_name, can_book, visit_minutes, instructions")
        .eq("artisan_id", artisanId)
        .maybeSingle(),
      supabase
        .from("secretary_messages")
        .select(MESSAGE_COLUMNS)
        .eq("artisan_id", artisanId)
        .is("done_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("secretary_messages")
        .select(MESSAGE_COLUMNS)
        .eq("artisan_id", artisanId)
        .not("done_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("artisan_hours")
        .select("id", { count: "exact", head: true })
        .eq("artisan_id", artisanId),
      supabase
        .from("secretary_messages")
        .select("kind, created_at")
        .eq("artisan_id", artisanId)
        .gte("created_at", monthStart),
    ]);
  return (
    <SecretaryView
      view={view}
      name={settings?.display_name?.trim() || space.company || ts.title}
      company={space.company ?? ""}
      gauge={voiceGauge(agents)}
      topUps={patron && agents.agents.topUps}
      settings={settings ?? null}
      hours={Boolean(hours)}
      todo={todo ?? []}
      done={done ?? []}
      month={month ?? []}
    />
  );
}
