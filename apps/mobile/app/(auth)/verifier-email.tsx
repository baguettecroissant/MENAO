import { router, useLocalSearchParams } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Logo } from "@/components/logo";
import { FicheButton, FicheScreen } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { closeAuth } from "@/lib/navigation";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/**
 * Après l'inscription : le lien de confirmation s'ouvre sur le site, puis on se connecte ici.
 * Refonte « Nette » (lot 13, maquette « MotDePasseNette ») : logo, rond d'enveloppe bleu clair,
 * grand titre centré, boutons pleine largeur.
 */
export default function CheckEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <FicheScreen back={false}>
      <Logo />
      <View style={styles.card}>
        <View style={styles.icon}>
          <MailCheck size={30} color={colors["primary-strong"]} />
        </View>
        <Text role="heading" aria-level={1} style={styles.title}>
          {fr.auth.checkEmailTitle}
        </Text>
        <Text style={styles.text}>{fr.auth.checkEmailText(email ?? "")}</Text>
      </View>
      <View style={styles.actions}>
        <FicheButton
          label={fr.auth.backToSignIn}
          tall
          onPress={() => router.replace("/connexion")}
        />
        <FicheButton
          label={fr.auth.continueBrowsing}
          variant="secondary"
          tall
          onPress={closeAuth}
        />
      </View>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing(4),
    paddingVertical: spacing(8),
    paddingHorizontal: spacing(5),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.9,
    color: colors.foreground,
  },
  text: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.label,
  },
  actions: { gap: spacing(2.5) },
});
