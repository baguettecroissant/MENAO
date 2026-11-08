import { Check, type LucideIcon } from "lucide-react-native";
import { Fragment, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuote;
const { colors, font, radius, spacing } = theme;

/**
 * Briques de l'éditeur de devis « Nette » (lot 2), d'après la maquette « DevisApp » : étapes
 * Lignes · Aperçu · Envoi, état d'enregistrement de la barre du haut et cartes « créer vite ».
 */

export const QUOTE_STEPS = ["lines", "preview", "send"] as const;
export type QuoteStep = (typeof QUOTE_STEPS)[number];

/** Carte des étapes : étape en cours en pastille bleu nuit, étapes passées cochées. */
export function QuoteSteps({ current }: { current: QuoteStep }) {
  const index = QUOTE_STEPS.indexOf(current);
  return (
    <View style={styles.stepsCard} aria-label={t.steps.label}>
      {QUOTE_STEPS.map((step, i) => {
        const state = i < index ? "done" : i === index ? "now" : "next";
        const label = t.steps[step];
        return (
          <Fragment key={step}>
            {i > 0 ? <View style={styles.stepLine} /> : null}
            <View
              style={styles.step}
              aria-label={
                state === "now"
                  ? `${label}, ${fr.nav.currentStep}`
                  : state === "done"
                    ? `${label}, ${fr.nav.doneStep}`
                    : label
              }
            >
              <View style={[styles.stepDot, state === "next" ? styles.dotNext : styles.dotOn]}>
                {state === "done" ? (
                  <Check size={13} color={colors["primary-foreground"]} strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepNumber, state !== "next" && styles.stepNumberOn]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, state === "now" && styles.stepLabelNow]}>
                {label}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

/** « Enregistré » en vert avec sa coche, à droite de la barre du haut. */
export function SavedState() {
  return (
    <View style={styles.saved} role="status">
      <Check size={14} color={colors.success} strokeWidth={2.6} />
      <Text style={styles.savedText}>{t.statusSaved}</Text>
    </View>
  );
}

/** Carte « créer vite » : icône sur fond coloré, titre (pastille facultative), phrase. */
export function QuickCard({
  icon: Icon,
  title,
  hint,
  tone = "primary",
  badge,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  tone?: "primary" | "neutral";
  /** Pastille d'information (« Premium ») : jamais de lien d'achat (règle 10). */
  badge?: string;
  onPress: () => void;
}) {
  const primary = tone === "primary";
  return (
    <Tappable
      role="button"
      aria-label={`${title}. ${hint}`}
      onPress={onPress}
      scaleTo={0.98}
      style={styles.quick}
    >
      <View style={[styles.quickIcon, primary ? styles.quickIconPrimary : styles.quickIconNeutral]}>
        <Icon size={20} color={primary ? colors["primary-strong"] : colors.label} />
      </View>
      <View style={styles.quickText}>
        <View style={styles.quickTitleRow}>
          <Text style={styles.quickTitle}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.quickHint}>{hint}</Text>
      </View>
    </Tappable>
  );
}

/** Pile des cartes « créer vite ». */
export function QuickStack({ children }: { children: ReactNode }) {
  return (
    <View style={styles.stack} aria-label={t.quick.label}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stepsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    padding: spacing(3.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  step: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  stepLine: { flex: 1, height: 2, backgroundColor: colors["border-strong"] },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dotOn: { backgroundColor: colors.foreground },
  dotNext: { borderWidth: 2, borderColor: colors["border-strong"] },
  stepNumber: { fontFamily: font.bold, fontSize: 13, color: colors["muted-foreground"] },
  stepNumberOn: { color: colors["primary-foreground"] },
  stepLabel: { fontFamily: font.semibold, fontSize: 14, color: colors["muted-foreground"] },
  stepLabelNow: { fontFamily: font.bold, color: colors.foreground },
  saved: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  savedText: { fontFamily: font.semibold, fontSize: 13, color: colors.success },
  stack: { gap: spacing(3) },
  quick: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    padding: spacing(3.5),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconPrimary: { backgroundColor: colors["primary-soft"] },
  quickIconNeutral: { backgroundColor: "#f1f2f5" },
  quickText: { flex: 1, gap: 2 },
  quickTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  quickTitle: { flexShrink: 1, fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  quickHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  badge: {
    overflow: "hidden",
    borderRadius: radius.chip,
    backgroundColor: colors["primary-soft"],
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontFamily: font.bold,
    fontSize: 11,
    color: colors["primary-strong"],
  },
});
