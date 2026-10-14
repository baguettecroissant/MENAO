import { AGENDA_LABEL_MAX_LENGTH, mondayOf, parisToday } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { DateTimeFields, TimeField } from "@/components/date-time-fields";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { addBlockedSlot, type BlockedSlotErrors } from "@/lib/pro-agenda";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.proAgenda.block;

/**
 * « Bloquer un créneau » (F-44), comme sur le site : rendez-vous personnel, chantier hors MENAO…
 * Date, heures de début et de fin, motif facultatif ; l'agenda s'ouvre ensuite sur cette semaine.
 */
export default function BlockSlotScreen() {
  const params = useLocalSearchParams<{ date?: string; depuis?: string }>();
  const today = parisToday();
  const [date, setDate] = useState(params.date && params.date >= today ? params.date : today);
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("16:00");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<BlockedSlotErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setFailure(null);
    setPending(true);
    const result = await addBlockedSlot({ date, start, end, label });
    setPending(false);
    if (result === null) {
      // Retour à l'agenda d'où l'on vient, sinon l'agenda remplace cet écran (bouton (+)).
      const agenda = {
        pathname: "/pro-agenda",
        params: { semaine: mondayOf(date), bloque: "1" },
      } as const;
      if (params.depuis === "agenda") router.navigate(agenda);
      else router.replace(agenda);
      return;
    }
    if ("fields" in result) return setErrors(result.fields);
    setErrors({});
    setFailure(result.error);
  }

  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <DateTimeFields
        date={date}
        minDate={today}
        dateLabel={t.date}
        onDate={(value) => {
          setDate(value);
          setErrors({});
        }}
        error={errors.date}
      />
      <TimeField
        label={t.start}
        time={start}
        onTime={(value) => {
          setStart(value);
          setErrors({});
        }}
        error={errors.start}
      />
      <TimeField
        label={t.end}
        time={end}
        onTime={(value) => {
          setEnd(value);
          setErrors({});
        }}
        error={errors.end}
      />
      <TextField
        label={t.label}
        value={label}
        onChangeText={setLabel}
        placeholder={t.labelPlaceholder}
        maxLength={AGENDA_LABEL_MAX_LENGTH}
        error={errors.label}
      />
    </Screen>
  );
}
