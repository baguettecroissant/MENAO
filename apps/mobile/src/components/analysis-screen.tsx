import {
  BrickWall,
  Check,
  Flame,
  Hammer,
  type LucideIcon,
  PaintRoller,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { LogoMark } from "@/components/logo";
import { fr } from "@/i18n/fr";
import { useReduceMotion } from "@/lib/reduce-motion";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const a = fr.search.analysis;

/** Rythme des étapes et des « Le saviez-vous ? » (millisecondes), comme sur le site. */
const STEP_MS = 1500;
const FACT_MS = 4500;
/** Taille de l'illustration et rayon de l'orbite des métiers. */
const SIZE = 256;
const ORBIT = SIZE * 0.39;
const ICON = 44;
/** Métiers en orbite : plomberie, électricité, peinture, menuiserie, chauffage, maçonnerie. */
const TRADES: LucideIcon[] = [Wrench, Zap, PaintRoller, Hammer, Flame, BrickWall];
// Le pilote natif des animations n'existe pas sur la version web.
const nativeDriver = Platform.OS !== "web";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Valeur qui va de 0 à 1 en boucle (après un délai), tant que les animations sont permises. */
function useLoop(duration: number, animate: boolean, delay = 0, easing = Easing.linear) {
  // Valeur animée créée une fois (état initialisé paresseusement), stable d'un rendu à l'autre.
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: nativeDriver }),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [animate, delay, duration, easing, value]);
  return value;
}

/** Valeur qui passe de 0 à 1 une fois, après un délai (apparition). */
function useEnter(duration: number, animate: boolean, delay = 0, nativeOnly = true) {
  const [value] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    const anim = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeOnly && nativeDriver,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, delay, duration, nativeOnly, value]);
  return value;
}

/** Onde qui part du centre et s'efface. */
function Ripple({ delay, animate }: { delay: number; animate: boolean }) {
  const t = useLoop(2400, animate, delay, Easing.out(Easing.quad));
  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.7, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2] }) }],
        },
      ]}
    />
  );
}

/** Métier en orbite : reste droit pendant que l'orbite tourne, flotte, et apparaît en sautant. */
function OrbitIcon({
  icon: Icon,
  index,
  turn,
  animate,
}: {
  icon: LucideIcon;
  index: number;
  turn: Animated.Value;
  animate: boolean;
}) {
  const angle = (index / TRADES.length) * 2 * Math.PI - Math.PI / 2;
  const float = useLoop(3600, animate, index * 600, Easing.inOut(Easing.sin));
  const pop = useEnter(500, animate, 250 + index * 120);
  return (
    <Animated.View
      style={[
        styles.orbitIcon,
        {
          left: SIZE / 2 + ORBIT * Math.cos(angle) - ICON / 2,
          top: SIZE / 2 + ORBIT * Math.sin(angle) - ICON / 2,
          opacity: pop,
          transform: [
            { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] }) },
            {
              translateY: float.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -5, 0],
              }),
            },
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          ],
        },
      ]}
    >
      <Icon size={20} color={colors["primary-strong"]} />
    </Animated.View>
  );
}

/** Logo MENAO qui se dessine : le toit, puis le sourire (mêmes tracés que le logo). */
function DrawnMark({ animate }: { animate: boolean }) {
  // Tracé animé sur le téléphone seulement : sur la version web, react-native-svg transmet au
  // navigateur un attribut interne des composants animés.
  const draw = animate && nativeDriver;
  // Longueurs des tracés, arrondies au-dessus : le tiret couvre tout le trait.
  const roof = useEnter(800, draw, 200, false);
  const smile = useEnter(900, draw, 650, false);
  if (!draw) return <LogoMark size={56} />;
  return (
    <Svg width={56} height={49} viewBox="0 0 32 28" fill="none">
      <Defs>
        <LinearGradient id="analysis" x1="16" y1="2" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#86a0fb" />
          <Stop offset="1" stopColor={colors.primary} />
        </LinearGradient>
      </Defs>
      <AnimatedPath
        d="M9.5 10.5 16 5.5l6.5 5"
        stroke="url(#analysis)"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="18 18"
        strokeDashoffset={roof.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })}
      />
      <AnimatedPath
        d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
        stroke="url(#analysis)"
        strokeWidth={4.6}
        strokeLinecap="round"
        strokeDasharray="30 30"
        strokeDashoffset={smile.interpolate({ inputRange: [0, 1], outputRange: [30, 0] })}
      />
    </Svg>
  );
}

