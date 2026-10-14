import { Camera, CalendarDays, ChevronLeft, MapPin, Pencil, Wrench } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { goBack } from "@/lib/navigation";
import type { NeedSummary } from "@/lib/project";
import { theme } from "@/ui/theme";

const t = fr.needSummary;
const { colors, font, radius, spacing } = theme;

/** Date souhaitée du projet, en clair. */
export function summaryDate(summary: NeedSummary): string {
  if (summary.dateMode === "date" && summary.dateSouhaitee) {
    return formatLongDate(summary.dateSouhaitee);
  }
  return summary.dateMode === "des_que_possible" ? t.asap : t.unknownDate;
}

/**
 * Haut des résultats et de l'envoi de la demande, comme les maquettes : bande blanche « Résumé de
 * mon besoin » (métier, ville, date souhaitée, photos) avec le crayon pour le modifier. Elle
 * couvre la barre d'état ; `children` : bandes suivantes (artisan sélectionné).
 */
export function NeedSummaryBand({
  summary,
  onEdit,
  children,
}: {
  summary: NeedSummary;
  onEdit: () => void;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const items = [
    { icon: Wrench, text: summary.tradeLabel },
    ...(summary.city ? [{ icon: MapPin, text: summary.city }] : []),
    { icon: CalendarDays, text: summaryDate(summary) },
    ...(summary.photoCount > 0 ? [{ icon: Camera, text: t.photos(summary.photoCount) }] : []),
  ];
  return (
    <View style={[styles.band, { paddingTop: insets.top + spacing(1) }]}>
      <View style={styles.strip}>
        <Pressable
          role="button"
          aria-label={fr.nav.back}
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.texts}>
          <Text role="heading" style={styles.title}>
            {t.title}
          </Text>
          <View style={styles.items}>
            {items.map(({ icon: Icon, text }) => (
              <View key={text} style={styles.item}>
                <Icon size={13} color={colors.primary} />
                <Text style={styles.itemText} numberOfLines={1}>
                  {text}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Pressable
          role="button"
          aria-label={t.edit}
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
        >
          <Pencil size={18} color={colors.foreground} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(3),
  },
  back: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  edit: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: colors["primary-soft"] },
  texts: { flex: 1, gap: spacing(1) },
  title: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  items: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing(3), rowGap: spacing(1) },
  item: { flexDirection: "row", alignItems: "center", gap: spacing(1), maxWidth: "100%" },
  itemText: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
});
