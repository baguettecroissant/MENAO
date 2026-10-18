import {
  absenceOn,
  addDays,
  minutesToTime,
  mondayOf,
  parisDateTime,
  parisToday,
  rangesOn,
  weekDates,
  weekStartFrom,
  weekdayOf,
  type AgendaItem,
  type AgendaItemKind,
  type AvailabilityStatus,
} from "@menao/core";
import { router } from "expo-router";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  HardHat,
  MapPin,
  Palmtree,
  UserRound,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatClock, formatDay, formatDayMonth } from "@/lib/format";
import { deleteBlockedSlot, loadAgendaWeek } from "@/lib/pro-agenda";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, LinkText, Notice, ScreenSkeleton, Tappable, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAgenda;
const { colors, font, radius, spacing } = theme;

const KIND_COLORS: Record<AgendaItemKind, { border: string; bg: string; fg: string }> = {
  visite: { border: colors.primary, bg: colors["primary-soft"], fg: colors["primary-strong"] },
  demarrage: { border: colors.success, bg: colors["success-soft"], fg: colors.success },
  creneau: {
    border: colors["border-strong"],
    bg: colors.background,
    fg: colors["muted-foreground"],
  },
};
const KIND_ICONS = { visite: UserRound, demarrage: HardHat, creneau: CalendarOff } as const;

const STATUS_COLORS: Record<AvailabilityStatus["kind"], { bg: string; fg: string }> = {
  disponible: { bg: colors["success-soft"], fg: colors.success },
  a_partir_du: { bg: colors["primary-soft"], fg: colors["primary-strong"] },
  pause: { bg: colors["warning-soft"], fg: colors.warning },
  conges: { bg: colors["warning-soft"], fg: colors.warning },
};

/** Libellé court du statut de disponibilité, comme le menu du site. */
function availabilityLabel(status: AvailabilityStatus): string {
  switch (status.kind) {
    case "pause":
      return t.availability.pause;
    case "conges":
      return t.availability.conges(formatDayMonth(status.until));
    case "a_partir_du":
      return t.availability.aPartirDu(formatDayMonth(status.date));
    default:
      return t.availability.disponible;
  }
}

/** « Du 12 au 18 octobre 2026 », « Du 26 octobre au 1 novembre 2026 »…, comme sur le site. */
function weekTitle(monday: string, sunday: string): string {
  if (monday.slice(0, 4) !== sunday.slice(0, 4))
    return t.week(formatDay(monday), formatDay(sunday));
  if (monday.slice(0, 7) !== sunday.slice(0, 7)) {
    return t.week(formatDayMonth(monday), formatDay(sunday));
  }
  return t.week(String(Number(monday.slice(8, 10))), formatDay(sunday));
}

type Placed = AgendaItem & { date: string; startMinutes: number; endMinutes: number };

const place = (item: AgendaItem): Placed => {
  const { date, minutes } = parisDateTime(new Date(item.start));
  return {
    ...item,
    date,
    startMinutes: minutes,
    endMinutes: Math.min(24 * 60, minutes + item.durationMinutes),
  };
};

