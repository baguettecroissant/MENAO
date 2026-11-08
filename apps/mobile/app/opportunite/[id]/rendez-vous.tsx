import { appointmentInputError, parisToday } from "@menao/core";
import { appointmentSchema, messages } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { FicheCard } from "@/components/pro/fiche-kit";
import { SlotSuggestions, SlotWarnings } from "@/components/pro/slot-helpers";
import { fr } from "@/i18n/fr";
import { loadAppointmentAgenda } from "@/lib/pro-agenda";
import { fixAppointment } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, celebrate } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proAppointment;

/**
 * F-17 « Fixer un rendez-vous », comme sur le site : date et heure d'arrivée (heure de Paris),
 * contrôlées à l'avance (à venir, dans les 6 mois) ; le chantier est créé et le client prévenu.
 * Agenda (F-44) : créneaux libres proposés et avertissements. Écran d'action « Nette » (lot 10).
 */
function FixAppointmentScreen() {
  const { id, client = "" } = useLocalSearchParams<{ id: string; client?: string }>();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>("09:00");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const today = parisToday();
  const [agenda] = useFocusData(useCallback(() => loadAppointmentAgenda(), []));

  async function submit() {
    const parsed = appointmentSchema.safeParse({ date: date ?? "", time: time ?? "" });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setError(fields.date?.[0] ?? fields.time?.[0]);
      return;
    }
    const issue = appointmentInputError(parsed.data.date, parsed.data.time, new Date());
    if (issue) {
      setError(issue === "invalide" ? messages.appointmentDate : t.errors[issue]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const result = await fixAppointment(id, parsed.data.date, parsed.data.time);
    setPending(false);
    if ("error" in result) return setFailure(result.error);
    // La fiche de la demande, rechargée, indique le rendez-vous fixé ; moment de réussite (ADR 0197).
    celebrate(fr.moments.appointment);
    router.back();
  }

  return (
    <ActionScreen
      bar={t.bar}
      title={t.title(client || null)}
      lead={t.hint}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      {agenda && agenda.suggestions.length > 0 ? (
        <FicheCard padding={4}>
          <SlotSuggestions
            suggestions={agenda.suggestions}
            date={date}
            time={time}
            onPick={(day, hour) => {
              setDate(day);
              setTime(hour);
              setError(undefined);
            }}
          />
        </FicheCard>
      ) : null}
      <FicheCard padding={4}>
        <DateTimeFields
          date={date}
          time={time}
          minDate={today}
          onDate={(value) => {
            setDate(value);
            setError(undefined);
          }}
          onTime={(value) => {
            setTime(value);
            setError(undefined);
          }}
          error={error}
        />
        {agenda ? <SlotWarnings date={date} time={time} agenda={agenda} /> : null}
      </FicheCard>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", FixAppointmentScreen);
