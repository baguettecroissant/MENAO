import {
  APPOINTMENT_DURATION_MINUTES,
  isValidDate,
  parisLocalToDate,
  slotConflicts,
  slotWarnings,
} from "@menao/core";
import { Sparkles, TriangleAlert } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatDayMonthShort, formatTime, parisDateTime } from "@/lib/format";
import type { AppointmentAgenda } from "@/lib/pro-agenda";
import { Chip } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAppointment;
const { colors, font, radius, spacing } = theme;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Créneaux libres proposés (F-44), comme sur le site : d'après les horaires et l'agenda de
 * l'artisan ; un appui remplit la date et l'heure.
 */
export function SlotSuggestions({
  suggestions,
  date,
  time,
  onPick,
}: {
  /** Instants ISO. */
  suggestions: string[];
  date: string | null;
  time: string | null;
  onPick: (date: string, time: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <View style={styles.group}>
      <View style={styles.titleRow}>
        <Sparkles size={16} color={colors.primary} />
        <Text role="heading" style={styles.title}>
          {t.suggestions}
        </Text>
      </View>
      <View style={styles.chips}>
        {suggestions.map((iso) => {
          const values = parisDateTime(iso);
          return (
            <Chip
              key={iso}
              label={t.suggestion(formatDayMonthShort(iso), formatTime(iso))}
              selected={values.date === date && values.time === time}
              onPress={() => onPick(values.date, values.time)}
            />
          );
        })}
      </View>
      <Text style={styles.hint}>{t.suggestionsHint}</Text>
    </View>
  );
}

/**
 * Avertissements (non bloquants) sous la date et l'heure d'un rendez-vous ou d'un démarrage
 * (F-44), comme sur le site : absence, hors horaires, ou autre élément de l'agenda au même moment.
 */
export function SlotWarnings({
  date,
  time,
  agenda,
}: {
  date: string | null;
  time: string | null;
  agenda: AppointmentAgenda;
}) {
  if (!date || !time || !isValidDate(date) || !TIME.test(time)) return null;
  const start = parisLocalToDate(date, time);
  const duration = APPOINTMENT_DURATION_MINUTES;
  const warnings = slotWarnings({ start, durationMinutes: duration, ...agenda }).map((kind) => {
    if (kind !== "conflit") return t.warnings[kind];
    const what = slotConflicts(start, duration, agenda.busy)
      .map((b) =>
        [fr.proAgenda.kinds[b.kind], b.title, formatTime(b.start)].filter(Boolean).join(" · "),
      )
      .join(", ");
    return t.warnings.conflit(what);
  });
  if (warnings.length === 0) return null;
  return (
    <View aria-live="polite" style={styles.warnings}>
      {warnings.map((w) => (
        <View key={w} style={styles.warning}>
          <TriangleAlert size={16} color={colors.warning} />
          <Text style={styles.warningText}>{w}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing(2) },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  title: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  warnings: {
    gap: spacing(1.5),
    borderRadius: radius.input,
    backgroundColor: colors["warning-soft"],
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2.5),
  },
  warning: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  warningText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.warning,
  },
});
