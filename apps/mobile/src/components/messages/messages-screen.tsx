import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConversationRow } from "./conversation-row";
import { ListFilters, ListGroup, ListSearch } from "@/components/list-kit";
import { ListRowsSkeleton } from "@/components/skeletons";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { filterConversations, loadConversations, type ConversationItem } from "@/lib/messages";
import { PREFETCH_DELAY_MS, PREFETCH_FIRST, prefetchConversation } from "@/lib/prefetch";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Title, useReveal } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.messages;
const { colors, font, spacing } = theme;

/**
 * Messages (F-40), du client avec ses artisans ou de l'artisan avec ses clients : une conversation
 * par chantier, rechargées à chaque retour. Refonte « Nette » (lot 4) : recherche (nom, chantier),
 * pastilles « Tous » / « Non lus », puis les conversations dans un seul cadre. `standalone` : écran ouvert par-dessus les onglets
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
  const [rows, reload] = useFocusData(load, undefined, "tab:messages");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  // Squelette des conversations pendant le premier chargement, puis fondu (ADR 0192).
  const reveal = useReveal(rows !== undefined);
  // Premières conversations chargées d'avance : les ouvrir est instantané (ADR 0193).
  useEffect(() => {
    if (!rows?.length) return;
    const timer = setTimeout(() => {
      for (const r of rows.slice(0, PREFETCH_FIRST)) {
        prefetchConversation(r.chantier_id, artisan, r.other_name);
      }
    }, PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rows, artisan]);
  const now = new Date();
  const unreadCount = rows ? rows.filter((r) => r.unread > 0).length : 0;
  const shown = rows ? filterConversations(rows, { query, unreadOnly: filter === "unread" }) : [];
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {standalone ? (
        <View style={styles.header}>
          <TopBar />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
        {rows === undefined ? (
          <ListRowsSkeleton rows={4} avatar />
        ) : rows === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : rows.length === 0 ? (
          <EmptyState illustration="messages">{artisan ? t.emptyPro : t.empty}</EmptyState>
        ) : (
          <Animated.View entering={reveal} style={styles.list}>
            <ListSearch
              value={query}
              onChangeText={setQuery}
              placeholder={artisan ? t.searchPlaceholder : t.searchPlaceholderClient}
            />
            <ListFilters
              chips
              label={t.filtersLabel}
              value={filter}
              onChange={setFilter}
              items={[
                { value: "all", label: t.filterAll, detail: `· ${rows.length}` },
                { value: "unread", label: t.filterUnread, detail: `· ${unreadCount}` },
              ]}
            />
            {shown.length === 0 ? (
              <Text role="status" style={styles.none}>
                {filter === "unread" && !query.trim() ? t.noUnread : t.noMatch}
              </Text>
            ) : (
              <ListGroup>
                {shown.map((row) => (
                  <ConversationRow key={row.chantier_id} row={row} now={now} />
                ))}
              </ListGroup>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  list: { gap: spacing(4) },
  none: {
    paddingVertical: spacing(6),
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 15,
    color: colors["muted-foreground"],
  },
});
