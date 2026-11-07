import { router, type Href } from "expo-router";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  activityCurrentMonth,
  activityYears,
  dashboardActivity,
  todoForPosition,
} from "@menao/core";
import { GradeCard } from "@/components/grade/grade-card";
import {
  ActivityShortcuts,
  InProgressCard,
  MoneyCard,
  QuotesCard,
  ReceivablesCard,
  RevenueCard,
} from "@/components/pro/dashboard-activity";
import { NewBadgeModal } from "@/components/grade/new-badge-modal";
import { PhotoNudge } from "@/components/pro/photo-nudge";
import { TodoList } from "@/components/pro/todo-list";
import { ExamplesCard } from "@/components/examples";
import { PushPrompt } from "@/components/push-prompt";
import { DashboardSkeleton } from "@/components/skeletons";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import {
  formatCents,
  formatDayAndTime,
  formatDuration,
  formatMonthName,
  formatToday,
} from "@/lib/format";
import { loadGrade, markBadgesSeen } from "@/lib/grade";
import { useExamplesActive } from "@/lib/examples";
import { loadDashboard, type Dashboard } from "@/lib/pro-dashboard";
import { useProfileSummary } from "@/lib/profile-summary";
import { useTeamPosition } from "@/lib/team";
import { useFocusData } from "@/lib/use-focus-data";
import { useUnread } from "@/lib/unread";
import { Notice, Tappable, useReveal } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDashboard;
const { colors, font, spacing } = theme;

