import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { fr } from "@/i18n/fr";
import { formatDateNumeric, formatDayLabel, formatTime } from "@/lib/format";
import type { ConversationItem } from "@/lib/messages";
import { theme } from "@/ui/theme";

const t = fr.messages;
const { colors, font, spacing } = theme;

/** Une conversation de la liste « Messages » (F-40) : artisan, chantier, dernier message, non lus. */
export function ConversationRow({ row, now }: { row: ConversationItem; now: Date }) {
  const preview = row.last_hidden
    ? t.hiddenPreview
    : row.last_kind === "photo"
      ? t.photo
      : row.last_kind === "fichier"
        ? t.file
        : row.last_body;
  const today = formatDayLabel(row.last_at, now) === fr.ago.today;
  const time = today ? formatTime(row.last_at) : formatDateNumeric(row.last_at);
  const unread = row.unread > 0;
  return (
    <Pressable
      role="link"
      aria-label={[
        row.other_name,
        row.title,
        `${row.last_mine ? t.you : ""}${preview}`,
        time,
        unread ? t.unread(row.unread) : null,
      ]
        .filter(Boolean)
        .join(", ")}
      onPress={() => router.push(`/conversation/${row.chantier_id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar url={row.avatarUrl} name={row.other_name} />
      <View style={styles.text}>
        <View style={styles.line}>
          <Text style={[styles.name, unread && styles.bold]} numberOfLines={1}>
            {row.other_name}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {row.title}
          {row.closed ? ` · ${t.closedTag}` : ""}
        </Text>
        <View style={styles.line}>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {row.last_mine ? t.you : ""}
            {preview}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{row.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
  },
  pressed: { backgroundColor: colors.background },
  text: { flex: 1, gap: 2 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  name: { flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  bold: { fontFamily: font.bold },
  time: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  title: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  preview: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  previewUnread: { fontFamily: font.medium, color: colors.foreground },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: spacing(1.5),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-foreground"] },
});
