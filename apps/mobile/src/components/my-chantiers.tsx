import { clientPendingActions, isChantierFinished, type ChantierStatus } from "@menao/core";
import { router, useFocusEffect } from "expo-router";
import { FileText, HardHat, Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChantierCard, FinishedChantierCard } from "@/components/chantier/chantier-card";
import { StatusPill } from "@/components/chantier/parts";
import { RequestGroup } from "@/components/chantier/request-group";
import { fr } from "@/i18n/fr";
import { artisanAvatar, loadMyChantiers, type MyChantiers } from "@/lib/chantiers";
import { formatDateNumeric } from "@/lib/format";
import { Body, Button, Card, Chip, LinkText, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.myChantiers;
const { colors, font, radius, spacing } = theme;

/**
 * « Mes chantiers » (F-12), comme sur le site : chantiers en cours (avancement, action attendue,
 * prochaine intervention), demandes en attente, recherches non envoyées, puis chantiers terminés.
 */
export function MyChantiersScreen() {
  const [data, setData] = useState<MyChantiers | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"inProgress" | "finished">("inProgress");

  const load = useCallback(async () => {
    setData(await loadMyChantiers());
  }, []);
  // Rechargé à chaque retour sur l'onglet (demande annulée, devis signé sur le site…).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const chantiers = data?.chantiers ?? [];
  const requests = data?.requests ?? [];
  const active = chantiers.filter((c) => !isChantierFinished(c.status as ChantierStatus));
  const finished = chantiers.filter((c) => isChantierFinished(c.status as ChantierStatus));
  const pendingProjects = [
    ...new Set(requests.filter((r) => !r.chantier_id).map((r) => r.project_id)),
  ];
  const toSign = active.filter(
    (c) => c.status === "devis_envoye" && c.quote_status === "envoye",
  ).length;
  const pending = clientPendingActions(
    active.map((c) => ({
      status: c.status as ChantierStatus,
      quoteId: c.quote_id,
      quoteStatus: c.quote_status,
      depositCents: c.deposit_cents,
      depositStatus: c.deposit_status,
      balanceCents: c.balance_cents,
      balanceStatus: c.balance_status,
    })),
  );
  const photoOf = (path: string | null) => (path ? (data?.photoByPath.get(path) ?? null) : null);
  const now = new Date();
  const empty = chantiers.length === 0 && requests.length === 0;

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
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.head}>
          <Title>{t.title}</Title>
          <Body muted>{t.subtitle}</Body>
          {(active.length > 0 || toSign > 0) && (
            <View style={styles.counts}>
              <View style={styles.count}>
                <HardHat size={14} color={colors["primary-strong"]} />
                <Text style={styles.countText}>{t.countActive(active.length)}</Text>
              </View>
              {toSign > 0 && (
                <View style={styles.count}>
                  <FileText size={14} color={colors["primary-strong"]} />
                  <Text style={styles.countText}>{t.countToSign(toSign)}</Text>
                </View>
              )}
              {pending > toSign && <StatusPill text={fr.chantier.action.payTitle} tone="primary" />}
            </View>
          )}
          <Button label={t.start} onPress={() => router.push("/recherche")} />
        </View>

        {data === null && <Notice tone="error">{t.error}</Notice>}

        {empty && data !== null ? (
          <Card>
            <View style={styles.emptyIcon}>
              <Search size={22} color={colors.primary} />
            </View>
            <Text style={styles.heading}>{t.empty}</Text>
            <Body muted>{t.emptyHint}</Body>
          </Card>
        ) : (
          <>
            <View style={styles.tabs}>
              <Chip
                label={t.tabs.inProgress}
                selected={tab === "inProgress"}
                onPress={() => setTab("inProgress")}
              />
              <Chip
                label={t.tabs.finished}
                selected={tab === "finished"}
                onPress={() => setTab("finished")}
              />
            </View>
            {tab === "inProgress" ? (
              <>
                <Text style={styles.section}>{t.inProgress}</Text>
                {active.length === 0 ? (
                  <View style={styles.dashed}>
                    <Body muted center>
                      {t.noActive}
                    </Body>
                  </View>
                ) : (
                  active.map((c) => (
                    <ChantierCard
                      key={c.chantier_id}
                      c={c}
                      photoUrl={photoOf(c.photo_path)}
                      avatarUrl={artisanAvatar(c.artisan_avatar_path)}
                    />
                  ))
                )}
                {pendingProjects.length > 0 && <Text style={styles.section}>{t.pending}</Text>}
                {pendingProjects.map((projectId) => (
                  <RequestGroup
                    key={projectId}
                    items={requests.filter((r) => r.project_id === projectId)}
                    photoUrl={data?.photoByProject.get(projectId) ?? null}
                    now={now}
                    cancelledByClient={data?.cancelledByClient ?? new Set()}
                  />
                ))}
              </>
            ) : (
              <>
                <Text style={styles.section}>{t.finished}</Text>
                {finished.length === 0 ? (
                  <Body muted>{t.noFinished}</Body>
                ) : (
                  finished.map((c) => (
                    <FinishedChantierCard
                      key={c.chantier_id}
                      c={c}
                      photoUrl={photoOf(c.photo_path)}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}

        {tab === "inProgress" && (data?.drafts.length ?? 0) > 0 && (
          <Card>
            <Text style={styles.heading}>{t.drafts.title}</Text>
            <Body muted>{t.drafts.intro}</Body>
            {data?.drafts.map((d) => (
              <View key={d.id} style={styles.draft}>
                <View style={styles.flex}>
                  <Text style={styles.draftTitle} numberOfLines={2}>
                    {d.title ?? t.drafts.untitled}
                  </Text>
                  <Text style={styles.meta}>
                    {[d.city, t.drafts.started(formatDateNumeric(d.createdAt))]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <LinkText
                  label={t.drafts.resume}
                  onPress={() => router.push({ pathname: "/projet/[id]", params: { id: d.id } })}
                />
              </View>
            ))}
          </Card>
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
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  head: { gap: spacing(2.5) },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  count: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.chip,
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  countText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  tabs: { flexDirection: "row", gap: spacing(2) },
  section: {
    fontFamily: font.medium,
    fontSize: 18,
    color: colors.foreground,
    marginTop: spacing(2),
  },
  dashed: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    padding: spacing(6),
  },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  draft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  draftTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  flex: { flex: 1, gap: 2 },
});
