import { router } from "expo-router";
import {
  Camera,
  Check,
  Clock,
  FileText,
  MapPin,
  PenLine,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { CardHeading, FicheButton, FicheCard, FicheTag } from "@/components/pro/fiche-kit";
import { IconSquare } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { loadWelcome } from "@/lib/artisan-signup";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proSignup.welcome;
const { colors, font, spacing } = theme;

/** Icônes de la liste « Dernière étape », dans l'ordre de `t.items` (charte, documents, photo). */
const ITEM_ICONS: LucideIcon[] = [
  PenLine,
  FileText,
  ShieldCheck,
  ShieldCheck,
  UserRound,
  FileText,
  Camera,
];

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
 * parcours, puis la suite (charte, documents, photo et présentation). Refonte « Nette » (lot 9,
 * maquette « BienvenueNette ») : rond vert, grand titre, aperçu en carte et carte « Dernière
 * étape » avec la liste et le bouton.
 */
export default function ArtisanWelcomeScreen() {
  const [data] = useFocusData(loadWelcome);
  if (data === undefined) return <ScreenSkeleton />;
  const name = data?.name ?? t.companyFallback;
  return (
    <Screen>
      <View style={styles.success}>
        <Check size={28} color={colors["primary-foreground"]} strokeWidth={2.6} />
      </View>
      <PageHead title={t.title} lead={t.lead} />
      {data?.sirene ? <Notice tone="info">{t.sirene[data.sirene]}</Notice> : null}
      <FicheCard padding={5} gap={3.5}>
        <View style={styles.preview}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={styles.previewText}>
            <Text style={styles.name}>{name}</Text>
            {data?.trades.length ? (
              <Text style={styles.muted}>{data.trades.join(" · ")}</Text>
            ) : null}
          </View>
        </View>
        {data?.baseLabel && data.radiusKm ? (
          <View style={styles.line}>
            <MapPin size={16} color={colors.label} />
            <Text style={[styles.zone, styles.flex]}>{t.zone(data.baseLabel, data.radiusKm)}</Text>
          </View>
        ) : null}
        <FicheTag text={t.toVerify} tone="warning" dot />
      </FicheCard>
      <FicheCard padding={5} gap={3.5}>
        <CardHeading title={t.nextTitle} size={19} />
        <View style={styles.line}>
          <Clock size={15} color={colors["primary-strong"]} />
          <Text style={[styles.duration, styles.flex]}>{t.duration}</Text>
        </View>
        <View>
          {t.items.map((item, i) => (
            <View key={item} style={styles.item}>
              <IconSquare icon={ITEM_ICONS[i] ?? FileText} tone="neutral" size={34} />
              <Text style={[styles.itemText, styles.flex]}>{item}</Text>
            </View>
          ))}
        </View>
        <FicheButton label={t.cta} tall onPress={() => router.replace("/pro")} />
        <Text style={styles.later}>{t.later}</Text>
      </FicheCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.bold, fontSize: 22, color: colors["primary-foreground"] },
  previewText: { flex: 1, gap: 2 },
  name: {
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.44,
    color: colors.foreground,
  },
  muted: { fontFamily: font.regular, fontSize: 15, color: colors["muted-foreground"] },
  zone: { fontFamily: font.regular, fontSize: 14, color: colors.label },
  flex: { flex: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  duration: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemText: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: colors.foreground },
  later: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
