import { router } from "expo-router";
import { CalendarDays, Clock, Hammer, TrendingDown, TrendingUp, Wallet } from "lucide-react-native";
import { useState, type ReactNode } from "react";
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
import { fr } from "@/i18n/fr";
import { formatCents, formatDayAndTime, formatDuration, formatMonthName } from "@/lib/format";
import { loadDashboard, type Dashboard } from "@/lib/pro-dashboard";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Card, LinkText, Notice, Section, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDashboard;
const { colors, font, radius, spacing } = theme;

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: ReactNode;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {detail}
    </View>
  );
}

/** Évolution de l'encaissé par rapport à la même période du mois précédent, comme sur le site. */
function Trend({ revenue }: { revenue: Dashboard["revenue"] }) {
  const { trend } = revenue;
  if (!trend) return null;
  const month = formatMonthName(revenue.previousMonth);
  const up = trend.kind === "nouveau" || trend.kind === "hausse";
  const text =
    trend.kind === "nouveau"
      ? t.trend.nouveau(formatCents(trend.deltaCents), month)
      : trend.kind === "hausse"
        ? t.trend.hausse(trend.percent, month)
        : trend.kind === "baisse"
          ? t.trend.baisse(trend.percent, month)
          : t.trend.stable(month);
  return (
    <View style={styles.trend}>
      {up ? (
        <TrendingUp size={14} color={colors.success} />
      ) : (
        <TrendingDown size={14} color={colors["muted-foreground"]} />
      )}
      <Text style={[styles.small, up && styles.success]}>{text}</Text>
    </View>
  );
}

/**
 * Tableau de bord de l'artisan (F-16), comme sur le site : clients en attente de devis, encaissé
 * ce mois, temps de réponse, rendez-vous à venir et dernières demandes. Aucun lien vers
 * l'abonnement ni vers le site (règle 10).
 */
export function DashboardScreen() {
  const [data, reload] = useFocusData(loadDashboard);
  const [refreshing, setRefreshing] = useState(false);

  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
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
        {data === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : (
          <>
            <Title>{t.greeting(data.firstName)}</Title>
            {data.suspended ? <Notice tone="error">{t.suspended}</Notice> : null}
            <View style={styles.stats}>
              <Stat
                icon={<Hammer size={16} color={colors.primary} />}
                label={t.awaitingQuote}
                value={t.clients(data.awaitingClients)}
              />
              <Stat
                icon={<Wallet size={16} color={colors.primary} />}
                label={t.revenue}
                value={formatCents(data.revenue.cents)}
                detail={<Trend revenue={data.revenue} />}
              />
              <Stat
                icon={<Clock size={16} color={colors.primary} />}
                label={t.responseTime}
                value={
                  data.responseTime.minutes === null
                    ? "—"
                    : formatDuration(data.responseTime.minutes)
                }
                detail={
                  <Text style={styles.small}>
                    {data.responseTime.minutes === null
                      ? t.noResponse
                      : t.responseDetail(data.responseTime.responses)}
                  </Text>
                }
              />
            </View>

            <Section title={t.upcoming}>
              <LinkText label={fr.proChantiers.all} onPress={() => router.push("/pro-chantiers")} />
              {data.appointments.length === 0 ? (
                <Body muted>{t.noUpcoming}</Body>
              ) : (
                data.appointments.map((a) => {
                  const { day, time } = formatDayAndTime(a.startsAt);
                  return (
                    <Pressable
                      key={`${a.kind}-${a.chantierId}`}
                      role="link"
                      onPress={() => router.push(`/pro-chantier/${a.chantierId}`)}
                    >
                      <Card>
                        <View style={styles.item}>
                          <CalendarDays size={18} color={colors.primary} />
                          <View style={styles.itemText}>
                            <Text style={styles.kind}>{t.kinds[a.kind]}</Text>
                            <Text style={styles.strong}>{`${day} à ${time}`}</Text>
                            <Text style={styles.text}>{a.title}</Text>
                            {a.place ? <Text style={styles.small}>{a.place}</Text> : null}
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                })
              )}
            </Section>

            <Section title={t.latestRequests}>
              {data.requests.length === 0 ? (
                <Body muted>{t.noRequests}</Body>
              ) : (
                data.requests.map((r) => (
                  <Pressable
                    key={r.request_id}
                    role="link"
                    onPress={() => router.push(`/opportunite/${r.request_id}`)}
                  >
                    <Card>
                      <View style={styles.itemText}>
                        <Text style={styles.strong}>{r.summary || r.trade_label}</Text>
                        <Text style={styles.small}>
                          {[r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
                          {r.urgence ? ` · ${fr.proRequests.urgent}` : ""}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))
              )}
              <LinkText label={t.allRequests} onPress={() => router.push("/pro/demandes")} />
            </Section>

            <Section title={fr.proReviews.title}>
              <Body muted>{fr.proReviews.toAnswer(data.reviewsToAnswer)}</Body>
              <LinkText label={fr.proReviews.open} onPress={() => router.push("/pro-avis")} />
            </Section>
          </>
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
  content: { padding: spacing(5), gap: spacing(5), paddingBottom: spacing(10) },
  stats: { gap: spacing(3) },
  stat: {
    gap: spacing(1),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  statHead: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  statLabel: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
  statValue: { fontFamily: font.bold, fontSize: 22, color: colors.foreground },
  trend: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  item: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  itemText: { flex: 1, gap: 2 },
  kind: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  success: { color: colors.success },
});
