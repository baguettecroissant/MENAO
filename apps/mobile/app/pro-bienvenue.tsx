import { router } from "expo-router";
import { Camera, CircleCheck, Clock, FileText, MapPin } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { loadWelcome } from "@/lib/artisan-signup";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proSignup.welcome;
const { colors, font, radius, spacing } = theme;

/** Initiales de l'entreprise pour l'aperçu de la fiche (« Plomberie des Oliviers » → « PO »). */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "M"
  );
}

/**
 * « Votre profil est créé » (ADR 0113), comme sur le site : aperçu de la fiche avec les choix du
 * parcours, puis la suite (charte, documents, photo et présentation).
 */
export default function ArtisanWelcomeScreen() {
  const [data] = useFocusData(loadWelcome);
  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const name = data?.name ?? t.companyFallback;
  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button label={t.cta} onPress={() => router.replace("/pro")} />
          <Text style={styles.later}>{t.later}</Text>
        </View>
      }
    >
      <View style={styles.success}>
        <CircleCheck size={28} color={colors["primary-foreground"]} />
      </View>
      <View style={styles.head}>
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
        <Body muted>{t.lead}</Body>
      </View>
      {data?.sirene ? <Notice tone="info">{t.sirene[data.sirene]}</Notice> : null}
      <Card>
        <View style={styles.preview}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={styles.previewText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.muted}>{data?.trades.join(" · ")}</Text>
          </View>
        </View>
        {data?.baseLabel && data.radiusKm ? (
          <View style={styles.line}>
            <MapPin size={16} color={colors["muted-foreground"]} />
            <Text style={[styles.muted, styles.flex]}>{t.zone(data.baseLabel, data.radiusKm)}</Text>
          </View>
        ) : null}
        <View style={styles.pending}>
          <Clock size={14} color={colors.warning} />
          <Text style={styles.pendingText}>{t.toVerify}</Text>
        </View>
      </Card>
      <View style={styles.next}>
        <Text style={styles.nextTitle}>{t.nextTitle}</Text>
        {t.items.map((item) => (
          <View key={item} style={styles.line}>
            <FileText size={16} color={colors["primary-strong"]} />
            <Text style={[styles.item, styles.flex]}>{item}</Text>
          </View>
        ))}
        <View style={styles.line}>
          <Camera size={16} color={colors["primary-strong"]} />
          <Text style={[styles.duration, styles.flex]}>{t.duration}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  success: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  head: { gap: spacing(2) },
  title: { fontFamily: font.bold, fontSize: 26, lineHeight: 32, color: colors.foreground },
  preview: { flexDirection: "row", alignItems: "center", gap: spacing(3.5) },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.bold, fontSize: 20, color: colors["primary-foreground"] },
  previewText: { flex: 1, gap: 2 },
  name: { fontFamily: font.bold, fontSize: 18, color: colors.foreground },
  muted: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  flex: { flex: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: spacing(2.5) },
  pending: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    alignSelf: "flex-start",
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors["warning-soft"],
  },
  pendingText: { fontFamily: font.bold, fontSize: 13, color: colors.warning },
  next: {
    gap: spacing(3),
    padding: spacing(5),
    borderRadius: radius.card,
    backgroundColor: colors["primary-softer"],
  },
  nextTitle: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  item: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  duration: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  footer: { gap: spacing(2) },
  later: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
