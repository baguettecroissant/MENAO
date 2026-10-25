import { router, type Href } from "expo-router";
import {
  ArrowRight,
  CalendarDays,
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
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { activityCurrentMonth, activityYears, dashboardActivity } from "@menao/core";
import { GradeCard } from "@/components/grade/grade-card";
import {
  ActivityShortcuts,
  InProgressCard,
  QuotesCard,
  ReceivablesCard,
  RevenueCard,
} from "@/components/pro/dashboard-activity";
import { NewBadgeModal } from "@/components/grade/new-badge-modal";
import { PhotoNudge } from "@/components/pro/photo-nudge";
import { TodoList } from "@/components/pro/todo-list";
import { ExamplesCard } from "@/components/examples";
import { PushPrompt } from "@/components/push-prompt";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents, formatDayAndTime, formatDuration, formatMonthName } from "@/lib/format";
import { loadGrade, markBadgesSeen } from "@/lib/grade";
import { useExamplesActive } from "@/lib/examples";
import { loadDashboard, type Dashboard } from "@/lib/pro-dashboard";
import { useProfileSummary } from "@/lib/profile-summary";
import { useFocusData } from "@/lib/use-focus-data";
import { useUnread } from "@/lib/unread";
import { Notice, ScreenSkeleton, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDashboard;
const { colors, font, radius, spacing } = theme;
const ON_COLOR = colors["primary-foreground"];

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
  return (
    <View style={styles.trend}>
      <Icon size={14} color={up ? colors.success : colors["muted-foreground"]} />
      <Text style={[styles.kpiDetail, up && styles.success]}>{text}</Text>
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
 * Rendez-vous à venir (maquette « Dashboard avec RDV ») : bandeau bleu pour une visite, vert pour
 * un démarrage, avec le jour et l'heure ; titre et adresse du chantier dessous.
 */
function AppointmentCard({ appointment: a }: { appointment: Dashboard["appointments"][number] }) {
  const { day, time } = formatDayAndTime(a.startsAt);
  return (
    <Tappable
      role="link"
      aria-label={t.appointment(t.kinds[a.kind], day, time, a.title)}
      onPress={() => router.push(`/pro-chantier/${a.chantierId}`)}
      style={styles.card}
    >
      <View style={[styles.band, a.kind === "demarrage" && styles.bandStart]}>
        <View style={styles.bandKind}>
          <Text style={styles.bandKindText}>{fr.proAgenda.kinds[a.kind]}</Text>
        </View>
        <View style={styles.bandItem}>
          <CalendarDays size={15} color={ON_COLOR} />
          <Text style={styles.bandText}>{capitalize(day)}</Text>
        </View>
        <View style={styles.bandItem}>
          <Clock size={15} color={ON_COLOR} />
          <Text style={styles.bandText}>{time}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{a.title}</Text>
        {a.place ? (
          <View style={styles.row}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.meta}>{a.place}</Text>
          </View>
        ) : null}
      </View>
    </Tappable>
  );
}

/**
 * Tableau de bord de l'artisan (F-16), d'après les maquettes « Dashboard » et « Dashboard avec
 * RDV » et comme sur le site : en-tête (bonjour, cloche, photo), indicateurs, rendez-vous à venir
 * (en premier dès qu'il y en a), dernières demandes et raccourcis. Aucun lien vers l'abonnement ni
 * vers le site (règle 10).
 */
export function DashboardScreen() {
  const [data, reload] = useFocusData(loadDashboard);
  // Gamification (F-24) : carte « Mon grade MENAO » et badge tout juste obtenu à fêter.
  const [grade, reloadGrade] = useFocusData(loadGrade);
  const [celebrated, setCelebrated] = useState(false);
  // Photo de profil : carte d'invitation tant qu'il n'y en a pas.
  const profile = useProfileSummary();
  const { refresh } = useUnread();
  const [refreshing, setRefreshing] = useState(false);
  const examples = useExamplesActive();
  // Année du chiffre d'affaires (ADR 0185) : l'année en cours, puis celle choisie.
  const [year, setYear] = useState<number | null>(null);
  const newBadge = celebrated
    ? null
    : (grade?.badges.find((b) => b.unlocked_at && !b.seen) ?? null);
  async function closeBadge(next?: () => void) {
    setCelebrated(true);
    await markBadgesSeen();
    next?.();
    reloadGrade();
  }

  if (data === undefined) return <ScreenSkeleton />;
  const now = new Date();
  const years = data ? activityYears(data.activityInput.payments, now) : [];
  const shownYear = year !== null && years.includes(year) ? year : (years[0] ?? now.getFullYear());
  const activity = data ? dashboardActivity(data.activityInput, shownYear, now) : null;
  // Rendez-vous des jours suivants : ceux du jour sont dans « À faire maintenant ».
  const appointments = data ? (
    <View style={styles.section}>
      <SectionHead title={t.upcoming} link={{ label: t.openAgenda, href: "/pro-agenda" }} />
      {data.later.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <Text style={styles.emptyText}>{t.noUpcoming}</Text>
          <Arc style={styles.emptyArc} />
        </View>
      ) : (
        data.later.map((a) => <AppointmentCard key={`${a.kind}-${a.chantierId}`} appointment={a} />)
      )}
    </View>
  ) : null;

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
          title={t.greeting(data?.firstName ?? null)}
          subtitle={
            data ? (data.todo.length > 0 ? t.todoCount(data.todo.length) : t.allDone) : undefined
          }
        />

        {data === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : (
          <>
            {data.suspended ? <Notice tone="error">{t.suspended}</Notice> : null}
            {data.radiated ? (
              <Notice tone="error">{t.radiated(data.radiated.reason)}</Notice>
            ) : null}
            {/* Inscription non finalisée : aucune action possible dans l'application (règle 10). */}
            {data.visibility && data.visibility.missing.includes("abonnement") ? (
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
            <View style={styles.kpis}>
              <Kpi
                label={t.awaitingQuote}
                value={t.clients(data.awaitingClients)}
                href="/pro/chantiers"
              />
              <Kpi
                label={t.responseTime}
                value={
                  data.responseTime.minutes === null
                    ? "—"
                    : formatDuration(data.responseTime.minutes)
                }
                detail={
                  <Text style={styles.kpiDetail}>
                    {data.responseTime.minutes === null
                      ? t.noResponse
                      : t.responseDetail(data.responseTime.responses)}
                  </Text>
                }
                href="/pro/demandes"
              />
              <Kpi
                wide
                label={t.revenue}
                value={formatCents(data.revenue.cents)}
                detail={<Trend revenue={data.revenue} />}
                href={{ pathname: "/pro/argent", params: { vue: "factures" } }}
              />
            </View>
            <ActivityShortcuts
              example={examples}
              quoteHref={
                data.quoteChantierId
                  ? `/pro-chantier/${data.quoteChantierId}/devis`
                  : { pathname: "/pro/argent", params: { vue: "devis" } }
              }
            />
            <TodoList items={data.todo} />
            {profile && !profile.avatarUrl ? <PhotoNudge /> : null}
            {activity ? (
              <>
                <RevenueCard
                  activity={activity}
                  years={years}
                  onYear={setYear}
                  currentMonth={activityCurrentMonth(shownYear, now)}
                />
                <QuotesCard activity={activity} />
                <InProgressCard activity={activity} />
                <ReceivablesCard activity={activity} />
              </>
            ) : null}
            {appointments}
            {grade ? <GradeCard grade={grade} /> : null}
          </>
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
  content: { padding: spacing(5), gap: spacing(7), paddingBottom: spacing(10) },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  kpi: {
    flexGrow: 1,
    flexBasis: "40%",
    minHeight: 92,
    gap: spacing(1),
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
    boxShadow: cardShadow,
  },
  kpiWide: { flexBasis: "100%" },
  kpiLabel: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  kpiValue: { fontFamily: font.medium, fontSize: 22, lineHeight: 28, color: colors.primary },
  kpiDetail: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors["muted-foreground"],
  },
  kpiArc: { position: "absolute", right: -4, bottom: 6, width: 56, height: 36 },
  // Le détail s'arrête avant l'arc, comme sur le site.
  kpiDetailBox: { paddingRight: spacing(10) },
  trend: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1) },
  success: { color: colors.success },
  section: { gap: spacing(3) },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  sectionTitle: { flexShrink: 1, fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  sectionLink: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  sectionLinkText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  card: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: cardShadow,
  },
  band: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing(4),
    rowGap: spacing(1.5),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  bandStart: { backgroundColor: colors.success },
  bandKind: {
    borderRadius: radius.chip,
    backgroundColor: `${ON_COLOR}33`,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  bandKindText: { fontFamily: font.medium, fontSize: 12, color: ON_COLOR },
  bandItem: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  bandText: { fontFamily: font.medium, fontSize: 14, color: ON_COLOR },
  cardBody: { gap: spacing(2), padding: spacing(4) },
  cardTitle: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  empty: { paddingHorizontal: spacing(6), paddingVertical: spacing(10) },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
  emptyArc: { position: "absolute", right: -6, bottom: 8, width: 80, height: 48 },
});
