import { parseAiAgents, voiceGauge } from "@menao/core";
import { CalendarCheck, Headset, MessageSquareText, Phone } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ListFilters, ListHeader, ListPanel } from "@/components/list-kit";
import type { SecretaryMessage } from "@/components/pro/secretary-message";
import {
  SecretaryMessageToggle,
  SecretarySettingsForm,
  SecretaryTestCall,
} from "@/components/pro/secretary-forms";
import { ButtonLink, Card, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";
import { formatDayTimeInline, formatPhone } from "@/lib/format";

const t = fr.pro.secretaryPage;
const ts = fr.pro.onboarding.plans.secretary;
const parisDay = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

type View = "a-traiter" | "traites" | "reglages";
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

  const [{ data: settings }, { data: todo }, { data: done }, { count: hours }] = await Promise.all([
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
  ]);
  const company = space.company ?? "";
  const name = settings?.display_name?.trim() || company || ts.title;
  const gauge = voiceGauge(agents);
  const toHandle = todo ?? [];
  const handled = done ?? [];

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
        <ListHeader title={t.title} />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">{t.lead(name)}</p>
          <p
            className={`text-sm ${gauge.level === "epuise" ? "text-danger" : gauge.level === "alerte" ? "text-warning" : "text-muted-foreground"}`}
          >
            {gauge.level === "epuise" ? t.noMinutes : t.minutes(gauge.remainingMinutes)}
            {patron && agents.agents.topUps && (
              <>
                {" · "}
                <TextLink href="/pro/onboarding/formule">{t.recharge}</TextLink>
              </>
            )}
          </p>
        </div>
        <ListFilters
          label={t.filters}
          items={[
            {
              href: "/pro/secretaire",
              label: t.todo,
              detail: toHandle.length > 0 ? String(toHandle.length) : undefined,
              tone: toHandle.some((m) => m.urgent) ? "danger" : "primary",
              active: view === "a-traiter",
            },
            { href: "/pro/secretaire?vue=traites", label: t.history, active: view === "traites" },
            {
              href: "/pro/secretaire?vue=reglages",
              label: t.settings,
              active: view === "reglages",
            },
          ]}
        />

        {view === "reglages" ? (
          <div className="flex flex-col gap-5">
            <Card className="flex flex-col gap-2">
              <h2 className="font-medium">{t.tryTitle}</h2>
              <p className="text-sm text-muted-foreground">{ts.testText}</p>
              <SecretaryTestCall />
            </Card>
            <Card className="flex flex-col gap-3">
              <h2 className="font-medium">{ts.settingsTitle}</h2>
              {!hours && <p className="text-sm text-warning">{ts.noHours}</p>}
              <SecretarySettingsForm
                displayName={settings?.display_name ?? null}
                fallbackName={company}
                canBook={settings?.can_book ?? true}
                visitMinutes={settings?.visit_minutes ?? 60}
                instructions={settings?.instructions ?? null}
              />
            </Card>
          </div>
        ) : (view === "traites" ? handled : toHandle).length === 0 ? (
          <>
            <EmptyState illustration="messages">
              {view === "traites" ? t.historyEmpty : t.todoEmpty}
            </EmptyState>
            {view === "a-traiter" && <SecretaryTestCall />}
          </>
        ) : (
          <ListPanel label={view === "traites" ? t.history : t.todo}>
            {(view === "traites" ? handled : toHandle).map((m) => (
              <CallRow key={m.id} message={m} />
            ))}
          </ListPanel>
        )}
      </div>
    </main>
  );
}

/** Un appel : qui, pourquoi, quand, puis « Appeler » et « Traité » d'un geste. */
function CallRow({ message: m }: { message: SecretaryMessage }) {
  const appointment = m.kind === "rendez_vous" && m.appointment_at ? m.appointment_at : null;
  const Icon = appointment ? CalendarCheck : MessageSquareText;
  return (
    <li className={`flex gap-3 px-4 py-4 sm:px-5 ${m.done_at ? "opacity-70" : ""}`}>
      <span
        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${appointment ? "bg-success-soft text-success" : "bg-primary-soft text-primary-strong"}`}
      >
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[0.9375rem] font-medium">
            {m.caller_name}
            {m.city ? ` · ${m.city}` : ""}
          </span>
          {m.urgent && <StatusBadge tone="danger">{ts.urgent}</StatusBadge>}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDayTimeInline(m.created_at)}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground/80">
          {appointment ? ts.rdv(formatDayTimeInline(appointment)) : ts.message}
        </p>
        <p className="text-sm text-muted-foreground">{m.reason}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={`tel:${m.caller_phone}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-strong"
          >
            <Phone aria-hidden="true" className="size-4" />
            {ts.call} {formatPhone(m.caller_phone)}
          </a>
          {appointment && (
            <Link
              href={`/pro/agenda?semaine=${parisDay.format(new Date(appointment))}` as Route}
              className="text-sm font-medium text-primary-strong underline-offset-2 hover:underline"
            >
              {t.seeAgenda}
            </Link>
          )}
          <SecretaryMessageToggle id={m.id} done={Boolean(m.done_at)} />
        </div>
      </div>
    </li>
  );
}
