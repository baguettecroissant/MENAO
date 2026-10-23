import { clientPendingActions, isChantierFinished, type ChantierStatus } from "@menao/core";
import { router, useFocusEffect } from "expo-router";
import { FileText, HardHat } from "lucide-react-native";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChantierCard, FinishedChantierCard } from "@/components/chantier/chantier-card";
import { StatusPill } from "@/components/chantier/parts";
import { RequestGroup } from "@/components/chantier/request-group";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { artisanAvatar, loadMyChantiers, type MyChantiers } from "@/lib/chantiers";
import { formatDateNumeric } from "@/lib/format";
import { Body, Card, LinkText, Notice, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.myChantiers;
const { colors, font, radius, spacing } = theme;

/**
 * « Mes chantiers » (F-12), d'après la maquette « Mes chantiers - Mobile » et comme sur le site :
 * sur une seule page, chantiers en cours (avancement, action attendue, prochaine intervention),
 * demandes en attente, recherches non envoyées, puis chantiers terminés.
 */
export function MyChantiersScreen() {
  const [data, setData] = useState<MyChantiers | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setData(await loadMyChantiers());
  }, []);
  // Rechargé à chaque retour sur l'onglet (demande annulée, devis signé sur le site…).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (data === undefined) return <ScreenSkeleton />;
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
        <TabHeader title={t.title} subtitle={t.subtitle}>
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
        </TabHeader>

        {data === null && <Notice tone="error">{t.error}</Notice>}

        {empty && data !== null ? (
          <EmptyState illustration="demandes" title={t.empty}>
            {t.emptyHint}
          </EmptyState>
        ) : (
          // Maquette « Mes chantiers - Mobile » : en cours, demandes, puis terminés, sur une page.
          <>
            <Text style={styles.section}>{t.inProgress}</Text>
            {active.length === 0 ? (
              <EmptyState illustration="chantiers">{t.noActive}</EmptyState>
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
                chantier={data?.chantierOf.get(projectId) ?? null}
              />
            ))}
          </>
        )}

        {(data?.drafts.length ?? 0) > 0 && (
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

        {finished.length > 0 ? (
          <>
            <Text style={styles.section}>{t.finished}</Text>
            {finished.map((c) => (
              <FinishedChantierCard key={c.chantier_id} c={c} photoUrl={photoOf(c.photo_path)} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  // Puces blanches bordées de la maquette (« 1 chantier en cours », « 1 document à signer »).
  count: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["primary-soft"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  countText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  section: {
    fontFamily: font.medium,
    fontSize: 18,
    color: colors.foreground,
    marginTop: spacing(2),
  },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
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
