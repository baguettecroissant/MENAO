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
import { ConversationRow } from "./conversation-row";
import { fr } from "@/i18n/fr";
import { loadConversations, type ConversationItem } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.messages;
const { colors, radius, spacing } = theme;

/**
 * Messages (F-40), du client avec ses artisans ou de l'artisan avec ses clients : une conversation
 * par chantier, rechargées à chaque retour.
 */
export function MessagesScreen() {
  const { refresh } = useUnread();
  const artisan = useSession().space === "artisan";
  const load = useCallback(async (): Promise<ConversationItem[] | null> => {
    const rows = await loadConversations();
    refresh();
    return rows;
  }, [refresh]);
  const [rows, reload] = useFocusData(load);
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
          <Body muted>{artisan ? t.subtitlePro : t.subtitle}</Body>
        </View>
        {rows === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{artisan ? t.emptyPro : t.empty}</Text>
          </View>
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  head: { gap: spacing(2) },
  list: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
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
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
