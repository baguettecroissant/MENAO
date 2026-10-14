import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { CalendarDays, ChevronLeft, Clock, type LucideIcon } from "lucide-react-native";
import { useCallback, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { formatDayAndTime } from "@/lib/format";
import { goBack } from "@/lib/navigation";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;
const ON_COLOR = colors["primary-foreground"];

export type BandMeta = { icon: LucideIcon; text: string };

/** Jour et heure d'un rendez-vous pour la ligne du bandeau, comme les maquettes ; rien sans date. */
export function whenMeta(iso: string | null | undefined): BandMeta[] {
  if (!iso) return [];
  const { day, time } = formatDayAndTime(iso);
  return [
    { icon: CalendarDays, text: day.charAt(0).toUpperCase() + day.slice(1) },
    { icon: Clock, text: time },
  ];
}

/**
 * Bandeau bleu des maquettes en haut des écrans de détail : retour, titre et ligne
 * d'informations (date et heure, adresse). `children` : onglets du parcours, sur fond blanc
 * sous le bandeau. Barre d'état claire tant que l'écran est affiché.
 */
export function HeaderBand({
  title,
  meta = [],
  onBack = goBack,
  children,
}: {
  title: string;
  meta?: BandMeta[];
  onBack?: () => void;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );
  return (
    <View>
      <View style={[styles.band, { paddingTop: insets.top + spacing(2) }]}>
        <Pressable
          role="button"
          aria-label={fr.nav.back}
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={ON_COLOR} />
        </Pressable>
        <View style={styles.texts}>
          <Text role="heading" style={styles.title} numberOfLines={3}>
            {title}
          </Text>
          {meta.length > 0 ? (
            <View style={styles.meta}>
              {meta.map(({ icon: Icon, text }) => (
                <View key={text} style={styles.metaItem}>
                  <Icon size={14} color={ON_COLOR} />
                  <Text style={styles.metaText}>{text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      {children ? <View style={styles.below}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(1),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(4),
  },
  back: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: colors["primary-strong"] },
  texts: { flex: 1, gap: spacing(1.5), paddingTop: spacing(2.5), paddingRight: spacing(2) },
  title: { fontFamily: font.medium, fontSize: 18, lineHeight: 24, color: ON_COLOR },
  meta: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing(4), rowGap: spacing(1) },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  metaText: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: ON_COLOR },
  below: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
  },
});
