import { useEffect, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { haptic } from "@/lib/haptics";
import { theme } from "./theme";

const { colors, font, radius, spacing } = theme;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Longueurs du cercle (r = 24) et de la coche, en unités du dessin. */
const RING = 151;
const TICK = 32;
const SHOWN_MS = 2000;

type Moment = { id: number; title: string; text: string };

let show: ((moment: Moment) => void) | null = null;
let nextId = 1;

/**
 * Moment de réussite (ADR 0197) : devis envoyé, rendez-vous fixé, devis signé, acompte payé. Une
 * coche se trace dans un cercle vert, avec une vibration de réussite ; le message se ferme seul
 * après 2 secondes, ou d'un toucher. Rare, donc marquant : seulement pour ces étapes-là.
 */
export function celebrate(moment: { title: string; text: string }): void {
  haptic.success();
  AccessibilityInfo.announceForAccessibility(`${moment.title}. ${moment.text}`);
  show?.({ id: nextId++, ...moment });
}

/** Emplacement des moments de réussite, une seule fois à la racine de l'application. */
export function SuccessHost() {
  const [moment, setMoment] = useState<Moment | null>(null);
  useEffect(() => {
    show = setMoment;
    return () => {
      show = null;
    };
  }, []);
  useEffect(() => {
    if (!moment) return;
    const timer = setTimeout(() => setMoment(null), SHOWN_MS);
    return () => clearTimeout(timer);
  }, [moment]);
  return (
    <Modal
      visible={moment !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setMoment(null)}
    >
      <Pressable role="button" onPress={() => setMoment(null)} style={styles.backdrop}>
        {moment ? <Card key={moment.id} title={moment.title} text={moment.text} /> : null}
      </Pressable>
    </Modal>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  const reduced = useReducedMotion();
  const ring = useSharedValue(reduced ? 1 : 0);
  const tick = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    ring.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    tick.set(withDelay(380, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })));
  }, [reduced, ring, tick]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - ring.get()) }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: TICK * (1 - tick.get()) }));
  return (
    <View role="alert" style={styles.card}>
      <Svg width={64} height={64} viewBox="0 0 56 56" fill="none">
        <AnimatedCircle
          cx={28}
          cy={28}
          r={24}
          stroke={colors.success}
          strokeWidth={4}
          strokeDasharray={[RING, RING]}
          transform="rotate(-90 28 28)"
          animatedProps={ringProps}
        />
        <AnimatedPath
          d="M18 29l7 7 13-14"
          stroke={colors.success}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[TICK, TICK]}
          animatedProps={tickProps}
        />
      </Svg>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(8),
    backgroundColor: `${colors.foreground}33`,
  },
  card: {
    alignItems: "center",
    gap: spacing(3),
    width: "100%",
    maxWidth: 320,
    paddingVertical: spacing(7),
    paddingHorizontal: spacing(6),
    borderRadius: radius.hero,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: font.bold, fontSize: 21, textAlign: "center", color: colors.foreground },
  text: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
