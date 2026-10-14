import { conversationMessageSchema } from "@menao/validation";
import { MESSAGE_MAX_LENGTH } from "@menao/core";
import { router } from "expo-router";
import { ChevronRight, Send } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { Avatar } from "@/components/avatar";
import { fr } from "@/i18n/fr";
import { formatAgo } from "@/lib/format";
import { loadConversationPreview, sendMessage } from "@/lib/messages";
import { useFocusData } from "@/lib/use-focus-data";
import { theme } from "@/ui/theme";

const t = fr.messages.card;
const { colors, font, radius, spacing } = theme;

/**
 * « Messagerie avec … » en tête du suivi côté artisan (maquette « Vue d'un chantier »), comme sur
 * le site : interlocuteur et date du dernier message (un appui ouvre la conversation), et envoi
 * rapide d'un message (F-40, mêmes règles que la conversation). Masquée si la conversation est
 * fermée.
 */
export function ConversationCard({ chantierId, name }: { chantierId: string; name: string }) {
  const [preview, reload] = useFocusData(
    useCallback(() => loadConversationPreview(chantierId), [chantierId]),
  );
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  if (!preview || preview.closed) return null;

  async function send() {
    if (pending) return;
    const parsed = conversationMessageSchema.safeParse({ body });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.body?.[0] ?? null);
      return;
    }
    setError(null);
    setPending(true);
    const failed = await sendMessage(chantierId, parsed.data.body);
    setPending(false);
    if (failed) return setError(failed);
    setBody("");
    setSent(true);
    reload();
  }

  return (
    <View style={styles.card}>
      <Text role="heading" style={styles.title}>
        {t.title(name)}
      </Text>
      <Pressable
        role="link"
        aria-label={t.open(name)}
        onPress={() => router.push(`/conversation/${chantierId}`)}
        style={({ pressed }) => [styles.person, pressed && styles.pressed]}
      >
        <Avatar url={null} name={name} size={40} />
        <View style={styles.personText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {preview.lastAt ? t.last(formatAgo(preview.lastAt)) : t.none}
          </Text>
        </View>
        {preview.unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t.unread(preview.unread)}</Text>
          </View>
        ) : null}
        <ChevronRight size={18} color={colors["muted-foreground"]} />
      </Pressable>
      <View style={styles.composer}>
        <TextInput
          aria-label={fr.messages.composerLabel}
          value={body}
          onChangeText={(value) => {
            setBody(value);
            setError(null);
            setSent(false);
          }}
          placeholder={t.placeholder}
          placeholderTextColor={colors["subtle-foreground"]}
          maxLength={MESSAGE_MAX_LENGTH}
          multiline
          style={styles.input}
        />
        <Pressable
          role="button"
          aria-label={fr.messages.send}
          aria-disabled={!body.trim() || pending}
          disabled={!body.trim() || pending}
          onPress={send}
          style={({ pressed }) => [
            styles.send,
            (!body.trim() || pending) && styles.sendOff,
            pressed && styles.pressed,
          ]}
        >
          {pending ? (
            <ActivityIndicator size="small" color={colors["primary-foreground"]} />
          ) : (
            <Send size={16} color={colors["primary-foreground"]} />
          )}
        </Pressable>
      </View>
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : sent ? (
        <Text role="status" style={styles.sent}>
          {t.sent}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  title: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  person: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  pressed: { opacity: 0.8 },
  personText: { flex: 1, gap: 2 },
  name: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  badgeText: { fontFamily: font.medium, fontSize: 11, color: colors["primary-foreground"] },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing(2),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingLeft: spacing(3),
    paddingRight: spacing(1.5),
    paddingVertical: spacing(1.5),
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: spacing(1.5),
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.foreground,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.5 },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  sent: { fontFamily: font.regular, fontSize: 13, color: colors.success },
});
