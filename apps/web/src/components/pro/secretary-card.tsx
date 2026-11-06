import { Phone } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDayTimeInline, formatPhone } from "@/lib/format";
import {
  SecretaryMessageToggle,
  SecretarySettingsForm,
  SecretaryTestCall,
} from "./secretary-forms";

const t = fr.pro.onboarding.plans.secretary;

export type SecretaryMessage = {
  id: string;
  kind: string;
  caller_name: string;
  caller_phone: string;
  city: string | null;
  reason: string;
  urgent: boolean;
  appointment_at: string | null;
  done_at: string | null;
  created_at: string;
};

/**
 * « Votre secrétaire » (F-83, ADR 0232) : essai par appel web, réglages, messages et rendez-vous
 * pris pour l'artisan. Affichée seulement si sa formule comprend la secrétaire.
 */
export function SecretaryCard({
  settings,
  fallbackName,
  hasHours,
  messages,
}: {
  settings: {
    display_name: string | null;
    can_book: boolean;
    visit_minutes: number;
    instructions: string | null;
  } | null;
  fallbackName: string;
  hasHours: boolean;
  messages: SecretaryMessage[];
}) {
  return (
    <Card id="secretaire" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <section aria-labelledby="secretaire-essai" className="flex flex-col gap-2">
        <h3 id="secretaire-essai" className="font-medium">
          {t.testTitle}
        </h3>
        <p className="text-sm text-muted-foreground">{t.testText}</p>
        <SecretaryTestCall />
      </section>
      <section
        aria-labelledby="secretaire-messages"
        className="flex flex-col gap-2 border-t border-border pt-4"
      >
        <h3 id="secretaire-messages" className="font-medium">
          {t.messagesTitle}
        </h3>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.messagesEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`flex flex-col gap-1 py-3 text-sm ${m.done_at ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {m.kind === "rendez_vous" && m.appointment_at
                      ? t.rdv(formatDayTimeInline(m.appointment_at))
                      : t.message}
                  </span>
                  {m.urgent && <StatusBadge tone="danger">{t.urgent}</StatusBadge>}
                  {m.done_at && <StatusBadge tone="neutral">{t.done}</StatusBadge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDayTimeInline(m.created_at)}
                  </span>
                </div>
                <p>
                  {m.caller_name}
                  {m.city ? ` · ${m.city}` : ""}
                </p>
                <p className="text-muted-foreground">{m.reason}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${m.caller_phone}`}
                    className="inline-flex items-center gap-1.5 font-medium text-primary-strong underline-offset-2 hover:underline"
                  >
                    <Phone aria-hidden="true" className="size-3.5" />
                    {t.call} {formatPhone(m.caller_phone)}
                  </a>
                  <SecretaryMessageToggle id={m.id} done={Boolean(m.done_at)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        aria-labelledby="secretaire-reglages"
        className="flex flex-col gap-3 border-t border-border pt-4"
      >
        <h3 id="secretaire-reglages" className="font-medium">
          {t.settingsTitle}
        </h3>
        {!hasHours && <p className="text-sm text-warning">{t.noHours}</p>}
        <SecretarySettingsForm
          displayName={settings?.display_name ?? null}
          fallbackName={fallbackName}
          canBook={settings?.can_book ?? true}
          visitMinutes={settings?.visit_minutes ?? 60}
          instructions={settings?.instructions ?? null}
        />
      </section>
    </Card>
  );
}