/** Arc décoratif bleu clair des cartes de la maquette « Dashboard », comme sur le site. */
function Arc({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" aria-hidden style={style}>
      <Svg viewBox="0 0 64 40" width="100%" height="100%">
        <Path
          d="M6 36 A28 28 0 0 1 58 22"
          fill="none"
          stroke={colors["primary-soft"]}
          strokeWidth={8}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/** Indicateur : intitulé, valeur en bleu, détail facultatif ; ouvre l'écran concerné. */
function Kpi({
  label,
  value,
  detail,
  href,
  wide = false,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  href?: Href;
  wide?: boolean;
}) {
  const body = (
    <>
      {/* Arc dessiné d'abord : il reste sous le texte. */}
      <Arc style={styles.kpiArc} />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {detail ? <View style={styles.kpiDetailBox}>{detail}</View> : null}
    </>
  );
  const style = [styles.kpi, wide && styles.kpiWide];
  return href ? (
    <Tappable
      role="link"
      aria-label={`${label} : ${value}`}
      onPress={() => router.push(href)}
      style={style}
    >
      {body}
    </Tappable>
  ) : (
    <View style={style}>{body}</View>
  );
}

/** Évolution de l'encaissé : hausse en vert, baisse et stabilité en gris, comme sur le site. */
function Trend({ revenue }: { revenue: Dashboard["revenue"] }) {
  const { trend } = revenue;
  if (!trend) return null;
  const month = formatMonthName(revenue.previousMonth);
  const [Icon, up, text] =
    trend.kind === "nouveau"
      ? [TrendingUp, true, t.trend.nouveau(formatCents(trend.deltaCents), month)]
      : trend.kind === "hausse"
        ? [TrendingUp, true, t.trend.hausse(trend.percent, month)]
        : trend.kind === "baisse"
          ? [TrendingDown, false, t.trend.baisse(trend.percent, month)]
          : [Minus, false, t.trend.stable(month)];
  // Pastille du bandeau de l'argent (ADR 0245) : verte en hausse, grise sinon.
  return (
    <View style={[styles.trend, up ? styles.trendUp : styles.trendFlat]}>
      <Icon size={14} color={up ? colors.success : colors["muted-foreground"]} />
      <Text style={[styles.trendText, up && styles.success]}>{text}</Text>
    </View>
  );
}

/** Titre de section, avec un lien à droite (« Voir l'agenda », « Toutes mes demandes »). */
function SectionHead({ title, link }: { title: string; link?: { label: string; href: Href } }) {
  return (
    <View style={styles.sectionHead}>
      <Text role="heading" style={styles.sectionTitle}>
        {title}
      </Text>
      {link ? (
        <Tappable
          role="link"
          hitSlop={8}
          onPress={() => router.push(link.href)}
          style={styles.sectionLink}
        >
          <Text style={styles.sectionLinkText}>{link.label}</Text>
          <ArrowRight size={14} color={colors["primary-strong"]} />
        </Tappable>
      ) : null}
    </View>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Rendez-vous à venir (refonte « Nette », ADR 0245) : une ligne par rendez-vous dans la carte, icône
 * bleue pour une visite, verte pour un démarrage, avec le jour, l'heure et l'adresse.
 */
function AppointmentRow({
  appointment: a,
  first,
}: {
  appointment: Dashboard["appointments"][number];
  first: boolean;
}) {
  const { day, time } = formatDayAndTime(a.startsAt);
  const start = a.kind === "demarrage";
  return (
    <Tappable
      role="link"
      aria-label={t.appointment(t.kinds[a.kind], day, time, a.title)}
      onPress={() => router.push(`/pro-chantier/${a.chantierId}`)}
      style={[styles.appointment, !first && styles.appointmentBorder]}
    >
      <View style={[styles.appointmentIcon, start && styles.appointmentIconStart]}>
        <CalendarDays size={20} color={start ? colors.success : colors["primary-strong"]} />
      </View>
      <View style={styles.appointmentText}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {a.title}
        </Text>
        <View style={styles.row}>
          <Text style={styles.meta}>
            {fr.proAgenda.kinds[a.kind]} · {capitalize(day)}
          </Text>
          <Clock size={13} color={colors["muted-foreground"]} />
          <Text style={styles.meta}>{time}</Text>
        </View>
        {a.place ? (
          <View style={styles.row}>
            <MapPin size={13} color={colors.primary} />
            <Text style={styles.meta} numberOfLines={1}>
              {a.place}
            </Text>
          </View>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Tappable>
  );
}

/** Carte « Prochains rendez-vous » avec le lien vers l'agenda. */
function Upcoming({ appointments }: { appointments: Dashboard["appointments"] }) {
  return (
    <View style={styles.upcoming}>
      <SectionHead title={t.upcoming} link={{ label: t.openAgenda, href: "/pro-agenda" }} />
      {appointments.length === 0 ? (
        <Text style={styles.emptyText}>{t.noUpcoming}</Text>
      ) : (
        <View>
          {appointments.map((a, i) => (
            <AppointmentRow key={`${a.kind}-${a.chantierId}`} appointment={a} first={i === 0} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Tableau de bord de l'artisan (F-16), d'après les maquettes « Dashboard » et « Dashboard avec
 * RDV » et comme sur le site : en-tête (bonjour, cloche, photo), indicateurs, rendez-vous à venir
 * (en premier dès qu'il y en a), dernières demandes et raccourcis. Aucun lien vers l'abonnement ni
 * vers le site (règle 10).
 */
export function DashboardScreen() {
  const [data, reload] = useFocusData(loadDashboard, undefined, "tab:accueil");
  // Gamification (F-24) : carte « Mon grade MENAO » et badge tout juste obtenu à fêter.
  const [grade, reloadGrade] = useFocusData(loadGrade);
  const [celebrated, setCelebrated] = useState(false);
  // Photo de profil : carte d'invitation tant qu'il n'y en a pas.
  const profile = useProfileSummary();
  const { refresh } = useUnread();
  const [refreshing, setRefreshing] = useState(false);
  const examples = useExamplesActive();
  // Place dans l'entreprise (ADR 0241) : l'ouvrier voit ses rendez-vous et ses chantiers ; le chef,
  // tout sauf ce qui revient au patron (dossier, paiements en ligne, avis, grade, parrainage).
  const position = useTeamPosition() ?? "patron";
  const patron = position === "patron";
  // Année du chiffre d'affaires (ADR 0185) : l'année en cours, puis celle choisie.
  const [year, setYear] = useState<number | null>(null);
  // Squelette du tableau de bord pendant le premier chargement, puis fondu (ADR 0192).
  const reveal = useReveal(data !== undefined);
  const newBadge = celebrated
    ? null
    : (grade?.badges.find((b) => b.unlocked_at && !b.seen) ?? null);
  async function closeBadge(next?: () => void) {
    setCelebrated(true);
    await markBadgesSeen();
    next?.();
    reloadGrade();
  }

  const now = new Date();
  const years = data ? activityYears(data.activityInput.payments, now) : [];
  const shownYear = year !== null && years.includes(year) ? year : (years[0] ?? now.getFullYear());
  const activity = data ? dashboardActivity(data.activityInput, shownYear, now) : null;
  // Rendez-vous des jours suivants : ceux du jour sont dans « À faire maintenant ».
  const appointments = data ? <Upcoming appointments={data.later} /> : null;
  const todo = data ? todoForPosition(data.todo, position) : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              refresh();
              await Promise.all([reload(), reloadGrade()]);
              setRefreshing(false);
            }}
          />
        }
      >
        <TabHeader
          eyebrow={formatToday(now)}
          title={t.greeting(data?.firstName ?? null)}
          subtitle={data && position !== "ouvrier" ? t.todoLead(todo.length) : undefined}
        />

        {data === undefined ? (
          <DashboardSkeleton />
        ) : data === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : position === "ouvrier" ? (
          <Animated.View entering={reveal} style={styles.revealed}>
            {examples ? null : <PushPrompt />}
            <Upcoming appointments={data.appointments} />
            <Kpi label={t.worker.chantiers} value={t.worker.open} href="/pro/chantiers" wide />
          </Animated.View>
        ) : (
          <Animated.View entering={reveal} style={styles.revealed}>
            {data.suspended ? <Notice tone="error">{t.suspended}</Notice> : null}
            {data.radiated ? (
              <Notice tone="error">{t.radiated(data.radiated.reason)}</Notice>
            ) : null}
            {/* Inscription non finalisée : aucune action possible dans l'application (règle 10). */}
            {patron && data.visibility && data.visibility.missing.includes("abonnement") ? (
              <Notice tone="info">{t.hiddenSignup}</Notice>
            ) : null}
            {/* Rien reçu pour l'instant : l'espace rempli d'exemples (ADR 0184). */}
            {data.examplesShown && !examples ? (
              <ExamplesCard
                title={fr.proExamples.dashboardCard.title}
                text={fr.proExamples.dashboardCard.text}
                action={fr.proExamples.dashboardCard.open}
                onHide={() => void reload()}
              />
            ) : null}
            {examples ? null : <PushPrompt />}
            {activity ? (
              <MoneyCard
                monthCents={data.revenue.cents}
                trend={<Trend revenue={data.revenue} />}
                activity={activity}
              />
            ) : null}
            <TodoList items={todo} />
            <ActivityShortcuts
              example={examples}
              patron={patron}
              quoteHref={
                data.quoteChantierId
                  ? `/pro-chantier/${data.quoteChantierId}/devis`
                  : { pathname: "/pro/argent", params: { vue: "devis" } }
              }
            />
            {profile && !profile.avatarUrl ? <PhotoNudge /> : null}
            {activity ? (
              <>
                <InProgressCard activity={activity} />
                <QuotesCard
                  activity={activity}
                  extraStats={[
                    { label: t.awaitingQuote, value: t.clients(data.awaitingClients) },
                    {
                      label: t.responseTime,
                      value:
                        data.responseTime.minutes === null
                          ? "—"
                          : formatDuration(data.responseTime.minutes),
                      hint:
                        data.responseTime.minutes === null
                          ? t.noResponse
                          : t.responseDetail(data.responseTime.responses),
                    },
                  ]}
                />
                <RevenueCard
                  activity={activity}
                  years={years}
                  onYear={setYear}
                  currentMonth={activityCurrentMonth(shownYear, now)}
                />
                <ReceivablesCard activity={activity} />
              </>
            ) : null}
            {appointments}
            {patron && grade ? <GradeCard grade={grade} /> : null}
          </Animated.View>
        )}
      </ScrollView>
      <NewBadgeModal
        badge={newBadge}
        onClose={() => closeBadge()}
        onCollection={() => closeBadge(() => router.push("/pro-grade"))}
      />
    </SafeAreaView>
  );
}

const cardShadow = "0 1px 3px rgba(17, 23, 40, 0.06)";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(4), gap: spacing(6), paddingBottom: spacing(10) },
  revealed: { gap: spacing(6) },
  kpi: {
    flexGrow: 1,
    flexBasis: "40%",
    minHeight: 92,
    gap: spacing(1),
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
    boxShadow: cardShadow,
  },
  kpiWide: { flexBasis: "100%" },
  kpiLabel: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  kpiValue: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: colors.primary },
  kpiArc: { position: "absolute", right: -4, bottom: 6, width: 56, height: 36 },
  // Le détail s'arrête avant l'arc, comme sur le site.
  kpiDetailBox: { paddingRight: spacing(10) },
  // Évolution de l'encaissé en pastille (ADR 0245).
  trend: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(1.5),
    borderRadius: 14,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  trendUp: { backgroundColor: colors["success-soft"] },
  trendFlat: { backgroundColor: colors.background },
  trendText: {
    flexShrink: 1,
    fontFamily: font.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  success: { color: colors.success },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 19,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  sectionLink: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  sectionLinkText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  // Prochains rendez-vous : une carte, une ligne par rendez-vous (ADR 0245).
  upcoming: {
    gap: spacing(3),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(5),
    boxShadow: cardShadow,
  },
  appointment: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3),
  },
  appointmentBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  appointmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentIconStart: { backgroundColor: colors["success-soft"] },
  appointmentText: { flex: 1, gap: 3 },
  cardTitle: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
});
