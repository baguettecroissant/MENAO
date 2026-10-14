import { router } from "expo-router";
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
import { Segmented } from "@/components/segmented";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay, formatDayMonthNumeric, formatTime } from "@/lib/format";
import { loadArtisanQuotes, type ArtisanQuote } from "@/lib/pro-documents";
import { useFocusData } from "@/lib/use-focus-data";
import { LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.proQuotes;
const { colors, font, radius, spacing } = theme;

const STATUS_TONE: Record<ArtisanQuote["status"], Tone> = {
  brouillon: "neutral",
  envoye: "success",
  signe: "success",
  refuse: "danger",
  revision_demandee: "warning",
  remplace: "neutral",
};

/**
 * Devis de l'artisan, comme sur le site (maquettes « Devis – Aucun » et « Devis envoyés ») :
 * brouillons à envoyer (vers la préparation du devis) et devis envoyés (vers le chantier).
 */
export function ArtisanQuotesScreen() {
  const [rows, reload] = useFocusData(loadArtisanQuotes);
  const [tab, setTab] = useState<"a-envoyer" | "envoyes">("a-envoyer");
  const [refreshing, setRefreshing] = useState(false);

  if (rows === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const list = (rows ?? []).filter((q) =>
    tab === "a-envoyer" ? q.status === "brouillon" : q.status !== "brouillon",
  );
  const heading = tab === "a-envoyer" ? t.toSend : t.sent;

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
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <TabHeader title={t.title} subtitle={t.subtitle}>
          <LinkText label={fr.proInvoices.open} onPress={() => router.push("/pro-factures")} />
        </TabHeader>
        {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
        <Segmented
          label={t.title}
          options={[
            { value: "a-envoyer", label: t.toSend },
            { value: "envoyes", label: t.sent },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Text role="heading" style={styles.count}>{`${heading} (${list.length})`}</Text>
        {list.length === 0 ? (
          <EmptyState illustration="devis">
            {tab === "a-envoyer" ? t.emptyToSend : t.emptySent}
          </EmptyState>
        ) : (
          list.map((q) => (
            <Pressable
              key={q.quote_id}
              role="link"
              onPress={() =>
                router.push(
                  q.status === "brouillon"
                    ? `/pro-chantier/${q.chantier_id}/devis`
                    : `/pro-chantier/${q.chantier_id}`,
                )
              }
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHead}>
                <Text style={styles.title}>{q.title}</Text>
                {q.line_count > 0 ? (
                  <Text style={styles.amount}>{formatCents(q.total_ttc_cents)}</Text>
                ) : null}
              </View>
              <Text style={styles.meta}>
                {[
                  q.numero && `N° ${q.numero}`,
                  q.client_name,
                  q.appointment_at
                    ? t.visit(formatDayMonthNumeric(q.appointment_at), formatTime(q.appointment_at))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <View style={styles.tags}>
                {q.status === "brouillon" ? (
                  <>
                    <StatusPill text={`${t.draft} · ${t.lineCount(q.line_count)}`} tone="neutral" />
                    {q.version > 1 ? (
                      <StatusPill text={t.version(q.version)} tone="primary" />
                    ) : null}
                    <Text style={styles.meta}>{t.updated(formatDay(q.updated_at))}</Text>
                  </>
                ) : (
                  <StatusPill
                    text={
                      q.status === "envoye" && q.sent_at
                        ? t.sentOn(formatDayMonthNumeric(q.sent_at), formatTime(q.sent_at))
                        : t.statuses[q.status]
                    }
                    tone={STATUS_TONE[q.status]}
                  />
                )}
              </View>
            </Pressable>
          ))
        )}
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
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
  count: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  card: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  pressed: { opacity: 0.85 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  title: { flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  amount: { fontFamily: font.medium, fontSize: 15, color: colors.primary },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
});
