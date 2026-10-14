import { DEFAULT_CHANTIER_START_TIME, chantierStartInputError, parisToday } from "@menao/core";
import { dateLong } from "@menao/documents";
import { chantierStartSchema, messages } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { SlotWarnings } from "@/components/pro/slot-helpers";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { parisDateTime } from "@/lib/format";
import { loadAppointmentAgenda } from "@/lib/pro-agenda";
import { confirmChantierStart } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Screen, Title } from "@/ui";

const t = fr.proFollowUp;

/**
 * F-22 « Confirmer la date de démarrage » après l'acompte (`devis` : date prévue au devis), ou la
 * modifier tant que les travaux n'ont pas commencé (`debut` : démarrage actuel), comme sur le
 * site, avec les avertissements de l'agenda (F-44). Le client est prévenu par la base.
 */
export default function ChantierStartScreen() {
  const { id, devis, debut } = useLocalSearchParams<{
    id: string;
    devis?: string;
    debut?: string;
  }>();
  const today = parisToday();
  const editing = Boolean(debut);
  const initial = debut
    ? parisDateTime(debut)
    : { date: devis && devis >= today ? devis : null, time: DEFAULT_CHANTIER_START_TIME };
  const [date, setDate] = useState<string | null>(initial.date);
  const [time, setTime] = useState<string | null>(initial.time);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [agenda] = useFocusData(
    useCallback(
      () => loadAppointmentAgenda({ excludeChantierId: id, withSuggestions: false }),
      [id],
    ),
  );

  async function submit() {
    const parsed = chantierStartSchema.safeParse({ date: date ?? "", time: time ?? "" });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setError(fields.date?.[0] ?? fields.time?.[0]);
      return;
    }
    const issue = chantierStartInputError(parsed.data.date, parsed.data.time, new Date());
    if (issue) {
      setError(issue === "invalide" ? messages.chantierStartDate : t.errors[issue]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await confirmChantierStart(id, parsed.data.date, parsed.data.time);
    setPending(false);
    if (failed) return setFailure(failed);
    if (editing) router.back();
    else
      router.dismissTo({ pathname: "/pro-chantier/[id]", params: { id, demarrage: "confirme" } });
  }

  return (
    <Screen
      header={<TopBar />}
      footer={
        <Button label={editing ? t.editSubmit : t.confirm} onPress={submit} loading={pending} />
      }
    >
      <Title>{editing ? t.editTitle : t.confirm}</Title>
      {!editing && devis ? <Body muted>{t.quoteStart(dateLong(devis))}</Body> : null}
      <DateTimeFields
        date={date}
        time={time}
        minDate={today}
        dateLabel={t.startDate}
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
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </Screen>
  );
}
