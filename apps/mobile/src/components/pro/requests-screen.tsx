import {
  REQUEST_RESPONSE_HOURS,
  inboxGroups,
  isExampleId,
  requestFigures,
  timeLeft,
} from "@menao/core";
import { router } from "expo-router";
import { CalendarCheck, Clock, Inbox, MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/empty-state";
import { ExampleBadge, SpaceExamplesNotice } from "@/components/examples";
import {
  FigureStrip,
  GroupTitle,
  ListGroup,
  ListRow,
  Swipe,
  type ListTone,
} from "@/components/list-kit";
import { FicheTag } from "@/components/pro/fiche-kit";
import { RequestCardsSkeleton } from "@/components/skeletons";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { exampleInboxItems } from "@/lib/example-data";
import { loadSpaceExamplesShown } from "@/lib/examples";
import { formatDayMonth, formatDuration } from "@/lib/format";
import { PREFETCH_DELAY_MS, PREFETCH_FIRST, prefetchOpportunity } from "@/lib/prefetch";
import { loadInbox, loadResponseStats, requestStart, type InboxItem } from "@/lib/pro-requests";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { colors, font, spacing } = theme;
const TONE: Record<InboxItem["status"], ListTone> = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "neutral",
  expiree: "neutral",
  annulee: "neutral",
  a_verifier: "warning",
};

const titleOf = (r: InboxItem) => r.summary || r.trade_label || t.detailTitle;
const placeOf = (r: InboxItem) => [r.code_postal, r.ville_nom].filter(Boolean).join(" ");
/** Moins de 24 heures pour répondre : le temps restant passe en rouge. */
const URGENT_HOURS = 24;

/**
 * Demandes reçues par l'artisan (F-16, F-17), refonte « Nette » (lot 3) comme sur le site : trois
 * chiffres (à traiter, plus urgente, temps de réponse), puis les demandes à traiter sous 72 heures,
 * l'échéance la plus proche en tête, avec leur compte à rebours, et celles déjà traitées.
 */
