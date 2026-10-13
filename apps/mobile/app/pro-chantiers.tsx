import type { ChantierStatus } from "@menao/core";
import { router } from "expo-router";
import { CalendarDays, MapPin } from "lucide-react-native";
import { useState } from "react";
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
import { StatusPill, type Tone } from "@/components/chantier/parts";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDayAndTime } from "@/lib/format";
import { loadArtisanChantiers } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proChantiers;
const { colors, font, radius, spacing } = theme;

/** Couleur de l'état, comme sur la liste du site. */
const tone = (status: ChantierStatus): Tone =>
  status === "annule" || status === "devis_refuse"
    ? "neutral"
    : status === "rdv_planifie" || status === "devis_en_revision" || status === "acompte_paye"
      ? "primary"
      : status === "en_litige"
        ? "danger"
        : "success";

/** Chantiers de l'artisan (F-18), comme sur le site : état, lieu, client, rendez-vous ou démarrage. */
export default function ArtisanChantiers() {
  const [rows, reload] = useFocusData(loadArtisanChantiers);
  const [refreshing, setRefreshing] = useState(false);

  if (rows === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
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
          const status = r.status as ChantierStatus;
          const client = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ");
          const place = [[r.code_postal, r.ville_nom].filter(Boolean).join(" "), client]
            .filter(Boolean)
            .join(" · ");
          const when =
            status === "rdv_planifie" && r.appointment_at
              ? formatDayAndTime(r.appointment_at)
              : status === "planifie" && r.start_at
                ? formatDayAndTime(r.start_at)
                : null;
          return (
            <Pressable
              key={r.chantier_id}
              role="link"
              aria-label={[t.status[status], r.title, place].filter(Boolean).join(", ")}
              onPress={() => router.push(`/pro-chantier/${r.chantier_id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <StatusPill text={t.status[status]} tone={tone(status)} />
              <Text style={styles.title}>{r.title}</Text>
              {place ? (
                <View style={styles.row}>
                  <MapPin size={14} color={colors.primary} />
                  <Text style={styles.meta}>{place}</Text>
                </View>
              ) : null}
              {when ? (
                <View style={styles.row}>
                  <CalendarDays size={14} color={colors["muted-foreground"]} />
                  <Text style={styles.meta}>
                    {status === "rdv_planifie"
                      ? t.appointmentOn(when.day, when.time)
                      : t.startOn(when.day, when.time)}
                  </Text>
                </View>
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
  head: { gap: spacing(2), marginBottom: spacing(1) },
  card: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  pressed: { opacity: 0.85 },
  title: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
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
