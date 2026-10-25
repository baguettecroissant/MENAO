import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConversationRow } from "./conversation-row";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadConversations, type ConversationItem } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, ScreenSkeleton, Title } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.messages;
const { colors, radius, spacing } = theme;

/**
 * Messages (F-40), du client avec ses artisans ou de l'artisan avec ses clients : une conversation
 * par chantier, rechargées à chaque retour. `standalone` : écran ouvert par-dessus les onglets
 * (bulle de l'en-tête de l'artisan, ADR 0188), avec la barre de retour.
 */
export function MessagesScreen({ standalone = false }: { standalone?: boolean } = {}) {
  const { refresh } = useUnread();
  const artisan = useSession().space === "artisan";
  const load = useCallback(async (): Promise<ConversationItem[] | null> => {
    const rows = await loadConversations();
    refresh();
    return rows;
  }, [refresh]);
  const [rows, reload] = useFocusData(load);
  const [refreshing, setRefreshing] = useState(false);

  if (rows === undefined) return <ScreenSkeleton header={standalone ? <TopBar /> : undefined} />;
  const now = new Date();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {standalone ? (
        <View style={styles.header}>
          <TopBar />
        </View>
      ) : null}
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
        {standalone ? (
          <Title>{t.title}</Title>
        ) : (
          <TabHeader title={t.title} subtitle={artisan ? undefined : t.subtitle} />
        )}
        {rows === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : rows.length === 0 ? (
          <EmptyState illustration="messages">{artisan ? t.emptyPro : t.empty}</EmptyState>
        ) : (
          <View style={styles.list}>
            {rows.map((row, i) => (
              <View key={row.chantier_id} style={i > 0 ? styles.separator : undefined}>
                <ConversationRow row={row} now={now} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  list: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
});
