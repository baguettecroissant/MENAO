import { inboxGroups, timeLeft } from "@menao/core";
import { router } from "expo-router";
import { Clock, MapPin } from "lucide-react-native";
import { useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusPill, type Tone } from "@/components/chantier/parts";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { loadInbox, requestStart, type InboxItem } from "@/lib/pro-requests";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, ScreenSkeleton, Tappable, Title } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.proRequests;
const { colors, font, radius, spacing } = theme;
const TONE: Record<InboxItem["status"], Tone> = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
  a_verifier: "warning",
};

/**
 * Demandes reçues par l'artisan (F-16, F-17), comme sur le site : à traiter sous 72 heures, avec le
 * temps restant, le début souhaité et la première photo du projet. Onglet « Demandes » (ADR 0130) :
 * celles à traiter d'abord, l'échéance la plus proche en tête, puis celles déjà traitées.
 */
export function RequestsScreen({ tab = false }: { tab?: boolean }) {
  const [rows, reload] = useFocusData(loadInbox);
  const { refresh } = useUnread();
  const [refreshing, setRefreshing] = useState(false);

  if (rows === undefined) return <ScreenSkeleton />;
  const now = new Date();
  const { open, done } = inboxGroups(rows ?? [], now);
  let index = 0;
  const card = (r: InboxItem) => (
    <Animated.View
      key={r.request_id}
      entering={FadeInDown.delay(40 * index++)
        .duration(260)
        .reduceMotion(ReduceMotion.System)}
    >
      <RequestCard request={r} now={now} />
    </Animated.View>
  );
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
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        {tab ? (
          <TabHeader title={t.title} subtitle={t.subtitle} />
        ) : (
          <View style={styles.head}>
            <Title>{t.title}</Title>
            <Body muted>{t.subtitle}</Body>
          </View>
        )}
        {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
        {rows?.length === 0 ? <EmptyState illustration="demandes">{t.empty}</EmptyState> : null}
        {open.length > 0 && done.length > 0 ? (
          <Text role="heading" style={styles.group}>
            {t.openTitle(open.length)}
          </Text>
        ) : null}
        {open.map(card)}
        {done.length > 0 && open.length > 0 ? (
          <Text role="heading" style={styles.group}>
            {t.doneTitle}
          </Text>
        ) : null}
        {done.map(card)}
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestCard({ request: r, now }: { request: InboxItem; now: Date }) {
  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
  const title = [r.trade_label, r.summary].filter(Boolean).join(" — ");
  const place = [r.code_postal, r.ville_nom].filter(Boolean).join(" ");
  return (
    <Tappable
      role="link"
      aria-label={[t.status[r.status], title, place].filter(Boolean).join(", ")}
      onPress={() => router.push(`/opportunite/${r.request_id}`)}
      style={styles.card}
    >
      <View style={styles.cardText}>
        <View style={styles.tags}>
          <StatusPill text={t.status[r.status]} tone={TONE[r.status]} />
          {r.urgence ? <StatusPill text={t.urgent} tone="danger" /> : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        {place ? (
          <View style={styles.row}>
            <MapPin size={14} color={colors["muted-foreground"]} />
            <Text style={styles.meta}>{place}</Text>
          </View>
        ) : null}
        <Text style={styles.meta}>{requestStart(r)}</Text>
        {left ? (
          <View style={styles.row}>
            <Clock size={14} color={colors["muted-foreground"]} />
            <Text style={styles.meta}>{t.timeLeft(left.hours, left.minutes)}</Text>
          </View>
        ) : null}
        <Text style={styles.meta}>
          {r.client_first_name ? `${r.client_first_name} · ` : ""}
          {t.received(formatDay(r.created_at))}
        </Text>
      </View>
      {r.photoUrl ? <Image source={{ uri: r.photoUrl }} style={styles.thumb} alt="" /> : null}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
  head: { gap: spacing(2), marginBottom: spacing(1) },
  group: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors["muted-foreground"],
    marginTop: spacing(2),
    marginLeft: spacing(1),
  },
  card: {
    flexDirection: "row",
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  cardText: { flex: 1, gap: spacing(1.5) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  title: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  thumb: { width: 64, height: 64, borderRadius: radius.input },
});
