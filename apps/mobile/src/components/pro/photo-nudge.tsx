import { Camera } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { forgetProfileSummary } from "@/lib/profile-summary";
import { theme } from "@/ui/theme";

const t = fr.proDashboard.photo;
const { colors, font, radius, spacing } = theme;

/**
 * Artisan sans photo de profil : carte du tableau de bord qui invite à en ajouter une, puis
 * l'envoie (recadrée au carré, réduite à 512 px, comme sur le site). La carte disparaît dès que
 * l'en-tête relit la photo.
 */
export function PhotoNudge() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const source = await choosePhotoSource(t.choose);
    if (!source) return;
    const picked = await pickPhotos(source, 1, true);
    if ("error" in picked) {
      setError(picked.error);
      return;
    }
    const photo = picked.photos[0];
    if (!photo) return;
    setSending(true);
    const status = await uploadPhoto({ purpose: "avatar" }, photo);
    setSending(false);
    if (status === "ok") forgetProfileSummary();
    else setError(fr.search.upload[status] ?? fr.search.upload.unavailable);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Camera size={22} color={colors["primary-strong"]} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.body}>{t.text}</Text>
        </View>
      </View>
      {error ? (
        <Text style={styles.error} role="alert">
          {error}
        </Text>
      ) : null}
      <Pressable
        role="button"
        aria-label={t.add}
        disabled={sending}
        onPress={add}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {sending ? <ActivityIndicator color={colors["primary-foreground"]} /> : null}
        <Text style={styles.buttonText}>{sending ? t.sending : t.add}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 1px 3px rgba(17, 23, 40, 0.06)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  body: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: { fontFamily: font.medium, fontSize: 15, color: colors["primary-foreground"] },
  pressed: { opacity: 0.85 },
});
