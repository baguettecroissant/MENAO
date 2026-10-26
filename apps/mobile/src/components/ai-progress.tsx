import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LogoMark } from "@/components/logo";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
/** Une étape de plus toutes les 1,4 s ; la dernière reste affichée jusqu'au résultat. */
const STEP_MS = 1400;

/**
 * Attente racontée pendant que l'IA travaille (ADR 0194) : le logo MENAO respire et les étapes
 * s'affichent l'une après l'autre (« Je lis la pièce… », « Je relève les montants… »), au lieu
 * d'une roue qui tourne. Étapes génériques, rythmées dans l'application : elles disent ce que
 * fait l'IA, sans promettre de résultat. Annoncées aux lecteurs d'écran ; sans mouvement si
 * « Réduire les animations » est activé.
 */
export function AiProgress({ steps }: { steps: readonly string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index >= steps.length - 1) return;
    const timer = setTimeout(() => setIndex((value) => value + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [index, steps.length]);

  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    scale.set(
      withRepeat(
        withSequence(withTiming(1.12, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
      ),
    );
    return () => cancelAnimation(scale);
  }, [reduced, scale]);
  const logo = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <View role="status" aria-live="polite" style={styles.box}>
      <Animated.View style={[styles.logo, logo]}>
        <LogoMark size={26} />
      </Animated.View>
      <View style={styles.steps}>
        {steps.slice(0, index + 1).map((step, i) => (
          <Animated.View
            key={step}
            entering={reduced ? undefined : FadeInDown.duration(250)}
            style={styles.step}
          >
            {i < index ? <Check size={13} color={colors.success} /> : null}
            <Text style={[styles.text, i < index ? styles.done : styles.current]}>{step}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors["primary-softer"],
  },
  logo: { paddingTop: 2 },
  steps: { flex: 1, gap: spacing(1.5) },
  step: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  text: { flexShrink: 1, fontFamily: font.regular, fontSize: 14 },
  current: { fontFamily: font.medium, color: colors["primary-strong"] },
  done: { color: colors["muted-foreground"] },
});
