import { appointmentInputError, parisToday } from "@menao/core";
import { appointmentSchema, messages } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { fixAppointment } from "@/lib/pro-requests";
import { Body, Button, Notice, Screen, Title } from "@/ui";

const t = fr.proAppointment;

/**
 * F-17 « Fixer un rendez-vous », comme sur le site : date et heure d'arrivée (heure de Paris),
 * contrôlées à l'avance (à venir, dans les 6 mois) ; le chantier est créé et le client prévenu.
 */
export default function FixAppointmentScreen() {
  const { id, client = "" } = useLocalSearchParams<{ id: string; client?: string }>();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>("09:00");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const today = parisToday();

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
    // La fiche de la demande, rechargée, indique le rendez-vous fixé.
    router.back();
  }

  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title(client || null)}</Title>
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
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Body muted>{t.hint}</Body>
    </Screen>
  );
}
