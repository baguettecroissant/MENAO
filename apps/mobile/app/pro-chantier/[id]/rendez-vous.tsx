import { appointmentInputError, parisToday } from "@menao/core";
import { appointmentSchema, messages } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { rescheduleAppointment } from "@/lib/pro-chantiers";
import { Button, Notice, Screen, Title } from "@/ui";

const t = fr.proAppointment;
const paris = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Date (AAAA-MM-JJ) et heure (HH:MM) de Paris d'un instant, pour pré-remplir les champs. */
function parisValues(iso: string | undefined): { date: string | null; time: string } {
  if (!iso) return { date: null, time: "09:00" };
  const parts = Object.fromEntries(
    paris.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** F-18 « Modifier le rendez-vous », comme sur le site : nouvelle date et heure d'arrivée. */
export default function RescheduleScreen() {
  const { id, starts } = useLocalSearchParams<{ id: string; starts?: string }>();
  const initial = parisValues(starts);
  const [date, setDate] = useState<string | null>(initial.date);
  const [time, setTime] = useState<string | null>(initial.time);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    const failed = await rescheduleAppointment(id, parsed.data.date, parsed.data.time);
    setPending(false);
    if (failed) return setFailure(failed);
    router.back();
  }

  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.rescheduleSubmit} onPress={submit} loading={pending} />}
    >
      <Title>{t.rescheduleTitle}</Title>
      <DateTimeFields
        date={date}
        time={time}
        minDate={parisToday()}
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
    </Screen>
  );
}
