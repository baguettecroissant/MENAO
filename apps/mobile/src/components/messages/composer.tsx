import { MESSAGE_MAX_LENGTH } from "@menao/core";
import { conversationMessageSchema } from "@menao/validation";
import { ImagePlus, Send } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { sendMessage } from "@/lib/messages";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { theme } from "@/ui/theme";

const t = fr.messages;
const { colors, font, radius, spacing } = theme;

/**
 * Saisie d'un message (F-40), contrôlé comme sur le site (2 000 caractères au plus), et photo
 * jointe : prise de vue ou photothèque, réduite sur le téléphone puis vérifiée par process-upload.
 */
export function Composer({ chantierId, onSent }: { chantierId: string; onSent: () => void }) {
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function attach() {
    if (uploading) return;
    const source = await choosePhotoSource(t.attach);
    if (!source) return;
    const picked = await pickPhotos(source);
    if ("error" in picked) return setError(picked.error);
    const photo = picked.photos[0];
    if (!photo) return;
    setError(null);
    setUploading(true);
    const status = await uploadPhoto({ purpose: "message_attachment", chantierId }, photo);
    setUploading(false);
    if (status === "ok") return onSent();
    setError(t.attachErrors[status as keyof typeof t.attachErrors] ?? t.attachErrors.failed);
  }

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
    onSent();
  }

  const empty = !body.trim();
  return (
    <View style={[styles.composer, { paddingBottom: insets.bottom + spacing(2) }]}>
      {uploading ? (
        <Text role="status" style={styles.status}>
          {t.uploading}
        </Text>
      ) : null}
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          role="button"
          aria-label={t.attach}
          aria-disabled={uploading}
          disabled={uploading}
          onPress={attach}
          style={({ pressed }) => [
            styles.attach,
            uploading && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <ImagePlus size={20} color={colors["primary-strong"]} />
          )}
        </Pressable>
        <TextInput
          aria-label={t.composerLabel}
          value={body}
          onChangeText={(value) => {
            setBody(value);
            setError(null);
          }}
          placeholder={t.composerPlaceholder}
          placeholderTextColor={colors["subtle-foreground"]}
          maxLength={MESSAGE_MAX_LENGTH}
          multiline
          style={styles.input}
        />
        <Pressable
          role="button"
          aria-label={t.send}
          aria-disabled={empty || pending}
          disabled={empty || pending}
          onPress={send}
          style={({ pressed }) => [
            styles.send,
            (empty || pending) && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          {pending ? (
            <ActivityIndicator color={colors["primary-foreground"]} />
          ) : (
            <Send size={20} color={colors["primary-foreground"]} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing(2) },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 140,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
    paddingBottom: spacing(3),
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.foreground,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  attach: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  status: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
});
