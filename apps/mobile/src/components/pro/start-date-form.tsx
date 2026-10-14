import { DEFAULT_CHANTIER_START_TIME, chantierStartInputError, parisToday } from "@menao/core";
import { dateLong } from "@menao/documents";
import { chantierStartSchema, messages } from "@menao/validation";
import { CalendarDays, Clock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { CompactDatePicker, CompactTimePicker } from "@/components/date-time-fields";
import { SlotWarnings } from "@/components/pro/slot-helpers";
import { fr } from "@/i18n/fr";
import { loadAppointmentAgenda } from "@/lib/pro-agenda";
import { confirmChantierStart } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proFollowUp;
const { colors, font, spacing } = theme;

/**
 * F-22 « Confirmer la date de démarrage » en pied de la vue du chantier (maquette « Date à
 * confirmer ») : date et heure côte à côte, date prévue au devis par défaut, avertissements de
 * l'agenda (F-44), comme sur le site. Le client est prévenu par la base.
 */
export function StartDateForm({
  chantierId,
  quoteStart,
  onConfirmed,
}: {
  chantierId: string;
  /** Date de début prévue au devis (AAAA-MM-JJ). */
  quoteStart: string | null;
  onConfirmed: () => void;
}) {
  const today = parisToday();
  const [date, setDate] = useState(quoteStart && quoteStart >= today ? quoteStart : today);
  const [time, setTime] = useState(DEFAULT_CHANTIER_START_TIME);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [agenda] = useFocusData(
    useCallback(
      () => loadAppointmentAgenda({ excludeChantierId: chantierId, withSuggestions: false }),
      [chantierId],
    ),
  );

  async function submit() {
    const parsed = chantierStartSchema.safeParse({ date, time });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      return setError(fields.date?.[0] ?? fields.time?.[0] ?? null);
    }
    const issue = chantierStartInputError(parsed.data.date, parsed.data.time, new Date());
    if (issue) return setError(issue === "invalide" ? messages.chantierStartDate : t.errors[issue]);
    setError(null);
    setPending(true);
    const failed = await confirmChantierStart(chantierId, parsed.data.date, parsed.data.time);
    setPending(false);
    if (failed) return setError(failed);
    onConfirmed();
  }

  return (
    <>
      <Text role="heading" style={styles.title}>
        {t.confirm}
      </Text>
      <View style={styles.fields}>
        <View style={styles.field}>
          <CalendarDays size={16} color={colors["muted-foreground"]} />
          <CompactDatePicker
            label={t.startDate}
            date={date}
            minDate={today}
            onDate={(value) => {
              setDate(value);
              setError(null);
            }}
          />
        </View>
        <View style={styles.field}>
          <Clock size={16} color={colors["muted-foreground"]} />
          <CompactTimePicker
            label={t.startTime}
            time={time}
            minuteInterval={5}
            onTime={(value) => {
              setTime(value);
              setError(null);
            }}
          />
        </View>
      </View>
      {quoteStart ? <Text style={styles.hint}>{t.quoteStart(dateLong(quoteStart))}</Text> : null}
      {agenda ? <SlotWarnings date={date} time={time} agenda={agenda} /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button label={t.confirm} onPress={submit} loading={pending} />
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  field: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
});
