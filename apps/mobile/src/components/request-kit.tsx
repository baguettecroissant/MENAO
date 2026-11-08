import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/**
 * Briques du parcours de demande du particulier (refonte « Nette », lot 12), d'après les maquettes
 * validées (« SaisieApp », « ResultatsApp », « EnvoyeeApp », versions ordinateur transposées) :
 * pastilles de choix (bleu nuit avec coche une fois choisies), rond de sélection d'un artisan,
 * photo ronde ou initiales et liste d'étapes numérotées.
 */

/**
 * Pastille de choix des critères : contour gris, bleu nuit avec coche une fois choisie. `single` :
 * choix unique (lu comme bouton radio), sinon case à cocher.
 */
export function SelectPill({
  label,
  selected,
  onPress,
  single = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  single?: boolean;
}) {
  return (
    <Pressable
      role={single ? "radio" : "checkbox"}
      aria-checked={selected}
      aria-label={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [styles.pill, selected && styles.pillOn, pressed && styles.pressed]}
    >
      {selected ? <Check size={15} color={colors["primary-foreground"]} strokeWidth={2.6} /> : null}
      <Text style={[styles.pillText, selected && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Rangée de pastilles qui passent à la ligne. */
export function PillRow({ children }: { children: ReactNode }) {
  return <View style={styles.pills}>{children}</View>;
}

/** Rond de sélection d'un artisan : bleu nuit avec coche une fois choisi, contour gris sinon. */
export function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.dot, selected && styles.dotOn]}>
      {selected ? <Check size={15} color={colors["primary-foreground"]} strokeWidth={3} /> : null}
    </View>
  );
}

/** Initiales d'un nom (« Plomberie des Oliviers » → « PO »). */
export function initials(name: string): string {
  const words = name
    .split(/[\s'’-]+/)
    .filter((word) => word.length > 1 || /\p{Lu}/u.test(word))
    .filter((word) => /\p{L}/u.test(word.charAt(0)));
  const capitals = words.filter((word) => /\p{Lu}/u.test(word.charAt(0)));
  const picked = (capitals.length >= 2 ? capitals : words).slice(0, 2);
  return picked.map((word) => word.charAt(0).toUpperCase()).join("") || name.charAt(0);
}

/** Photo ronde d'un artisan, ou ses initiales en blanc sur fond bleu clair. */
export function ArtisanAvatar({
  name,
  uri,
  size = 52,
}: {
  name: string;
  uri: string | null;
  size?: number;
}) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.avatar, shape]} alt="" />;
  return (
    <View aria-hidden style={[styles.avatar, styles.avatarEmpty, shape]}>
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.32) }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

export type StepState = "done" | "now" | "next";

/**
 * Étapes numérotées dans une carte (« Envoyée / Réponses / Rendez-vous et devis ») : rond vert
 * coché une fois faite, bleu nuit pour l'étape en cours, contour gris ensuite.
 */
export function StepList({
  label,
  steps,
}: {
  /** Nom de la liste, lu par les lecteurs d'écran. */
  label: string;
  steps: readonly { title: string; text?: string | null; state: StepState }[];
}) {
  return (
    <View role="list" aria-label={label} style={styles.steps}>
      {steps.map((step, i) => (
        <View key={step.title} role="listitem" style={[styles.step, i > 0 && styles.stepBorder]}>
          <View
            style={[
              styles.stepDot,
              step.state === "done" && styles.stepDone,
              step.state === "now" && styles.stepNow,
            ]}
          >
            {step.state === "done" ? (
              <Check size={15} color={colors["primary-foreground"]} strokeWidth={3} />
            ) : (
              <Text style={[styles.stepNumber, step.state === "now" && styles.stepNumberNow]}>
                {i + 1}
              </Text>
            )}
          </View>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            {step.text ? <Text style={styles.stepBody}>{step.text}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: 40,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: spacing(1.5),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  pillOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  pillText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  pillTextOn: { color: colors["primary-foreground"] },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dotOn: { borderWidth: 0, backgroundColor: colors.foreground },
  avatar: { flexShrink: 0, backgroundColor: colors["primary-soft"] },
  avatarEmpty: {
    alignItems: "center",
    justifyContent: "center",
    // Artisan sans photo : initiales en blanc sur bleu clair (maquette « ResultatsApp »).
    backgroundColor: "#9fb1ef",
  },
  avatarText: { fontFamily: font.bold, color: colors["primary-foreground"] },
  steps: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(1),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3), paddingVertical: 12 },
  stepBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepDone: { borderWidth: 0, backgroundColor: colors.success },
  stepNow: { borderWidth: 0, backgroundColor: colors.foreground },
  stepNumber: { fontFamily: font.bold, fontSize: 13, color: colors["muted-foreground"] },
  stepNumberNow: { color: colors["primary-foreground"] },
  stepText: { flex: 1, gap: 2, paddingTop: 4 },
  stepTitle: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: colors.foreground },
  stepBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
});
