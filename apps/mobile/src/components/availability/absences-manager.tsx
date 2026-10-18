import { AGENDA_LABEL_MAX_LENGTH, daysBetween } from "@menao/core";
import { Palmtree, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { DateTimeFields } from "@/components/date-time-fields";
import { fr } from "@/i18n/fr";
import { formatDayMonthShort } from "@/lib/format";
import type { AgendaAbsence } from "@/lib/pro-agenda";
import { addAbsence, deleteAbsence, type AbsenceErrors } from "@/lib/pro-availability";
import { Button, Card, Chip, Notice, TextField, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability.absences;
const { colors, font, radius, spacing } = theme;

type Outcome = { success: string } | { error: string };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Congés et absences (F-44), comme sur le site : pendant une absence, l'artisan n'est plus proposé
 * dans les recherches. Absences en cours et à venir, ajout avec motifs fréquents.
 */
export function AbsencesManager({
  absences,
  today,
  onChanged,
}: {
  absences: AgendaAbsence[];
  today: string;
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    const result = await deleteAbsence(id);
    setRemoving(null);
    if ("success" in result) {
      toast.success(result.success);
      setOutcome(null);
      onChanged();
    } else setOutcome(result);
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <Palmtree size={18} color={colors.primary} />
        <Text role="heading" style={styles.heading}>
          {t.title}
        </Text>
      </View>
      <Text style={styles.text}>{t.text}</Text>
      {absences.length === 0 ? (
        <Text style={styles.empty}>{t.empty}</Text>
      ) : (
        absences.map((a) => {
          const period = t.period(formatDayMonthShort(a.startsOn), formatDayMonthShort(a.endsOn));
          return (
            <View key={a.id} style={styles.item}>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{capitalize(period)}</Text>
                <Text style={styles.small}>
                  {[t.days(daysBetween(a.startsOn, a.endsOn) + 1), a.label]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              {a.startsOn <= today ? <StatusPill text={t.ongoing} tone="warning" /> : null}
              <Pressable
                role="button"
                aria-label={t.remove(period)}
                aria-disabled={removing === a.id}
                disabled={removing === a.id}
                hitSlop={8}
                onPress={() => remove(a.id)}
                style={styles.iconButton}
              >
                {removing === a.id ? (
                  <ActivityIndicator size="small" color={colors["muted-foreground"]} />
                ) : (
                  <X size={16} color={colors["muted-foreground"]} />
                )}
              </Pressable>
            </View>
          );
        })
      )}
      {outcome && "error" in outcome ? <Notice tone="error">{outcome.error}</Notice> : null}
      <AddAbsenceForm
        today={today}
        onAdded={() => {
          setOutcome(null);
          onChanged();
        }}
      />
    </Card>
  );
}

function AddAbsenceForm({ today, onAdded }: { today: string; onAdded: () => void }) {
  const [startsOn, setStartsOn] = useState<string | null>(null);
  const [endsOn, setEndsOn] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<AbsenceErrors>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    const result = await addAbsence({
      startsOn: startsOn ?? "",
      endsOn: endsOn ?? startsOn ?? "",
      label,
    });
    setPending(false);
    if ("fields" in result) {
      setErrors(result.fields);
      setOutcome(null);
      return;
    }
    setErrors({});
    setOutcome("success" in result ? null : result);
    if ("success" in result) {
      toast.success(result.success);
      setStartsOn(null);
      setEndsOn(null);
      setLabel("");
      onAdded();
    }
  }

  return (
    <View style={styles.form}>
      <DateTimeFields
        date={startsOn}
        minDate={today}
        dateLabel={t.from}
        onDate={(value) => {
          setStartsOn(value);
          // Le dernier jour ne peut pas précéder le premier : il le suit par défaut.
          if (!endsOn || endsOn < value) setEndsOn(value);
          setErrors({});
        }}
        error={errors.startsOn}
        compact
      />
      <DateTimeFields
        date={endsOn}
        minDate={startsOn ?? today}
        dateLabel={t.to}
        onDate={(value) => {
          setEndsOn(value);
          setErrors({});
        }}
        error={errors.endsOn}
        compact
      />
      <TextField
        label={t.label}
        value={label}
        onChangeText={setLabel}
        maxLength={AGENDA_LABEL_MAX_LENGTH}
        error={errors.label}
      />
      <View aria-label={t.suggestionsLabel} style={styles.chips}>
        {t.suggestions.map((s) => (
          <Chip key={s} label={s} selected={label === s} onPress={() => setLabel(s)} />
        ))}
      </View>
      {outcome && "error" in outcome ? <Notice tone="error">{outcome.error}</Notice> : null}
      {outcome && "success" in outcome ? <Notice tone="success">{outcome.success}</Notice> : null}
      <Button label={t.add} variant="secondary" onPress={submit} loading={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  text: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  empty: {
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(5),
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: spacing(2),
    paddingLeft: spacing(3.5),
    paddingRight: spacing(1.5),
  },
  itemText: { flex: 1, gap: spacing(0.5) },
  itemTitle: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  iconButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  form: {
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(4),
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
});
