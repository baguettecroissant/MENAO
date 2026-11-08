import { AGENDA_LABEL_MAX_LENGTH, daysBetween } from "@menao/core";
import { CalendarDays, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { DateTimeFields } from "@/components/date-time-fields";
import { GroupTitle, ListGroup } from "@/components/list-kit";
import { CardHeading, FicheButton, FicheCard, FicheTag } from "@/components/pro/fiche-kit";
import { IconSquare, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatDayMonthShort } from "@/lib/format";
import type { AgendaAbsence } from "@/lib/pro-agenda";
import { addAbsence, deleteAbsence, type AbsenceErrors } from "@/lib/pro-availability";
import { Chip, Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability.absences;
const { colors, font, radius, spacing } = theme;

type Outcome = { success: string } | { error: string };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Congés et absences (F-44), comme sur le site : pendant une absence, l'artisan n'est plus proposé
 * dans les recherches. Absences en cours et à venir, ajout avec motifs fréquents. Refonte « Nette »
 * (lot 8) : « Absences prévues » en lignes, puis la carte « Ajouter une absence ».
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
    <>
      <GroupTitle title={t.planned} count={absences.length} />
      <Text style={styles.text}>{t.text}</Text>
      {absences.length === 0 ? (
        <Text style={styles.empty}>{t.empty}</Text>
      ) : (
        <ListGroup>
          {absences.map((a) => {
            const period = t.period(formatDayMonthShort(a.startsOn), formatDayMonthShort(a.endsOn));
            return (
              <View key={a.id} style={styles.item}>
                <IconSquare icon={CalendarDays} tone="warning" />
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>{capitalize(period)}</Text>
                  <Text style={styles.small}>
                    {[t.days(daysBetween(a.startsOn, a.endsOn) + 1), a.label]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {a.startsOn <= today ? <FicheTag text={t.ongoing} tone="warning" dot /> : null}
                </View>
                <Pressable
                  role="button"
                  aria-label={t.remove(period)}
                  aria-disabled={removing === a.id}
                  disabled={removing === a.id}
                  hitSlop={8}
                  onPress={() => void remove(a.id)}
                  style={styles.iconButton}
                >
                  {removing === a.id ? (
                    <ActivityIndicator size="small" color={colors["muted-foreground"]} />
                  ) : (
                    <X size={18} color={colors["muted-foreground"]} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </ListGroup>
      )}
      {outcome && "error" in outcome ? <Notice tone="error">{outcome.error}</Notice> : null}
      <FicheCard gap={3}>
        <CardHeading title={t.addTitle} size={17} />
        <AddAbsenceForm
          today={today}
          onAdded={() => {
            setOutcome(null);
            onChanged();
          }}
        />
      </FicheCard>
    </>
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
      <ToolField
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
      <FicheButton
        label={t.add}
        variant="secondary"
        onPress={() => void submit()}
        loading={pending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  empty: {
    borderRadius: radius.card,
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
    gap: spacing(3.5),
    paddingVertical: spacing(3.5),
    paddingLeft: spacing(4),
    paddingRight: spacing(2),
  },
  itemText: { flex: 1, gap: 3, alignItems: "flex-start" },
  itemTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  iconButton: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: spacing(3) },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
});