const describe = (item: Placed) =>
  [
    t.kinds[item.kind],
    t.range(
      formatClock(minutesToTime(item.startMinutes)),
      formatClock(minutesToTime(item.endMinutes)),
    ),
    item.title,
    item.place,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Agenda de l'artisan (F-44), comme la version mobile du site : semaine par semaine, statut de
 * disponibilité (vers « Mes disponibilités »), « Bloquer un créneau », puis chaque jour ses horaires, son absence éventuelle, ses
 * visites et démarrages (vers le chantier) et ses créneaux bloqués (« Libérer »). `week` : un jour
 * de la semaine à afficher (sinon la semaine en cours) ; `blocked` : créneau tout juste bloqué.
 */
export function AgendaScreen({ week, blocked }: { week: string | null; blocked: boolean }) {
  const [monday, setMonday] = useState(() => weekStartFrom(week, parisToday()));
  const load = useCallback(() => loadAgendaWeek(monday), [monday]);
  const [data, reload] = useFocusData(load);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(
    blocked ? { tone: "success", text: t.block.added } : null,
  );

  if (data === undefined) return <ScreenSkeleton />;

  const today = data?.today ?? parisToday();
  const days = weekDates(monday);
  const sunday = days[6] ?? monday;
  const thisWeek = monday === mondayOf(today);
  // Semaine précédente encore affichée pendant le chargement de la nouvelle.
  const current = data && data.monday === monday ? data : null;
  const placed = (current?.items ?? []).map(place);

  async function free(item: Placed) {
    setNotice(null);
    const failed = await deleteBlockedSlot(item.id);
    setNotice(
      failed ? { tone: "error", text: failed } : { tone: "success", text: t.block.removed },
    );
    if (!failed) await reload();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TopBar />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.head}>
          <Title>{t.title}</Title>
          <Body muted>{t.subtitle}</Body>
        </View>
        {data === null ? <Notice tone="error">{t.error}</Notice> : null}

        <View style={styles.weekNav}>
          <Tappable
            role="button"
            aria-label={t.previousWeek}
            onPress={() => setMonday(addDays(monday, -7))}
            style={styles.navButton}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </Tappable>
          <Tappable
            role="button"
            aria-label={t.nextWeek}
            onPress={() => setMonday(addDays(monday, 7))}
            style={styles.navButton}
          >
            <ChevronRight size={20} color={colors.foreground} />
          </Tappable>
          {!thisWeek ? (
            <Tappable
              role="button"
              onPress={() => setMonday(mondayOf(today))}
              style={styles.todayButton}
            >
              <Text style={styles.todayText}>{t.thisWeek}</Text>
            </Tappable>
          ) : null}
          {current === null && data !== null ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
        <Text role="heading" style={styles.weekTitle}>
          {weekTitle(monday, sunday)}
        </Text>

        {current ? (
          <Pressable
            role="link"
            aria-label={`${availabilityLabel(current.availability)}. ${t.manage}`}
            onPress={() => router.push("/pro-disponibilites")}
            style={({ pressed }) => [
              styles.status,
              { backgroundColor: STATUS_COLORS[current.availability.kind].bg },
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS[current.availability.kind].fg },
              ]}
            />
            <Text
              style={[styles.statusText, { color: STATUS_COLORS[current.availability.kind].fg }]}
            >
              {availabilityLabel(current.availability)}
            </Text>
          </Pressable>
        ) : null}
        <Button
          label={t.block.open}
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/pro-agenda/bloquer",
              params: { date: monday > today ? monday : today, depuis: "agenda" },
            })
          }
        />
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

        {current && current.hours.length === 0 ? (
          <View style={styles.hoursMissing}>
            <Notice tone="info">{t.hoursMissing}</Notice>
            <LinkText label={t.setHours} onPress={() => router.push("/pro-disponibilites")} />
          </View>
        ) : null}
        {current && current.items.length === 0 && current.absences.length === 0 ? (
          <Body muted>{t.emptyWeek}</Body>
        ) : null}

        {current
          ? days.map((day, i) => {
              const ranges = rangesOn(current.hours, weekdayOf(day));
              const absence = absenceOn(current.absences, day);
              const dayItems = placed.filter((p) => p.date === day);
              const isToday = day === today;
              return (
                <View key={day} style={[styles.day, isToday && styles.dayToday]}>
                  <View style={styles.dayHead}>
                    <Text role="heading" style={styles.dayTitle}>
                      {`${t.weekdays[i]} ${formatDayMonth(day)}`}
                    </Text>
                    {isToday ? <Text style={styles.todayMark}>{t.thisWeek}</Text> : null}
                  </View>
                  {current.hours.length > 0 ? (
                    <Text style={styles.small}>
                      {ranges.length > 0
                        ? ranges
                            .map((r) => t.range(formatClock(r.start), formatClock(r.end)))
                            .join(" · ")
                        : t.closed}
                    </Text>
                  ) : null}
                  {absence ? (
                    <View style={styles.absence}>
                      <Palmtree size={14} color={colors.warning} />
                      <Text style={styles.absenceText}>
                        {[t.kinds.absence, absence.label].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  ) : null}
                  {dayItems.length > 0 ? (
                    dayItems.map((item) => (
                      <AgendaRow key={item.id} item={item} onFree={() => free(item)} />
                    ))
                  ) : !absence ? (
                    <Text style={styles.empty}>{t.emptyDay}</Text>
                  ) : null}
                </View>
              );
            })
          : null}

        <View aria-label={t.legendLabel} style={styles.legend}>
          {(["visite", "demarrage", "creneau"] as const).map((kind) => (
            <View key={kind} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  {
                    borderLeftColor: KIND_COLORS[kind].border,
                    backgroundColor: KIND_COLORS[kind].bg,
                  },
                ]}
              />
              <Text style={styles.small}>{t.legend[kind]}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendAbsence]} />
            <Text style={styles.small}>{t.legend.absence}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Visite ou démarrage (vers le chantier), ou créneau bloqué (avec « Libérer »). */