export function RequestsScreen({ tab = false }: { tab?: boolean }) {
  const [rows, reload] = useFocusData(loadInbox, undefined, "tab:demandes");
  const [stats, reloadStats] = useFocusData(loadResponseStats, undefined, "tab:reponse");
  // Rien reçu : demandes d'exemple (ADR 0184), comme sur le site.
  const [examples, reloadExamples] = useFocusData(loadSpaceExamplesShown);
  const { refresh } = useUnread();
  const [refreshing, setRefreshing] = useState(false);
  // Premières demandes chargées d'avance : les ouvrir est instantané (ADR 0193).
  useEffect(() => {
    if (!rows?.length) return;
    const timer = setTimeout(() => {
      for (const r of rows.slice(0, PREFETCH_FIRST)) {
        prefetchOpportunity(r.request_id, r.summary || r.trade_label || "");
      }
    }, PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rows]);

  const now = new Date();
  const showExamples = rows?.length === 0 && Boolean(examples);
  const list = showExamples ? exampleInboxItems(now) : (rows ?? []);
  const { open, done } = inboxGroups(list, now);
  const figures = requestFigures(list, now);
  const urgent = figures.mostUrgent;
  const swipeable = open.some((r) => !isExampleId(r.request_id));
  let index = 0;
  // Entrée en cascade discrète (ADR 0192).
  const entering = () =>
    FadeInDown.delay(40 * index++)
      .duration(260)
      .reduceMotion(ReduceMotion.System);
  const openRow = (r: InboxItem) => (
    <Animated.View key={r.request_id} entering={entering()}>
      {/* Glisser pour répondre à une demande en attente (ADR 0196). */}
      <Swipe
        enabled={!isExampleId(r.request_id)}
        actions={[
          {
            label: fr.proLists.swipe.answer,
            icon: CalendarCheck,
            tone: "primary",
            onPress: () =>
              router.push({
                pathname: "/opportunite/[id]/rendez-vous",
                params: { id: r.request_id, client: r.client_first_name ?? "" },
              }),
          },
        ]}
      >
        <OpenRequestRow request={r} now={now} />
      </Swipe>
    </Animated.View>
  );
  const doneRow = (r: InboxItem) => {
    const place = placeOf(r);
    return (
      <Animated.View key={r.request_id} entering={entering()}>
        <ListRow
          label={[t.status[r.status], titleOf(r), place].filter(Boolean).join(", ")}
          onPressIn={() => prefetchOpportunity(r.request_id, titleOf(r), place)}
          onPress={() => router.push(`/opportunite/${r.request_id}`)}
          icon={{ icon: Inbox, tone: "neutral" }}
          title={titleOf(r)}
          detail={[r.ville_nom || r.code_postal, r.client_first_name, formatDayMonth(r.created_at)]
            .filter(Boolean)
            .join(" · ")}
          statusBelow
          status={{ text: t.status[r.status], tone: TONE[r.status] }}
          badge={isExampleId(r.request_id) ? <ExampleBadge /> : undefined}
        />
      </Animated.View>
    );
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {tab ? null : (
        <View style={styles.topBar}>
          <TopBar />
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              refresh();
              await Promise.all([reload(), reloadStats()]);
              setRefreshing(false);
            }}
          />
        }
      >
        {tab ? <TabHeader title={t.title} /> : <Title>{t.title}</Title>}
        {/* Premier chargement : la forme des lignes (ADR 0192) ; elles arrivent ensuite en fondu. */}
        {rows === undefined ? <RequestCardsSkeleton /> : null}
        {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
        {showExamples ? (
          <SpaceExamplesNotice onHidden={() => void reloadExamples()} />
        ) : rows?.length === 0 ? (
          <EmptyState illustration="demandes">{t.empty}</EmptyState>
        ) : null}
        {list.length > 0 ? (
          <FigureStrip
            label={t.figures.label}
            figures={[
              { label: t.figures.open, value: String(figures.openCount) },
              urgent
                ? {
                    label: t.figures.urgent,
                    value: t.countdownValue(urgent.hours, urgent.minutes),
                    danger: urgent.hours < URGENT_HOURS,
                  }
                : { label: t.figures.urgent, value: t.figures.none, spoken: t.figures.noneSpoken },
              stats?.minutes != null
                ? { label: t.figures.response, value: formatDuration(stats.minutes) }
                : {
                    label: t.figures.response,
                    value: t.figures.none,
                    spoken: t.figures.noneSpoken,
                  },
            ]}
          />
        ) : null}
        {open.length > 0 ? (
          <>
            <GroupTitle title={t.openTitle} count={open.length} />
            <ListGroup>{open.map(openRow)}</ListGroup>
          </>
        ) : null}
        {done.length > 0 ? (
          <>
            <GroupTitle title={t.doneTitle} count={done.length} />
            <ListGroup>{done.map(doneRow)}</ListGroup>
          </>
        ) : null}
        {swipeable ? <Text style={styles.hint}>{t.swipeHint}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Demande à traiter : photo du projet (ou icône), métier et urgence, résumé, lieu, client, début
 * souhaité, puis le temps restant pour répondre avec sa barre sur 72 heures.
 */
function OpenRequestRow({ request: r, now }: { request: InboxItem; now: Date }) {
  // Ouverte : échéance encore à venir (inboxGroups) ; repli à zéro si elle tombe à l'instant.
  const left = timeLeft(new Date(r.expires_at), now) ?? { hours: 0, minutes: 0 };
  const late = r.urgence || left.hours < URGENT_HOURS;
  const title = titleOf(r);
  const place = placeOf(r);
  const share = Math.min(
    1,
    Math.max(0, (left.hours * 60 + left.minutes) / (REQUEST_RESPONSE_HOURS * 60)),
  );
  const date = formatDayMonth(r.created_at);
  return (
    <Pressable
      role="link"
      aria-label={[
        t.status[r.status],
        r.urgence ? t.urgent : null,
        title,
        r.trade_label,
        place,
        t.timeLeft(left.hours, left.minutes),
      ]
        .filter(Boolean)
        .join(", ")}
      onPressIn={() => prefetchOpportunity(r.request_id, title, place)}
      onPress={() => router.push(`/opportunite/${r.request_id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {r.photoUrl ? (
        <Image source={{ uri: r.photoUrl }} style={styles.thumb} alt="" />
      ) : (
        <View style={[styles.thumb, styles.thumbIcon, r.urgence && styles.thumbUrgent]}>
          <Inbox size={22} color={r.urgence ? colors.danger : colors["primary-strong"]} />
        </View>
      )}
      <View style={styles.texts}>
        <View style={styles.tags}>
          {isExampleId(r.request_id) ? <ExampleBadge /> : null}
          {r.trade_label ? <FicheTag text={r.trade_label} tone="primary" /> : null}
          {r.urgence ? <FicheTag text={t.urgent} tone="danger" dot /> : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        {place ? (
          <View style={styles.inline}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.meta}>{place}</Text>
          </View>
        ) : null}
        <Text style={styles.meta}>
          {r.client_first_name ? t.from(r.client_first_name, date) : t.received(date)}
        </Text>
        <Text style={styles.start}>{requestStart(r)}</Text>
        <View style={styles.countdown}>
          <View style={styles.inline}>
            <Clock size={15} color={late ? colors.danger : colors.foreground} strokeWidth={2.4} />
            <Text style={[styles.left, late && styles.danger]}>
              {t.countdownValue(left.hours, left.minutes)}
            </Text>
          </View>
          <View style={styles.bar}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${share * 100}%`,
                  backgroundColor: late ? colors.danger : colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.toAnswer}>{t.toAnswer}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    // Fond plein : la ligne glisse par-dessus son bouton (ADR 0196).
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  pressed: { backgroundColor: colors.background },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  thumbUrgent: { backgroundColor: colors["danger-soft"] },
  texts: { flex: 1, minWidth: 0, gap: 5 },
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(1.5) },
  title: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, color: colors.foreground },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  start: { fontFamily: font.semibold, fontSize: 13, color: colors.label },
  countdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    marginTop: spacing(1),
  },
  left: {
    fontFamily: font.display,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  danger: { color: colors.danger },
  bar: {
    flex: 1,
    height: 6,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  barFill: { height: 6, borderRadius: 3 },
  toAnswer: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
