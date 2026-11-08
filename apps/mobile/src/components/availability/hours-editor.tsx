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
import { Copy, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CompactTimePicker } from "@/components/date-time-fields";
import { CardHeading, FicheButton, FicheCard } from "@/components/pro/fiche-kit";
import { ToolSwitch } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatHour } from "@/lib/format";
import { saveHours } from "@/lib/pro-availability";
import { Chip, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability.hours;
const days = fr.proAgenda.weekdays;
const { colors, font, radius, spacing } = theme;
/** Modèles d'horaires courants (`@menao/core`, communs avec le site). */
const PRESET_KEYS = Object.keys(HOURS_PRESETS) as HoursPreset[];

/** Plages d'une journée en clair : « 8 h – 12 h · 13 h 30 – 17 h 30 ». */
const rangesText = (ranges: readonly DayRange[]) =>
  ranges.map((r) => `${formatHour(r.start)} – ${formatHour(r.end)}`).join(" · ");

/**
 * Horaires de travail de la semaine (F-44), comme sur le site : jusqu'à trois plages par jour,
 * modèles courants, recopie du lundi. Enregistrés en une fois, après les contrôles de
 * `@menao/core`. Refonte « Nette » (lot 8) : une ligne par jour (interrupteur, plages en clair,
 * « Modifier » qui déplie les heures du jour).
 */
export function HoursEditor({ initial, onSaved }: { initial: HoursRange[]; onSaved: () => void }) {
  const [week, setWeek] = useState<WeekHours>(() => weekHours(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(hoursOfWeek(weekHours(initial))));
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<{ success: string } | { error: string } | null>(null);
  // Jour dont les heures sont dépliées (« Modifier »).
  const [editing, setEditing] = useState<Weekday | null>(null);
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
    <FicheCard gap={3}>
      <CardHeading title={t.title} />
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

      <View>
        {WEEKDAYS.map((weekday, i) => {
          const day = days[i] ?? "";
          const lower = day.toLowerCase();
          const ranges = week[weekday];
          const open = ranges.length > 0;
          const dayIssue = open ? hoursErrors(ranges.map((r) => ({ weekday, ...r }))) : null;
          // Une erreur garde les heures du jour dépliées, pour la corriger.
          const unfolded = open && (editing === weekday || dayIssue !== null);
          return (
            <View key={weekday} style={styles.day}>
              <View style={styles.dayHead}>
                <Text style={styles.dayName}>{day}</Text>
                {open ? (
                  <Pressable
                    role="button"
                    aria-label={unfolded ? t.done : t.editDay(lower)}
                    aria-expanded={unfolded}
                    hitSlop={8}
                    onPress={() => setEditing(unfolded ? null : weekday)}
                    style={styles.edit}
                  >
                    <Text style={styles.linkText}>{unfolded ? t.done : t.edit}</Text>
                  </Pressable>
                ) : null}
                <ToolSwitch
                  label={t.open(lower)}
                  value={open}
                  onChange={(value) => {
                    update(weekday, value ? [...DEFAULT_DAY_RANGES] : []);
                    if (!value && editing === weekday) setEditing(null);
                  }}
                />
              </View>
              <Text style={[styles.summary, !open && styles.closed]}>
                {open ? rangesText(ranges) : t.closed}
              </Text>
              {unfolded ? (
                <View style={styles.ranges}>
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
                  {ranges.length < MAX_RANGES_PER_DAY ? (
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
                </View>
              ) : null}
              {dayIssue ? (
                <Text role="alert" style={styles.error}>
                  {t.errors[dayIssue]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

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
        <FicheButton
          label={t.save}
          onPress={() => void save()}
          loading={pending}
          disabled={issue !== null || !dirty}
        />
        {outcome && "error" in outcome ? <Notice tone="error">{outcome.error}</Notice> : null}
        {outcome && "success" in outcome && !dirty ? (
          <Notice tone="success">{outcome.success}</Notice>
        ) : null}
      </View>
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  day: {
    gap: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing(3),
  },
  dayHead: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  dayName: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  summary: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colors.label },
  closed: { color: colors["muted-foreground"] },
  edit: { minHeight: 32, justifyContent: "center" },
  ranges: { gap: spacing(2), marginTop: spacing(2) },
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
  linkText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
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
