import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.proPayments.ahead;
const { colors, font, radius, spacing } = theme;

export type StripeAheadSent = { company: boolean; identity: boolean; piece: boolean };

/**
 * Avant Stripe (F-181, ADR 0378), comme sur le site : ce que MENAO transmet à la place de
 * l'artisan, puis ce que Stripe va lui demander, dont la protection du compte par SMS.
 */
export function StripeAhead({ sent }: { sent: StripeAheadSent }) {
  const items = [
    sent.company ? t.company : null,
    sent.identity ? t.identity : null,
    sent.piece ? t.piece : null,
  ].filter((item) => item !== null);
  return (
    <View style={styles.wrap}>
      {items.length > 0 ? (
        <View style={styles.sent}>
          <Text style={styles.heading} accessibilityRole="header">
            {t.sentTitle}
          </Text>
          {items.map((item) => (
            <View key={item.title} style={styles.row}>
              <View style={styles.check}>
                <Check size={14} color={colors["primary-foreground"]} strokeWidth={3.2} />
              </View>
              <View style={styles.texts}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.hint}>{item.hint}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.asked}>
        <Text style={[styles.heading, styles.headingAsked]} accessibilityRole="header">
          {t.askedTitle}
        </Text>
        {t.asked.map((item, index) => (
          <View key={item.title} style={styles.row}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.texts}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.hint}>{item.hint}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(3) },
  sent: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  asked: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: "#b9c6f5",
    backgroundColor: colors["primary-softer"],
  },
  heading: {
    paddingVertical: spacing(2),
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors["muted-foreground"],
  },
  headingAsked: { color: colors["primary-strong"] },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    paddingVertical: spacing(2),
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
  },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  numberText: { fontFamily: font.bold, fontSize: 13, color: colors["primary-strong"] },
  texts: { flex: 1, gap: 1 },
  title: { fontFamily: font.semibold, fontSize: 14.5, color: colors.foreground },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
