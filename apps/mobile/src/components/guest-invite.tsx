import { router } from "expo-router";
import { Check, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FicheButton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { Screen } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/**
 * Écran d'un visiteur sur une partie réservée aux comptes (chantiers, messages, notifications) :
 * ce qu'il y trouvera, puis création de compte ou connexion.
 */
export function GuestInvite({
  icon: Icon,
  title,
  text,
  header,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  header?: ReactNode;
}) {
  // Refonte « Nette » (lot 49, ADR 0318) : grande icône, titre, avantages cochés, création du
  // compte et connexion dessous.
  return (
    <Screen centered header={header}>
      <View style={styles.illustration}>
        <View style={styles.tile}>
          <Icon size={34} color={colors["primary-strong"]} />
        </View>
      </View>
      <Text role="heading" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.text}>{text}</Text>
      <View style={styles.benefits}>
        {fr.guest.benefits.map((benefit) => (
          <View key={benefit} style={styles.benefit}>
            <View style={styles.check}>
              <Check size={13} color={colors.success} strokeWidth={3} />
            </View>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
      {/* Dans la page et non en bas d'écran : la barre d'onglets et son bouton rond y sont. */}
      <View style={styles.footer}>
        <FicheButton
          label={fr.guest.createAccount}
          tall
          onPress={() => router.push("/inscription")}
        />
        <Pressable role="link" hitSlop={8} onPress={() => router.push("/connexion")}>
          <Text style={styles.signIn}>
            {fr.guest.haveAccount} <Text style={styles.signInLink}>{fr.guest.signIn}</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  illustration: { alignItems: "center" },
  tile: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: font.display,
    fontSize: 24,
    letterSpacing: -0.48,
    color: colors.foreground,
    textAlign: "center",
  },
  text: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.label,
    textAlign: "center",
  },
  benefits: {
    gap: spacing(3),
    padding: spacing(4.5),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  benefit: { flexDirection: "row", alignItems: "center", gap: spacing(2.5) },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors["success-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.foreground },
  footer: { gap: spacing(2.5) },
  signIn: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
  signInLink: { fontFamily: font.semibold, color: colors["primary-strong"] },
});
