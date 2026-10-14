import {
  DEFAULT_DAY_RANGES,
  HOURS_PRESETS,
  MAX_RANGES_PER_DAY,
  WEEKDAYS,
  copyMondayToWeekdays,
  hoursErrors,
  hoursOfWeek,
  nextDayRange,
  weekHours,
  weeklyMinutes,
  type DayRange,
  type HoursPreset,
  type HoursRange,
  type WeekHours,
  type Weekday,
} from "@menao/core";
import { Clock, Copy, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { CompactTimePicker } from "@/components/date-time-fields";
import { fr } from "@/i18n/fr";
import { saveHours } from "@/lib/pro-availability";
import { Button, Card, Chip, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability.hours;
const days = fr.proAgenda.weekdays;
const { colors, font, radius, spacing } = theme;
/** Modèles d'horaires courants (`@menao/core`, communs avec le site). */
const PRESET_KEYS = Object.keys(HOURS_PRESETS) as HoursPreset[];

/**
 * Horaires de travail de la semaine (F-44), comme sur le site : jusqu'à trois plages par jour,
 * modèles courants, recopie du lundi. Enregistrés en une fois, après les contrôles de
 * `@menao/core`.
 */
export function HoursEditor({ initial, onSaved }: { initial: HoursRange[]; onSaved: () => void }) {
  const [week, setWeek] = useState<WeekHours>(() => weekHours(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(hoursOfWeek(weekHours(initial))));
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<{ success: string } | { error: string } | null>(null);
  const hours = hoursOfWeek(week);
  const json = JSON.stringify(hours);
  const dirty = json !== saved;
  const issue = hoursErrors(hours);
  const total = weeklyMinutes(hours);

  const update = (weekday: Weekday, ranges: DayRange[]) => {
    setOutcome(null);
    setWeek((current) => ({ ...current, [weekday]: ranges }));
  };
  const setRange = (weekday: Weekday, index: number, patch: Partial<DayRange>) =>
    update(
      weekday,
      week[weekday].map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );

  async function save() {
    setPending(true);
    const result = await saveHours(hours);
    setPending(false);
    setOutcome(result);
    if ("success" in result) {
      setSaved(json);
      onSaved();
    }
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <Clock size={18} color={colors.primary} />
        <Text role="heading" style={styles.heading}>
          {t.title}
        </Text>
      </View>
      <Text style={styles.text}>{t.text}</Text>
      <View aria-label={t.presetsLabel} style={styles.chips}>
        {PRESET_KEYS.map((key) => (
          <Chip
            key={key}
            label={t.presets[key]}
            onPress={() => {
              setOutcome(null);
              setWeek(weekHours(HOURS_PRESETS[key]));
            }}
          />
        ))}
      </View>

      {WEEKDAYS.map((weekday, i) => {
        const day = days[i] ?? "";
        const lower = day.toLowerCase();
        const ranges = week[weekday];
        const open = ranges.length > 0;
        const dayIssue = open ? hoursErrors(ranges.map((r) => ({ weekday, ...r }))) : null;
        return (
          <View key={weekday} style={styles.day}>
            <View style={styles.dayHead}>
              <Text style={styles.dayName}>{day}</Text>
              <View style={styles.switchRow}>
                <Text style={styles.small}>{open ? t.openShort : t.closed}</Text>
                <Switch
                  aria-label={t.open(lower)}
                  value={open}
                  onValueChange={(value) => update(weekday, value ? [...DEFAULT_DAY_RANGES] : [])}
                  trackColor={{ true: colors.primary, false: colors["border-strong"] }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>
            {ranges.map((range, index) => (
              <View key={index} style={styles.range}>
                <CompactTimePicker
                  label={t.from(lower, index + 1)}
                  time={range.start}
                  onTime={(start) => setRange(weekday, index, { start })}
                />
                <Text style={styles.dash}>–</Text>
                <CompactTimePicker
                  label={t.to(lower, index + 1)}
                  time={range.end}
                  onTime={(end) => setRange(weekday, index, { end })}
                />
                <Pressable
                  role="button"
                  aria-label={t.removeRange(lower, index + 1)}
                  hitSlop={8}
                  onPress={() =>
                    update(
                      weekday,
                      ranges.filter((_, j) => j !== index),
                    )
                  }
                  style={styles.iconButton}
                >
                  <Trash2 size={16} color={colors["muted-foreground"]} />
                </Pressable>
              </View>
            ))}
            {open && ranges.length < MAX_RANGES_PER_DAY ? (
              <Pressable
                role="button"
                aria-label={t.addRangeTo(lower)}
                hitSlop={8}
                onPress={() => update(weekday, [...ranges, nextDayRange(ranges)])}
                style={styles.link}
              >
                <Plus size={16} color={colors["primary-strong"]} />
                <Text style={styles.linkText}>{t.addRange}</Text>
              </Pressable>
            ) : null}
            {dayIssue ? (
              <Text role="alert" style={styles.error}>
                {t.errors[dayIssue]}
              </Text>
            ) : null}
          </View>
        );
      })}

      <Pressable
        role="button"
        aria-label={t.copyMonday}
        aria-disabled={week[1].length === 0}
        disabled={week[1].length === 0}
        onPress={() => {
          setOutcome(null);
          setWeek(copyMondayToWeekdays);
        }}
        style={[styles.link, week[1].length === 0 && styles.disabled]}
      >
        <Copy size={16} color={colors["primary-strong"]} />
        <Text style={styles.linkText}>{t.copyMondayShort}</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text aria-live="polite" style={styles.text}>
          {total > 0 ? t.total(Math.floor(total / 60), total % 60) : t.none}
        </Text>
        {dirty ? <Text style={styles.unsaved}>{t.unsaved}</Text> : null}
        <Button
          label={t.save}
          onPress={save}
          loading={pending}
          disabled={issue !== null || !dirty}
        />
        {outcome && "error" in outcome ? <Notice tone="error">{outcome.error}</Notice> : null}
        {outcome && "success" in outcome && !dirty ? (
          <Notice tone="success">{outcome.success}</Notice>
        ) : null}
      </View>
    </Card>
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  day: {
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayName: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  small: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  range: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  dash: { fontFamily: font.regular, fontSize: 15, color: colors["muted-foreground"] },
  iconButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing(1.5),
    paddingVertical: spacing(1),
  },
  linkText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  disabled: { opacity: 0.4 },
  error: { fontFamily: font.regular, fontSize: 12, color: colors.danger },
  footer: {
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(4),
  },
  unsaved: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: radius.chip,
    backgroundColor: colors["warning-soft"],
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.warning,
  },
});
