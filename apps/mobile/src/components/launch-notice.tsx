import { router } from "expo-router";
import { Clock } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { FicheButton, FicheCard, FicheScreen } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.launch;
const { colors, font, spacing } = theme;

/** Demandes de devis fermées jusqu'au lancement (F-188, ADR 0387), comme sur le site. */
export function RequestsSoonScreen() {
  return (
    <FicheScreen
      footer={
        <FicheButton
          label={t.requestsArtisan}
          tall
          onPress={() => router.replace("/pro-inscription")}
        />
      }
    >
      <View style={styles.center}>
        <View style={styles.icon}>
          <Clock size={26} color={colors["primary-strong"]} />
        </View>
        <Text role="heading" aria-level={1} style={styles.title}>
          {t.requestsTitle}
        </Text>
        <Text style={styles.text}>{t.requestsText}</Text>
      </View>
    </FicheScreen>
  );
}

/** Compte de paiement fermé jusqu'au lancement (ADR 0387). */
export function PaymentsSoonCard() {
  return (
    <FicheCard padding={4.5} gap={2}>
      <View style={styles.row}>
        <View style={styles.iconSmall}>
          <Clock size={20} color={colors["primary-strong"]} />
        </View>
        <View style={styles.rowText}>
          <Text role="heading" style={styles.cardTitle}>
            {t.paymentsTitle}
          </Text>
          <Text style={styles.cardText}>{t.paymentsText}</Text>
        </View>
      </View>
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: spacing(3), paddingTop: spacing(10) },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  title: {
    textAlign: "center",
    fontFamily: font.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.6,
    color: colors.foreground,
  },
  text: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.label,
  },
  row: { flexDirection: "row", gap: spacing(3.5) },
  iconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  rowText: { flex: 1, gap: spacing(1) },
  cardTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  cardText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
});
