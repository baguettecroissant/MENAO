import type { EmailPreferences } from "@menao/core";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
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
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { formatAgo } from "@/lib/format";
import { appRouteForSitePath } from "@/lib/links";
import {
  loadEmailPreferences,
  loadNotifications,
  markNotificationsRead,
  saveEmailPreferences,
  type NotificationItem,
} from "@/lib/notifications";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Checkbox, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.notificationCenter;
const { colors, font, radius, spacing } = theme;

/** Ouvre l'écran concerné dans l'application, sinon la page du site (avis, signalement…). */
function open(item: NotificationItem) {
  const route = appRouteForSitePath(item.link);
  if (route) router.push(route);
  else WebBrowser.openBrowserAsync(`${env.siteUrl}${item.link}`);
}

/**
 * Centre de notifications (F-41), comme sur le site : mêmes textes que les e-mails, non lues
 * signalées pendant la visite (toutes sont marquées lues à l'affichage), préférences d'e-mail.
 */
export function NotificationCenter() {
  const { refresh } = useUnread();
  const [items, reload] = useFocusData(loadNotifications);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (items) markNotificationsRead().then(refresh);
  }, [items, refresh]);

  if (items === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const now = new Date();
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
        {items === null ? (
          <Notice tone="error">{t.error}</Notice>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.empty}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item, i) => (
              <Pressable
                key={item.id}
                role="link"
                aria-label={[
                  item.title,
                  item.preview,
                  formatAgo(item.createdAt, now),
                  item.unread ? t.unread : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                onPress={() => open(item)}
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && styles.separator,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.dot, item.unread && styles.dotUnread]} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, item.unread && styles.itemTitleUnread]}>
                    {item.title}
                  </Text>
                  <Text style={styles.preview}>{item.preview}</Text>
                  <Text style={styles.time}>{formatAgo(item.createdAt, now)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        <Preferences />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Préférences d'e-mail (F-41) : activité du chantier et rappels, désactivables. */
function Preferences() {
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const load = useCallback(() => loadEmailPreferences(userId), [userId]);
  const [initial] = useFocusData(load);
  const [edited, setEdited] = useState<EmailPreferences | null>(null);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);
  const [pending, setPending] = useState(false);
  const prefs = edited ?? initial;
  if (!prefs) return null;

  async function save() {
    if (!prefs) return;
    setStatus(null);
    setPending(true);
    const failed = await saveEmailPreferences(prefs);
    setPending(false);
    setStatus(failed ? "error" : "saved");
  }

  return (
    <Card>
      <View style={styles.prefs}>
        <Text role="heading" style={styles.prefsTitle}>
          {t.prefsTitle}
        </Text>
        <Body muted>{t.prefsIntro}</Body>
        {(["activite", "rappels"] as const).map((key) => (
          <Checkbox
            key={key}
            label={t[key]}
            checked={prefs[key]}
            onChange={(value) => {
              setEdited({ ...prefs, [key]: value });
              setStatus(null);
            }}
          />
        ))}
        {status === "saved" ? <Notice tone="success">{t.saved}</Notice> : null}
        {status === "error" ? <Notice tone="error">{fr.errors.generic}</Notice> : null}
        <Button label={t.save} variant="secondary" onPress={save} loading={pending} />
      </View>
    </Card>
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
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  head: { gap: spacing(2) },
  list: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  item: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3), padding: spacing(4) },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.background },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotUnread: { backgroundColor: colors.primary },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  itemTitleUnread: { fontFamily: font.bold },
  preview: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  time: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
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
    textAlign: "center",
    color: colors["muted-foreground"],
  },
  prefs: { gap: spacing(3) },
  prefsTitle: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
});