/** Illustration : halo, ondes, métiers en orbite et logo au centre. */
function AnalysisVisual({ animate }: { animate: boolean }) {
  const turn = useLoop(18000, animate);
  const pulse = useLoop(2200, animate, 0, Easing.inOut(Easing.sin));
  return (
    <View style={styles.visual} aria-hidden>
      <Animated.View
        style={[
          styles.halo,
          { opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] }) },
        ]}
      />
      {[0, 800, 1600].map((delay) => (
        <Ripple key={delay} delay={delay} animate={animate} />
      ))}
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={ORBIT}
          stroke={colors.primary}
          strokeOpacity={0.25}
          strokeDasharray="4 6"
          fill="none"
        />
      </Svg>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
            ],
          },
        ]}
      >
        {TRADES.map((icon, index) => (
          <OrbitIcon key={index} icon={icon} index={index} turn={turn} animate={animate} />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.center,
          {
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] }) },
            ],
          },
        ]}
      >
        <DrawnMark animate={animate} />
      </Animated.View>
    </View>
  );
}

/**
 * Écran « Analyse de votre projet en cours » (F-05), comme sur le site : le logo se dessine au
 * milieu des métiers, les étapes se cochent une à une et des faits sur MENAO défilent. Sans
 * animation quand le téléphone demande moins de mouvement.
 */
export function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const animate = !useReduceMotion();
  const [step, setStep] = useState(0);
  const [fact, setFact] = useState(0);

  useEffect(() => {
    const steps = setInterval(() => setStep((i) => Math.min(i + 1, a.steps.length - 1)), STEP_MS);
    const facts = setInterval(() => setFact((i) => (i + 1) % a.facts.length), FACT_MS);
    return () => {
      clearInterval(steps);
      clearInterval(facts);
    };
  }, []);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing(6), paddingBottom: insets.bottom + spacing(6) },
      ]}
    >
      <AnalysisVisual animate={animate} />
      <Text aria-live="polite" style={styles.status}>
        {fr.search.analyzing}
      </Text>
      <View style={styles.steps}>
        {a.steps.map((label, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.stepDot,
                  state === "done" && styles.stepDone,
                  state === "active" && styles.stepActive,
                ]}
              >
                {state === "done" && <Check size={14} color={colors["primary-foreground"]} />}
                {state === "active" && <View style={styles.stepPulse} />}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  state === "active" && styles.stepLabelActive,
                  state === "todo" && styles.stepLabelTodo,
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.facts}>
        <View style={styles.factsTitle}>
          <Sparkles size={14} color={colors["primary-strong"]} />
          <Text style={styles.factsTitleText}>{a.factsTitle}</Text>
        </View>
        <Fact key={fact} text={a.facts[fact] ?? ""} animate={animate} />
      </View>
    </View>
  );
}

/** Fait qui apparaît en glissant vers le haut. */
function Fact({ text, animate }: { text: string; animate: boolean }) {
  const enter = useEnter(400, animate);
  return (
    <Animated.Text
      style={[
        styles.factText,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(6),
    gap: spacing(6),
  },
  visual: { width: SIZE, height: SIZE },
  halo: {
    position: "absolute",
    top: SIZE * 0.22,
    left: SIZE * 0.22,
    width: SIZE * 0.56,
    height: SIZE * 0.56,
    borderRadius: SIZE,
    backgroundColor: colors["primary-soft"],
  },
  ripple: {
    position: "absolute",
    top: SIZE / 2 - 56,
    left: SIZE / 2 - 56,
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: colors["primary-soft"],
    backgroundColor: colors["primary-softer"],
  },
  orbitIcon: {
    position: "absolute",
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors["primary-softer"],
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(17, 23, 40, 0.10)",
  },
  center: {
    position: "absolute",
    top: SIZE / 2 - 56,
    left: SIZE / 2 - 56,
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: colors["primary-soft"],
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(17, 23, 40, 0.12)",
  },
  status: {
    fontFamily: font.medium,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    color: colors.foreground,
  },
  steps: { alignSelf: "stretch", gap: spacing(2.5) },
  step: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  stepDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors["primary-softer"],
  },
  stepPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  stepLabel: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  stepLabelActive: { fontFamily: font.medium, color: colors.foreground },
  stepLabelTodo: { color: colors["subtle-foreground"] },
  facts: {
    alignSelf: "stretch",
    gap: spacing(1),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(4),
  },
  factsTitle: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  factsTitleText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  factText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.foreground },
});
