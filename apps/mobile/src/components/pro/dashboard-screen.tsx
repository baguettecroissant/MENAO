import { timeLeft } from "@menao/core";
import { router, type Href } from "expo-router";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Clock,
  FileText,
  MapPin,
  Minus,
  ReceiptText,
  Star,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
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
import { StatusPill } from "@/components/chantier/parts";
import { PushPrompt } from "@/components/push-prompt";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents, formatDayAndTime, formatDuration, formatMonthName } from "@/lib/format";
import { loadDashboard, type Dashboard } from "@/lib/pro-dashboard";
import { requestStart } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { useUnread } from "@/lib/unread";
import { Notice } from "@/ui";
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
    <Pressable
      role="link"
      aria-label={`${label} : ${value}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => [...style, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
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
        <Pressable
          role="link"
          hitSlop={8}
          onPress={() => router.push(link.href)}
          style={({ pressed }) => [styles.sectionLink, pressed && styles.pressed]}
        >
          <Text style={styles.sectionLinkText}>{link.label}</Text>
          <ArrowRight size={14} color={colors["primary-strong"]} />
        </Pressable>
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
    <Pressable
      role="link"
      aria-label={t.appointment(t.kinds[a.kind], day, time, a.title)}
      onPress={() => router.push(`/pro-chantier/${a.chantierId}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
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
    </Pressable>
  );
}

/**
 * Demande de devis (maquette « Dashboard ») : titre, lieu, début souhaité, badge « Urgent »,
 * temps restant pour répondre et première photo du projet.
 */
function RequestCard({ request: r, now }: { request: Dashboard["requests"][number]; now: Date }) {
  const title = r.summary || r.trade_label;
  const place = [r.code_postal, r.ville_nom].filter(Boolean).join(" ");
  const left = timeLeft(new Date(r.expires_at), now);
  return (
    <Pressable
      role="link"
      aria-label={[title, place, r.urgence ? fr.proRequests.urgent : null]
        .filter(Boolean)
        .join(", ")}
      onPress={() => router.push(`/opportunite/${r.request_id}`)}
      style={({ pressed }) => [styles.card, styles.request, pressed && styles.pressed]}
    >
      <View style={styles.requestText}>
        <Text style={styles.cardTitle}>{title}</Text>
        {place ? (
          <View style={styles.row}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.meta}>{place}</Text>
          </View>
        ) : null}
        <View style={styles.chips}>
          <StatusPill text={requestStart(r)} tone="primary" />
          {r.urgence ? <StatusPill text={fr.proRequests.urgent} tone="danger" dot /> : null}
        </View>
        {left ? (
          <View style={styles.row}>
            <Clock size={13} color={colors["muted-foreground"]} />
            <Text style={styles.meta}>{fr.proRequests.timeLeft(left.hours, left.minutes)}</Text>
          </View>
        ) : null}
      </View>
      {r.photoUrl ? <Image source={{ uri: r.photoUrl }} style={styles.thumb} alt="" /> : null}
    </Pressable>
  );
}

/** Raccourcis vers les écrans de gestion : devis, factures, avis (à répondre), disponibilités. */
function Shortcuts({ reviewsToAnswer }: { reviewsToAnswer: number }) {
  const items: { icon: LucideIcon; label: string; href: Href; badge?: string }[] = [
    { icon: FileText, label: fr.proQuotes.open, href: "/pro/devis" },
    { icon: ReceiptText, label: fr.proInvoices.open, href: "/pro-factures" },
    {
      icon: Star,
      label: fr.proReviews.title,
      href: "/pro-avis",
      badge: reviewsToAnswer > 0 ? t.toAnswer(reviewsToAnswer) : undefined,
    },
    { icon: CalendarClock, label: fr.proAvailability.title, href: "/pro-disponibilites" },
  ];
  return (
    <View style={styles.section}>
      <SectionHead title={t.shortcuts} />
      <View style={styles.tiles}>
        {items.map(({ icon: Icon, label, href, badge }) => (
          <Pressable
            key={label}
            role="link"
            aria-label={badge ? `${label}, ${badge}` : label}
            onPress={() => router.push(href)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={styles.tileIcon}>
              <Icon size={20} color={colors.primary} />
            </View>
            <Text style={styles.tileLabel} numberOfLines={2}>
              {label}
            </Text>
            {badge ? (
              <View style={styles.tileBadge}>
                <Text style={styles.tileBadgeText}>{badge}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
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
  const [data, reload] = useFocusData(loadDashboard);
  const { refresh } = useUnread();
  const [refreshing, setRefreshing] = useState(false);

  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const now = new Date();
  const appointments = data ? (
    <View style={styles.section}>
      <SectionHead title={t.upcoming} link={{ label: t.openAgenda, href: "/pro-agenda" }} />
      {data.appointments.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <Text style={styles.emptyText}>{t.noUpcoming}</Text>
          <Arc style={styles.emptyArc} />
        </View>
      ) : (
        data.appointments.map((a) => (
          <AppointmentCard key={`${a.kind}-${a.chantierId}`} appointment={a} />
        ))
      )}
    </View>
  ) : null;
  const requests = data ? (
    <View style={styles.section}>
      <SectionHead title={t.latestRequests} link={{ label: t.seeAll, href: "/pro-demandes" }} />
      {data.requests.length === 0 ? (
        <View style={styles.dashed}>
          <Text style={styles.emptyText}>{t.noRequests}</Text>
        </View>
      ) : (
        data.requests.map((r) => <RequestCard key={r.request_id} request={r} now={now} />)
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
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <TabHeader title={t.title} subtitle={t.greeting(data?.firstName ?? null)} />

        {data === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : (
          <>
            {data.suspended ? <Notice tone="error">{t.suspended}</Notice> : null}
            <PushPrompt />
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
                href="/pro-demandes"
              />
              <Kpi
                wide
                label={t.revenue}
                value={formatCents(data.revenue.cents)}
                detail={<Trend revenue={data.revenue} />}
                href="/pro-factures"
              />
            </View>
            {/* Maquettes : les rendez-vous passent en premier dès qu'il y en a. */}
            {data.appointments.length > 0 ? (
              <>
                {appointments}
                {requests}
              </>
            ) : (
              <>
                {requests}
                {appointments}
              </>
            )}
            <Shortcuts reviewsToAnswer={data.reviewsToAnswer} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = "0 1px 3px rgba(17, 23, 40, 0.06)";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: { padding: spacing(5), gap: spacing(7), paddingBottom: spacing(10) },
  pressed: { opacity: 0.85 },
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
  request: { flexDirection: "row", gap: spacing(3), padding: spacing(4) },
  requestText: { flex: 1, gap: spacing(2) },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
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
  dashed: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    padding: spacing(6),
  },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  tile: {
    flexGrow: 1,
    flexBasis: "40%",
    minHeight: 104,
    gap: spacing(2.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
    boxShadow: cardShadow,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  tileBadge: {
    position: "absolute",
    top: spacing(3),
    right: spacing(3),
    borderRadius: radius.pill,
    backgroundColor: colors["danger-soft"],
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  tileBadgeText: { fontFamily: font.medium, fontSize: 11, color: colors.danger },
});
