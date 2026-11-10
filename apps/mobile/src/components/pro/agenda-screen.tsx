import {
  absenceOn,
  addDays,
  agendaItemsAfter,
  defaultAgendaDay,
  freeRangesOn,
  minutesToTime,
  mondayOf,
  parisToday,
  placeAgendaItem,
  teamCan,
  weekDates,
  weekStartFrom,
  weekdayOf,
  type AgendaItemKind,
  type AvailabilityStatus,
  type PlacedAgendaItem,
} from "@menao/core";
import { router, useFocusEffect } from "expo-router";
import { Ban, ChevronLeft, ChevronRight, Palmtree, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ExampleLock } from "@/components/examples";
import { ListGroup, GroupTitle } from "@/components/list-kit";
import { FicheScreen, FicheTag, type FicheTone } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { useExamplesActive } from "@/lib/examples";
import { formatDay, formatDayMonth, formatHour, formatWeekShort } from "@/lib/format";
import { syncPhoneCalendar } from "@/lib/phone-calendar";
import { deleteBlockedSlot, loadAgendaWeek, type AgendaEntry } from "@/lib/pro-agenda";
import { useTeamPosition } from "@/lib/team";
import { useFocusData } from "@/lib/use-focus-data";
import { LinkText, Notice, Skeleton, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAgenda;
const { colors, font, radius, spacing } = theme;

type Placed = PlacedAgendaItem<AgendaEntry>;

/** Teinte d'un élément : visite (et rendez-vous de la secrétaire) en bleu, démarrage en vert. */
type Look = { tone: FicheTone; bar: string; dot: string; label: string };
const LOOKS: Record<AgendaItemKind, Look> = {
  visite: { tone: "primary", bar: colors.primary, dot: colors.primary, label: t.kinds.visite },
  demarrage: {
    tone: "success",
    bar: colors.success,
    dot: colors.success,
    label: t.kinds.demarrage,
  },
  creneau: {
    tone: "neutral",
    bar: colors["border-strong"],
    dot: colors["subtle-foreground"],
    label: t.kinds.creneau,
  },
  occupe: {
    tone: "neutral",
    bar: colors["border-strong"],
    dot: colors["subtle-foreground"],
    label: t.kinds.occupe,
  },
};
// Rendez-vous pris par Manon (ADR 0232) : un créneau bloqué, montré comme une visite.
const look = (item: Placed): Look => (item.secretary ? LOOKS.visite : LOOKS[item.kind]);

const STATUS_TONES: Record<AvailabilityStatus["kind"], FicheTone> = {
  disponible: "success",
  a_partir_du: "primary",
  pause: "warning",
  conges: "warning",
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

/** « Mardi 10 novembre ». */
const dayName = (day: string) =>
  t.dayTitle(t.weekdays[weekdayOf(day) - 1] ?? "", formatDayMonth(day));

/** Titre affiché : chantier, motif de l'appel pris par Manon, motif du créneau, ou son genre. */
const titleOf = (item: Placed) =>
  item.secretary?.reason ||
  item.title ||
  (item.kind === "occupe" ? t.legend.occupe : item.kind === "creneau" ? t.legend.creneau : "");

/** « Client · lieu », ou « Appelant · commune » d'un rendez-vous de Manon. */
const detailOf = (item: Placed) =>
  (item.secretary ? [item.secretary.caller, item.secretary.city] : [item.client, item.place])
    .filter(Boolean)
    .join(" · ");

const startOf = (item: Placed) => formatHour(minutesToTime(item.startMinutes));
// Démarrage : l'heure d'arrivée seulement (il occupe la journée).
const endOf = (item: Placed) =>
  item.kind === "demarrage" ? null : formatHour(minutesToTime(item.endMinutes));

const describe = (item: Placed) =>
  [
    look(item).label,
    item.secretary ? t.secretary : null,
    endOf(item) ? t.range(startOf(item), endOf(item) ?? "") : startOf(item),
    titleOf(item),
    detailOf(item),
  ]
    .filter(Boolean)
    .join(", ");

/**
 * Agenda de l'artisan (F-44), refonte « Nette » (lot 4) : barre du haut avec « Bloquer un
 * créneau », semaine (‹ 9 – 15 nov. ›) et statut de disponibilité, bande des 7 jours avec un point
 * par rendez-vous, puis les rendez-vous du jour choisi (vers le chantier, « Libérer » un créneau
 * bloqué), ses plages libres et la suite de la semaine. `week` : un jour de la semaine à afficher
 * (choisi d'emblée ; sinon la semaine en cours) ; `blocked` : créneau tout juste bloqué.
 */
export function AgendaScreen({ week, blocked }: { week: string | null; blocked: boolean }) {
  const [monday, setMonday] = useState(() => weekStartFrom(week, parisToday()));
  const [day, setDay] = useState(() =>
    week && mondayOf(week) === monday ? week : defaultAgendaDay(monday, parisToday()),
  );
  const load = useCallback(() => loadAgendaWeek(monday), [monday]);
  const [data, reload] = useFocusData(load);
  // Exemples (ADR 0184) : l'agenda se lit, rien ne se bloque ni ne se libère.
  const example = useExamplesActive();
  // Ouvrier (ADR 0241) : les rendez-vous de ses chantiers, en lecture ; créneaux, disponibilités et
  // calendrier du téléphone restent au patron et au chef d'équipe.
  const position = useTeamPosition();
  const canEdit = !position || teamCan(position, "agenda");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(
    blocked ? { tone: "success", text: t.block.added } : null,
  );
  // Calendrier du téléphone (ADR 0203) : synchronisé à l'affichage, l'agenda relu ensuite.
  useFocusEffect(
    useCallback(() => {
      if (!canEdit) return;
      let active = true;
      void syncPhoneCalendar().then((result) => {
        if (active && result === "ok") void reload();
      });
      return () => {
        active = false;
      };
    }, [reload, canEdit]),
  );

  const today = data?.today ?? parisToday();
  const days = weekDates(monday);
  const sunday = days[6] ?? monday;

  function goToWeek(next: string) {
    setMonday(next);
    setDay(defaultAgendaDay(next, today));
  }

  function openBlock(params: { date: string; debut?: string; fin?: string }) {
    router.push({ pathname: "/pro-agenda/bloquer", params: { ...params, depuis: "agenda" } });
  }

  const blockButton = canEdit ? (
    <ExampleLock locked={example}>
      <Tappable
        role="button"
        aria-label={t.block.open}
        onPress={() => openBlock({ date: day > today ? day : today })}
        style={styles.round}
      >
        <Ban size={20} color={colors.foreground} />
      </Tappable>
    </ExampleLock>
  ) : undefined;

  if (data === undefined) {
    return (
      <FicheScreen title={t.title} right={blockButton}>
        <View role="progressbar" aria-label={fr.nav.loading} aria-busy style={styles.skeleton}>
          <Skeleton width="55%" height={28} />
          <Skeleton height={76} style={styles.skeletonCard} />
          <Skeleton width="65%" height={20} />
          <Skeleton height={150} style={styles.skeletonCard} />
        </View>
      </FicheScreen>
    );
  }

  const thisWeek = monday === mondayOf(today);
  // Semaine précédente encore affichée pendant le chargement de la nouvelle.
  const current = data && data.monday === monday ? data : null;
  const placed = (current?.items ?? []).map(placeAgendaItem);
  const dayItems = placed.filter((p) => p.date === day);
  const later = agendaItemsAfter(placed, day, sunday);
  const absence = current ? absenceOn(current.absences, day) : null;
  const free = current
    ? freeRangesOn({
        date: day,
        hours: current.hours,
        absences: current.absences,
        items: placed,
        now: new Date(),
      })
    : [];

  async function release(item: Placed) {
    setNotice(null);
    const failed = await deleteBlockedSlot(item.id);
    setNotice(
      failed ? { tone: "error", text: failed } : { tone: "success", text: t.block.removed },
    );
    if (!failed) {
      void syncPhoneCalendar({ force: true });
      await reload();
    }
  }

  return (
    <FicheScreen title={t.title} right={blockButton} onRefresh={reload}>
      {data === null ? <Notice tone="error">{t.error}</Notice> : null}

      <View style={styles.weekRow}>
        <View style={styles.weekNav}>
          <Tappable
            role="button"
            aria-label={t.previousWeek}
            onPress={() => goToWeek(addDays(monday, -7))}
            style={styles.round}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </Tappable>
          <Text role="heading" aria-label={weekTitle(monday, sunday)} style={styles.weekTitle}>
            {formatWeekShort(monday, sunday)}
          </Text>
          <Tappable
            role="button"
            aria-label={t.nextWeek}
            onPress={() => goToWeek(addDays(monday, 7))}
            style={styles.round}
          >
            <ChevronRight size={20} color={colors.foreground} />
          </Tappable>
        </View>
        {current === null && data !== null ? (
          <ActivityIndicator color={colors.primary} />
        ) : current && canEdit ? (
          <Pressable
            role="link"
            aria-label={`${availabilityLabel(current.availability)}. ${t.manage}`}
            disabled={example}
            hitSlop={8}
            onPress={() => router.push("/pro-disponibilites")}
            style={({ pressed }) => [styles.status, pressed && styles.pressed]}
          >
            <FicheTag
              text={availabilityLabel(current.availability)}
              tone={STATUS_TONES[current.availability.kind]}
              dot
            />
          </Pressable>
        ) : null}
      </View>
      {!thisWeek ? <LinkText label={t.thisWeek} onPress={() => goToWeek(mondayOf(today))} /> : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <View role="tablist" aria-label={t.daysLabel} style={styles.strip}>
        {days.map((d, i) => {
          const selected = d === day;
          const items = placed.filter((p) => p.date === d);
          const absent = current ? absenceOn(current.absences, d) !== null : false;
          return (
            <Pressable
              key={d}
              role="tab"
              aria-selected={selected}
              aria-label={t.dayOption(dayName(d), items.length, absent, selected)}
              onPress={() => setDay(d)}
              style={({ pressed }) => [
                styles.stripDay,
                selected && styles.stripSelected,
                pressed && !selected && styles.stripPressed,
              ]}
            >
              <Text style={[styles.stripWeekday, selected && styles.stripTextSelected]}>
                {t.weekdaysShort[i]}
              </Text>
              <Text
                style={[
                  styles.stripNumber,
                  d === today && styles.stripToday,
                  selected && styles.stripTextSelected,
                ]}
              >
                {Number(d.slice(8, 10))}
              </Text>
              <View style={styles.dots}>
                {absent ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: selected ? colors.surface : colors.warning },
                    ]}
                  />
                ) : null}
                {items.slice(0, 4).map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.dot,
                      { backgroundColor: selected ? colors.surface : look(item).dot },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {canEdit && current && current.hours.length === 0 ? (
        <View style={styles.hoursMissing}>
          <Notice tone="info">{t.hoursMissing}</Notice>
          <LinkText label={t.setHours} onPress={() => router.push("/pro-disponibilites")} />
        </View>
      ) : null}

      {current ? (
        <>
          <GroupTitle title={dayName(day)} count={t.appointments(dayItems.length)} />
          <ListGroup>
            {absence ? (
              <View style={styles.absence}>
                <Palmtree size={16} color={colors.warning} />
                <Text style={styles.absenceText}>
                  {[t.kinds.absence, absence.label].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}
            {dayItems.map((item) => (
              <DayRow
                key={item.id}
                item={item}
                onFree={example || !canEdit || item.kind !== "creneau" ? null : () => release(item)}
              />
            ))}
            {dayItems.length === 0 && !absence ? (
              <Text style={styles.empty}>{t.emptyDay}</Text>
            ) : null}
            {free.length > 0 ? (
              <View style={styles.free}>
                <Text style={styles.freeText}>
                  {t.free(free.map((r) => ({ from: formatHour(r.start), to: formatHour(r.end) })))}
                </Text>
                {canEdit && free[0] ? (
                  <ExampleLock locked={example}>
                    <Pressable
                      role="button"
                      aria-label={t.freeBlockLabel(
                        dayName(day),
                        formatHour(free[0].start),
                        formatHour(free[0].end),
                      )}
                      hitSlop={10}
                      onPress={() =>
                        openBlock({ date: day, debut: free[0]?.start, fin: free[0]?.end })
                      }
                      style={({ pressed }) => [styles.freeLink, pressed && styles.pressed]}
                    >
                      <Ban size={14} color={colors["primary-strong"]} />
                      <Text style={styles.freeLinkText}>{t.freeBlock}</Text>
                    </Pressable>
                  </ExampleLock>
                ) : null}
              </View>
            ) : null}
          </ListGroup>

          {later.length > 0 ? (
            <>
              <GroupTitle title={t.later} count={later.length} />
              <ListGroup>
                {later.map((item) => (
                  <LaterRow key={item.id} item={item} onSelectDay={() => setDay(item.date)} />
                ))}
              </ListGroup>
            </>
          ) : null}
        </>
      ) : null}
    </FicheScreen>
  );
}

/** Pastilles d'un rendez-vous : son genre, et « Prise par Manon ». */
function Tags({ item }: { item: Placed }) {
  const l = look(item);
  return (
    <View style={styles.tags}>
      <FicheTag text={l.label} tone={l.tone} />
      {item.secretary ? <FicheTag text={t.secretary} tone="neutral" /> : null}
    </View>
  );
}

/** Rendez-vous du jour choisi : heures, filet de couleur, pastilles, titre, client · lieu. */
function DayRow({ item, onFree }: { item: Placed; onFree: (() => Promise<void>) | null }) {
  const [freeing, setFreeing] = useState(false);
  const end = endOf(item);
  const detail = detailOf(item);
  const content = (
    <>
      <View style={styles.time}>
        <Text style={styles.timeStart}>{startOf(item)}</Text>
        {end ? <Text style={styles.timeEnd}>{end}</Text> : null}
      </View>
      <View style={[styles.body, { borderLeftColor: look(item).bar }]}>
        <Tags item={item} />
        <Text style={styles.title} numberOfLines={2}>
          {titleOf(item)}
        </Text>
        {detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
    </>
  );
  const chantierId = item.chantierId;
  if (chantierId) {
    return (
      <Pressable
        role="link"
        aria-label={`${describe(item)}. ${t.openChantier(item.title ?? "")}`}
        onPress={() => router.push(`/pro-chantier/${chantierId}`)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={styles.row}>
      <View accessible aria-label={describe(item)} style={styles.rowStatic}>
        {content}
      </View>
      {onFree ? (
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
          style={styles.release}
        >
          {freeing ? (
            <ActivityIndicator size="small" color={colors["muted-foreground"]} />
          ) : (
            <X size={18} color={colors["muted-foreground"]} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/** Rendez-vous des jours suivants : jour et heure, filet, titre, genre · client ; vers le chantier ou le jour. */
function LaterRow({ item, onSelectDay }: { item: Placed; onSelectDay: () => void }) {
  const chantierId = item.chantierId;
  const who = item.secretary?.caller ?? item.client;
  return (
    <Pressable
      role={chantierId ? "link" : "button"}
      aria-label={`${dayName(item.date)}, ${describe(item)}. ${
        chantierId ? t.openChantier(item.title ?? "") : t.seeDay(dayName(item.date))
      }`}
      onPress={() => (chantierId ? router.push(`/pro-chantier/${chantierId}`) : onSelectDay())}
      style={({ pressed }) => [styles.row, styles.laterRow, pressed && styles.rowPressed]}
    >
      <View style={styles.time}>
        <Text style={styles.laterDay}>{t.weekdaysShort[weekdayOf(item.date) - 1]}</Text>
        <Text style={styles.laterHour}>{startOf(item)}</Text>
      </View>
      <View style={[styles.body, styles.laterBody, { borderLeftColor: look(item).bar }]}>
        <Text style={styles.title} numberOfLines={1}>
          {titleOf(item)}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {[look(item).label, who].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: spacing(4) },
  skeletonCard: { borderRadius: 18 },
  pressed: { opacity: 0.7 },
  round: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  weekNav: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  weekTitle: {
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  status: { flexShrink: 1 },
  hoursMissing: { gap: spacing(2) },
  strip: {
    flexDirection: "row",
    gap: 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(1),
  },
  stripDay: {
    flex: 1,
    alignItems: "center",
    gap: spacing(1),
    borderRadius: 14,
    paddingTop: spacing(2),
    paddingBottom: 10,
  },
  stripSelected: { backgroundColor: colors.foreground },
  stripPressed: { backgroundColor: colors.background },
  stripWeekday: {
    fontFamily: font.bold,
    fontSize: 11,
    textTransform: "uppercase",
    color: colors["muted-foreground"],
  },
  stripNumber: {
    fontFamily: font.display,
    fontSize: 19,
    lineHeight: 23,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  stripToday: { color: colors["primary-strong"] },
  stripTextSelected: { color: colors["primary-foreground"] },
  dots: { flexDirection: "row", gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  absence: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    backgroundColor: colors["warning-soft"],
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  absenceText: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.warning },
  empty: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(4),
    fontFamily: font.regular,
    fontSize: 15,
    color: colors["muted-foreground"],
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: colors.background },
  rowStatic: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  time: { width: 56, gap: 2 },
  timeStart: {
    fontFamily: font.display,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  timeEnd: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  body: { flex: 1, minWidth: 0, gap: spacing(1), borderLeftWidth: 3, paddingLeft: spacing(3) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  title: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
  detail: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  release: {
    width: 36,
    height: 36,
    marginTop: -spacing(1),
    marginRight: -spacing(2),
    alignItems: "center",
    justifyContent: "center",
  },
  free: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  freeText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  freeLink: { flexDirection: "row", alignItems: "center", gap: 5 },
  freeLinkText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  laterRow: { alignItems: "center", paddingVertical: 13 },
  laterDay: {
    fontFamily: font.bold,
    fontSize: 12,
    textTransform: "uppercase",
    color: colors["muted-foreground"],
  },
  laterHour: {
    fontFamily: font.display,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  laterBody: { gap: 2 },
});