function AgendaRow({ item, onFree }: { item: Placed; onFree: () => Promise<void> }) {
  const [freeing, setFreeing] = useState(false);
  const Icon = KIND_ICONS[item.kind];
  const c = KIND_COLORS[item.kind];
  const body = (
    <View style={styles.rowBody}>
      <View style={styles.rowLine}>
        <Icon size={14} color={c.fg} />
        <Text style={[styles.rowKind, { color: c.fg }]}>
          {`${formatClock(minutesToTime(item.startMinutes))} · ${t.kinds[item.kind]}`}
        </Text>
      </View>
      {item.title ? <Text style={styles.rowTitle}>{item.title}</Text> : null}
      {item.place ? (
        <View style={styles.rowLine}>
          <MapPin size={12} color={colors["muted-foreground"]} />
          <Text style={styles.small}>{item.place}</Text>
        </View>
      ) : null}
    </View>
  );
  const rowStyle = [styles.row, { borderLeftColor: c.border, backgroundColor: c.bg }];
  const chantierId = item.chantierId;
  if (chantierId) {
    return (
      <Tappable
        role="link"
        aria-label={describe(item)}
        onPress={() => router.push(`/pro-chantier/${chantierId}`)}
        style={rowStyle}
      >
        {body}
      </Tappable>
    );
  }
  return (
    <View style={rowStyle}>
      {body}
      <Pressable
        role="button"
        aria-label={t.block.remove(describe(item))}
        aria-disabled={freeing}
        disabled={freeing}
        hitSlop={8}
        onPress={async () => {
          setFreeing(true);
          await onFree();
          setFreeing(false);
        }}
        style={styles.free}
      >
        {freeing ? (
          <ActivityIndicator size="small" color={colors["muted-foreground"]} />
        ) : (
          <X size={16} color={colors["muted-foreground"]} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
  head: { gap: spacing(2), marginBottom: spacing(1) },
  weekNav: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  todayButton: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
  },
  todayText: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  pressed: { opacity: 0.8 },
  weekTitle: { fontFamily: font.medium, fontSize: 18, color: colors.foreground },
  status: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  hoursMissing: { gap: spacing(2) },
  statusText: { fontFamily: font.medium, fontSize: 14 },
  day: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  dayToday: { borderColor: colors.primary },
  dayHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  dayTitle: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  todayMark: { fontFamily: font.medium, fontSize: 12, color: colors.primary },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  absence: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.chip,
    backgroundColor: colors["warning-soft"],
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  absenceText: { fontFamily: font.medium, fontSize: 12, color: colors.warning },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors["subtle-foreground"] },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(2),
    borderLeftWidth: 3,
    borderRadius: radius.input,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  rowBody: { flex: 1, gap: spacing(0.5) },
  rowLine: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  rowKind: { fontFamily: font.medium, fontSize: 13 },
  rowTitle: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  free: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing(4), marginTop: spacing(1) },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  legendSwatch: { width: 12, height: 12, borderRadius: 3, borderLeftWidth: 3 },
  legendAbsence: {
    borderLeftWidth: 0,
    backgroundColor: colors["warning-soft"],
  },
});
