import { X } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BadgeIcon } from "./badge-icon";
import { fr } from "@/i18n/fr";
import { Button, LinkText } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.grade.newBadge;
const { colors, font, radius, spacing } = theme;

// Confettis fixes de la maquette (position en %, couleur, rotation).
const CONFETTI = [
  [8, 2, "#F5C34B", 20],
  [26, 3, "#FFFFFF", -30],
  [44, 1, "#7FA0FF", 45],
  [62, 3, "#F5C34B", -15],
  [80, 2, "#FFFFFF", 60],
  [12, 56, "#7FA0FF", 10],
  [30, 60, "#FFFFFF", -50],
  [50, 55, "#F5C34B", 35],
  [70, 61, "#FFFFFF", 25],
  [88, 57, "#7FA0FF", -40],
] as const;

/**
 * « Nouveau badge MENAO débloqué ! » (maquette, F-24) : plein écran bleu avec confettis, carte du
 * badge, « Continuer sur MENAO » ou « Voir ma collection de badges ».
 */
export function NewBadgeModal({
  badge,
  onClose,
  onCollection,
}: {
  badge: { code: string; label: string; description: string } | null;
  onClose: () => void;
  onCollection: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={badge !== null} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: insets.top + spacing(3) }]}>
        {CONFETTI.map(([left, top, color, rotate], i) => (
          <View
            key={i}
            aria-hidden
            style={[
              styles.confetti,
              {
                left: `${left}%`,
                top: `${top}%`,
                backgroundColor: color,
                transform: [{ rotate: `${rotate}deg` }],
              },
            ]}
          />
        ))}
        <Pressable
          role="button"
          aria-label={t.close}
          onPress={onClose}
          hitSlop={8}
          style={styles.close}
        >
          <X size={24} color={colors["primary-foreground"]} />
        </Pressable>
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
        {badge ? (
          <View style={styles.card}>
            <BadgeIcon code={badge.code} unlocked size={112} />
            <Text style={styles.name}>{badge.label}</Text>
            <Text style={styles.description}>{badge.description}</Text>
            <Text style={styles.congrats}>{t.congrats}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(4) }]}>
        <Button label={t.continue} onPress={onClose} />
        <View style={styles.link}>
          <LinkText label={t.collection} onPress={onCollection} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    gap: spacing(6),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(5),
  },
  confetti: { position: "absolute", width: 8, height: 14, borderRadius: 2, opacity: 0.9 },
  close: { alignSelf: "flex-start" },
  title: {
    fontFamily: font.medium,
    fontSize: 22,
    textAlign: "center",
    color: colors["primary-foreground"],
  },
  card: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.hero,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(8),
  },
  name: { fontFamily: font.medium, fontSize: 20, color: colors.foreground },
  description: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
  congrats: { fontFamily: font.medium, fontSize: 15, color: colors["primary-strong"] },
  footer: {
    gap: spacing(3),
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
  },
  link: { alignItems: "center" },
});
