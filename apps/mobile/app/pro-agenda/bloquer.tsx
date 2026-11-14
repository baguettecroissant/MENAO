import { AGENDA_LABEL_MAX_LENGTH, parisToday } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { DateTimeFields, TimeField } from "@/components/date-time-fields";
import { FicheButton, FicheCard, FicheScreen } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { addBlockedSlot, type BlockedSlotErrors } from "@/lib/pro-agenda";
import { Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";
import { syncPhoneCalendar } from "@/lib/phone-calendar";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proAgenda.block;
const TIME = /^\d{2}:\d{2}$/;

/**
 * « Bloquer un créneau » (F-44), comme sur le site : rendez-vous personnel, chantier hors MENAO…
 * Date, heures de début et de fin, motif facultatif ; l'agenda s'ouvre ensuite sur ce jour.
 * `debut` et `fin` : plage libre touchée dans l'agenda (« Libre de 14 h à 18 h · Bloquer »).
 */
function BlockSlotScreen() {
  const params = useLocalSearchParams<{
    date?: string;
    debut?: string;
    fin?: string;
    depuis?: string;
  }>();
  const today = parisToday();
  const [date, setDate] = useState(params.date && params.date >= today ? params.date : today);
  const range =
    params.debut && params.fin && TIME.test(params.debut) && TIME.test(params.fin)
      ? { start: params.debut, end: params.fin }
      : { start: "14:00", end: "16:00" };
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);
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
      void syncPhoneCalendar({ force: true });
      // Retour à l'agenda d'où l'on vient, sinon l'agenda remplace cet écran (bouton (+)).
      const agenda = {
        pathname: "/pro-agenda",
        params: { semaine: date, bloque: "1" },
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
    // Refonte « Nette » (lot 49, ADR 0318) : titre dans la barre, champs dans une carte, bouton
    // en bas d'écran.
    <FicheScreen
      title={t.title}
      keyboard
      footer={<FicheButton label={t.submit} onPress={() => void submit()} loading={pending} tall />}
    >
      <Text style={styles.intro}>{t.intro}</Text>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4} gap={3}>
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
      </FicheCard>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.label,
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("agenda", BlockSlotScreen);
