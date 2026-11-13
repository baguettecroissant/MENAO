import type { PaymentTrigger } from "@menao/core";
import { Check } from "lucide-react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/ui/theme";

/**
 * Pièces de l'échéancier de paiement (F-146, maquette lot 40), comme sur le site : couleur de
 * chaque moment, barre segmentée, ligne d'une tranche (pourcentage réglable ou calculé) et frise
 * du client. Calculs dans @menao/core.
 */
const { colors, font, radius, spacing } = theme;

/** Acompte (bleu), démarrage (violet), réception (encre). */
export const TRANCHE_COLORS: Record<PaymentTrigger, string> = {
  signature: colors.primary,
  demarrage: colors.violet,
  reception: colors.foreground,
};

export function ScheduleBar({
  tranches,
  height = 10,
}: {
  tranches: readonly { percent: number; trigger: PaymentTrigger }[];
  height?: number;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { height, borderRadius: height / 2 }]}
    >
      {tranches
        .filter((tranche) => tranche.percent > 0)
        .map((tranche) => (
          <View
            key={tranche.trigger}
            style={{ flex: tranche.percent, backgroundColor: TRANCHE_COLORS[tranche.trigger] }}
          />
        ))}
    </View>
  );
}

/** Ligne d'une tranche : pastille, titre, moment, pourcentage (champ, ou calculé pour le solde). */
export function TrancheRow({
  trigger,
  title,
  hint,
  percent,
  value,
  onChange,
  label,
  invalid = false,
  first = false,
}: {
  trigger: PaymentTrigger;
  title: string;
  hint: string;
  percent: number;
  /** Valeur saisie ; sans `onChange`, la part est calculée (solde). */
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  invalid?: boolean;
  first?: boolean;
}) {
  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <View style={[styles.dot, { backgroundColor: TRANCHE_COLORS[trigger] }]} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      {onChange ? (
        <View style={[styles.field, invalid && styles.fieldInvalid]}>
          <TextInput
            value={value}
            onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel={label ?? title}
            style={styles.input}
          />
          <Text style={styles.percent}>%</Text>
        </View>
      ) : (
        <View style={[styles.field, styles.fieldFixed]}>
          <Text style={styles.fixed}>{percent} %</Text>
        </View>
      )}
    </View>
  );
}

/** Frise du client : étape faite (coche verte), en cours (violet) ou à venir (cercle vide). */
export function PaymentTimeline({
  steps,
}: {
  steps: readonly { label: string; detail: string; state: "done" | "now" | "todo" }[];
}) {
  return (
    <View style={styles.timeline}>
      {steps.map((step) => (
        <View key={step.label} style={styles.step}>
          <View
            style={[
              styles.stepDot,
              step.state === "done" && { backgroundColor: colors.success },
              step.state === "now" && { backgroundColor: colors.violet },
              step.state === "todo" && styles.stepTodo,
            ]}
          >
            {step.state === "done" ? <Check size={14} strokeWidth={3} color="#ffffff" /> : null}
          </View>
          <View style={styles.stepText}>
            <Text style={styles.rowTitle}>{step.label}</Text>
            <Text style={styles.rowHint}>{step.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: 3, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(3), paddingVertical: spacing(3) },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.foreground },
  rowHint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  field: {
    width: 84,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingHorizontal: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  fieldInvalid: { borderColor: colors.danger },
  fieldFixed: { borderWidth: 0, backgroundColor: colors.background },
  input: {
    flex: 1,
    textAlign: "right",
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.foreground,
    padding: 0,
  },
  percent: { fontFamily: font.medium, fontSize: 15, color: colors["muted-foreground"] },
  fixed: { fontFamily: font.bold, fontSize: 16, color: colors.label },
  timeline: { gap: spacing(3) },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTodo: { borderWidth: 2, borderColor: colors["border-strong"] },
  stepText: { flex: 1, gap: 2, paddingTop: 2 },
});
