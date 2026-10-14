import { timeLeft } from "@menao/core";
import { router } from "expo-router";
import { Clock, MapPin } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusPill, type Tone } from "@/components/chantier/parts";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { loadInbox, requestStart, type InboxItem } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { colors, font, radius, spacing } = theme;
const TONE: Record<InboxItem["status"], Tone> = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
};

/**
 * Demandes reçues par l'artisan (F-16, F-17), comme sur le site : à traiter sous 48 heures, avec le
 * temps restant, le début souhaité et la première photo du projet.
 */
export function RequestsScreen() {
  const [rows, reload] = useFocusData(loadInbox);
  const [refreshing, setRefreshing] = useState(false);

  if (rows === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const now = new Date();
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
        {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
        {rows?.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.empty}</Text>
          </View>
        ) : null}
        {(rows ?? []).map((r) => {
          const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
          const title = [r.trade_label, r.summary].filter(Boolean).join(" — ");
          const place = [r.code_postal, r.ville_nom].filter(Boolean).join(" ");
          return (
            <Pressable
              key={r.request_id}
              role="link"
              aria-label={[t.status[r.status], title, place].filter(Boolean).join(", ")}
              onPress={() => router.push(`/opportunite/${r.request_id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
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
              {r.photoUrl ? (
                <Image source={{ uri: r.photoUrl }} style={styles.thumb} alt="" />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
  head: { gap: spacing(2), marginBottom: spacing(1) },
  card: {
    flexDirection: "row",
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  pressed: { opacity: 0.85 },
  cardText: { flex: 1, gap: spacing(1.5) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  title: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  thumb: { width: 64, height: 64, borderRadius: radius.input },
  empty: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(10),
  },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
