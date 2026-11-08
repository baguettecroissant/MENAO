import { parisMonthStart, parseAiAgents, voiceGauge } from "@menao/core";
import { Headset } from "lucide-react";
import type { Metadata } from "next";
import { ListHeader } from "@/components/list-kit";
import { SecretaryView, type SecretaryViewName } from "@/components/pro/secretary-view";
import { ButtonLink, Card } from "@/components/ui";
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
    return (
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
          <ListHeader title={t.title} />
          <Card className="flex flex-col items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
              <Headset aria-hidden="true" className="size-5" />
            </span>
            <h2 className="text-lg font-medium">{t.notIncluded.title}</h2>
            <p className="text-sm text-muted-foreground">{t.notIncluded.text}</p>
            {patron ? (
              <ButtonLink href="/pro/onboarding/formule" className="sm:w-auto sm:px-6">
                {t.notIncluded.cta}
              </ButtonLink>
            ) : (
              <p className="text-sm">{t.notIncluded.askPatron}</p>
            )}
          </Card>
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
