import * as WebBrowser from "expo-web-browser";
import { CalendarPlus, RefreshCw, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatAgo } from "@/lib/format";
import { disableCalendarFeed, renewCalendarFeed } from "@/lib/pro-availability";
import { Button, Card, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability.sync;
const { colors, font, radius, spacing } = theme;

type Outcome = { success: string } | { error: string };

/**
 * Abonnement .ics (F-44), comme sur le site : lien secret à ajouter une fois à Apple Calendrier,
 * Google Agenda ou Outlook, qui relisent ensuite l'agenda MENAO d'eux-mêmes. Le lien se partage
 * (ou se copie) par la feuille de partage du téléphone ; renouvelable et désactivable.
 */
export function CalendarSync({
  feed,
  onChanged,
}: {
  feed: { url: string; lastReadAt: string | null } | null;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState<"renew" | "disable" | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function run(kind: "renew" | "disable") {
    setPending(kind);
    const result =
      kind === "renew" ? await renewCalendarFeed(feed !== null) : await disableCalendarFeed();
    setPending(null);
    setOutcome(result);
    if ("success" in result) onChanged();
  }

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setOutcome({ error: t.openFailed });
    }
  }

  const webcal = feed ? feed.url.replace(/^https?:\/\//, "webcal://") : "";

  return (
    <Card>
      <View style={styles.titleRow}>
        <RefreshCw size={18} color={colors.primary} />
        <Text role="heading" style={styles.heading}>
          {t.title}
        </Text>
      </View>
      <Text style={styles.text}>{t.text}</Text>
      {outcome && "error" in outcome ? <Notice tone="error">{outcome.error}</Notice> : null}
      {outcome && "success" in outcome ? <Notice tone="success">{outcome.success}</Notice> : null}

      {feed ? (
        <>
          <View style={styles.group}>
            <Text style={styles.label}>{t.link}</Text>
            <Text selectable style={styles.url}>
              {feed.url}
            </Text>
            <Button
              label={t.share}
              variant="secondary"
              onPress={() => {
                Share.share({ message: feed.url }).catch(() => undefined);
              }}
            />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>{t.addTo}</Text>
            <View style={styles.links}>
              {Platform.OS === "ios" ? (
                <CalendarLink label={t.apple} onPress={() => open(webcal)} />
              ) : null}
              <CalendarLink
                label={t.google}
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
                  )
                }
              />
              <CalendarLink
                label={t.outlook}
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed.url)}&name=${encodeURIComponent(t.feedName)}`,
                  )
                }
              />
            </View>
          </View>
          <View style={styles.group}>
            <Text style={styles.strong}>
              {feed.lastReadAt ? t.lastRead(formatAgo(feed.lastReadAt)) : t.neverRead}
            </Text>
            <Text style={styles.small}>{t.delay}</Text>
          </View>
          <View style={styles.privacy}>
            <ShieldCheck size={16} color={colors.primary} />
            <Text style={[styles.small, styles.privacyText]}>{t.privacy}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              role="button"
              aria-disabled={pending !== null}
              disabled={pending !== null}
              hitSlop={8}
              onPress={() => run("renew")}
            >
              <Text style={styles.renew}>{t.renew}</Text>
            </Pressable>
            <Pressable
              role="button"
              aria-disabled={pending !== null}
              disabled={pending !== null}
              hitSlop={8}
              onPress={() => run("disable")}
            >
              <Text style={styles.disable}>{t.disable}</Text>
            </Pressable>
          </View>
          <Text style={styles.small}>{t.renewHint}</Text>
        </>
      ) : (
        <Button
          label={t.create}
          variant="secondary"
          onPress={() => run("renew")}
          loading={pending === "renew"}
        />
      )}
    </Card>
  );
}

function CalendarLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      role="link"
      onPress={onPress}
      style={({ pressed }) => [styles.calendar, pressed && styles.pressed]}
    >
      <CalendarPlus size={14} color={colors["primary-strong"]} />
      <Text style={styles.calendarText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  text: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  group: { gap: spacing(2) },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  url: {
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing(3),
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 12,
    color: colors.foreground,
  },
  links: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  calendar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3.5),
  },
  calendarText: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  pressed: { opacity: 0.8 },
  strong: { fontFamily: font.medium, fontSize: 12, color: colors.foreground },
  small: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  privacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(2),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    padding: spacing(3),
  },
  privacyText: { flex: 1 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  renew: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  disable: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
});
