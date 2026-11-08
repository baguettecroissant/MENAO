import {
  APPOINTMENT_DURATION_MINUTES,
  isValidDate,
  parisLocalToDate,
  slotConflicts,
  slotWarnings,
} from "@menao/core";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatDayMonthShort, formatTime, parisDateTime } from "@/lib/format";
import type { AppointmentAgenda } from "@/lib/pro-agenda";
import { theme } from "@/ui/theme";
import { AlertLine, ChoicePills, SectionLabel } from "./action-kit";

const t = fr.proAppointment;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Créneaux libres proposés (F-44), comme sur le site : d'après les horaires et l'agenda de
 * l'artisan ; un appui remplit la date et l'heure. Pastilles « Nette » (lot 10).
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
  const current =
    suggestions.find((iso) => {
      const values = parisDateTime(iso);
      return values.date === date && values.time === time;
    }) ?? null;
  return (
    <View style={styles.group}>
      <SectionLabel text={t.suggestions} aside={t.suggestionsHint} />
      <ChoicePills
        label={t.suggestions}
        options={suggestions.map((iso) => ({
          value: iso,
          label: t.suggestion(formatDayMonthShort(iso), formatTime(iso)),
        }))}
        value={current}
        onChange={(iso) => {
          const values = parisDateTime(iso);
          onPick(values.date, values.time);
        }}
      />
    </View>
  );
}

/**
 * Avertissements (non bloquants) d'un rendez-vous ou d'un démarrage (F-44), comme sur le site :
 * absence, hors horaires, ou autre élément de l'agenda au même moment. Vide si la date ou l'heure
 * n'est pas encore valable.
 */
export function slotWarningTexts(
  date: string | null,
  time: string | null,
  agenda: AppointmentAgenda,
): string[] {
  if (!date || !time || !isValidDate(date) || !TIME.test(time)) return [];
  const start = parisLocalToDate(date, time);
  const duration = APPOINTMENT_DURATION_MINUTES;
  return slotWarnings({ start, durationMinutes: duration, ...agenda }).map((kind) => {
    if (kind !== "conflit") return t.warnings[kind];
    const what = slotConflicts(start, duration, agenda.busy)
      .map((b) =>
        [fr.proAgenda.kinds[b.kind], b.title, formatTime(b.start)].filter(Boolean).join(" · "),
      )
      .join(", ");
    return t.warnings.conflit(what);
  });
}

/** Avertissements sous la date et l'heure, en orange avec l'icône d'alerte (refonte « Nette »). */
export function SlotWarnings({
  date,
  time,
  agenda,
}: {
  date: string | null;
  time: string | null;
  agenda: AppointmentAgenda;
}) {
  const warnings = slotWarningTexts(date, time, agenda);
  if (warnings.length === 0) return null;
  return (
    <View aria-live="polite" style={styles.warnings}>
      {warnings.map((w) => (
        <AlertLine key={w} text={w} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing(2.5) },
  warnings: { gap: theme.spacing(2) },
});
