import { parisToday, type DateSouhaitMode } from "@menao/core";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DateTimeFields } from "@/components/date-time-fields";
import { RadioGroup } from "@/components/radio-group";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { saveLotStart } from "@/lib/project";
import { Button, LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.results.lots.start;
const CHOICES = ["chantier", "des_que_possible", "date", "inconnue"] as const;
type Choice = (typeof CHOICES)[number];

/**
 * Date de début d'un lot (ADR 0169), comme sur le site : celle du chantier, ou une date propre au
 * métier (le carreleur après le plombier). Modifiable tant que le lot n'a pas été envoyé.
 */
export function LotStart({
  projectId,
  tradeCode,
  trade,
  dateMode,
  dateSouhaitee,
  own,
  editable,
  onSaved,
}: {
  projectId: string;
  tradeCode: string;
  trade: string;
  dateMode: DateSouhaitMode;
  dateSouhaitee: string | null;
  own: boolean;
  editable: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<Choice>(own ? dateMode : "chantier");
  const [date, setDate] = useState<string | null>(own ? dateSouhaitee : null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const when =
    dateMode === "date" && dateSouhaitee
      ? formatLongDate(dateSouhaitee)
      : dateMode === "des_que_possible"
        ? t.asap
        : t.unknown;

  async function save() {
    setSaving(true);
    const failure = await saveLotStart(
      projectId,
      tradeCode,
      choice === "chantier" ? null : choice,
      choice === "date" ? date : null,
    );
    setSaving(false);
    setError(failure);
    if (failure) return;
    setEditing(false);
    onSaved();
  }

  if (!editing) {
    return (
      <View style={styles.line}>
        <Text style={styles.text}>
          {t.label(when)}
          {!own && editable ? ` (${t.same})` : ""}
        </Text>
        {editable ? <LinkText label={t.edit} onPress={() => setEditing(true)} /> : null}
      </View>
    );
  }
  return (
    <View style={styles.editor}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <RadioGroup
        legend={t.legend(trade)}
        options={CHOICES.map((value) => ({ value, label: t.options[value] }))}
        value={choice}
        onChange={setChoice}
      />
      {choice === "date" ? (
        <DateTimeFields date={date} minDate={parisToday()} onDate={setDate} dateLabel={t.pick} />
      ) : null}
      <Button
        label={t.save}
        onPress={save}
        loading={saving}
        disabled={choice === "date" && !date}
      />
      <Button
        label={t.cancel}
        variant="ghost"
        onPress={() => {
          setEditing(false);
          setError(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing(2) },
  text: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors["muted-foreground"] },
  editor: { gap: theme.spacing(3) },
});
