import { useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { theme } from "./theme";

const { colors, radius } = theme;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 20, stiffness: 420, mass: 0.6 };

/**
 * Zone touchable qui s'enfonce légèrement sous le doigt (ressort), comme les applications natives
 * (lot 1 de la refonte de l'espace artisan). Sans animation si « Réduire les animations » est
 * activé : l'opacité baisse simplement.
 */
export function Tappable({
  style,
  children,
  onPressIn,
  onPressOut,
  scaleTo = 0.97,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
}) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() =>
    reduced
      ? { opacity: 1 - pressed.value * 0.25 }
      : { transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }] },
  );
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        pressed.value = withSpring(1, PRESS_SPRING);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, PRESS_SPRING);
        onPressOut?.(event);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Durée d'un passage du reflet sur un bloc gris. */
const SHIMMER_MS = 1200;

/**
 * Bloc gris d'un écran squelette (ADR 0192) : la forme du contenu qui arrive, avec un reflet qui
 * le traverse, comme les applications natives. Sans reflet si « Réduire les animations » est
 * activé.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  round = false,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  round?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState(0);
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduced || size === 0) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
    return () => cancelAnimation(progress);
  }, [reduced, size, progress]);
  const band = Math.max(40, size * 0.45);
  const shine = useAnimatedStyle(() => ({
    transform: [{ translateX: -band + progress.value * (size + band * 2) }, { skewX: "-20deg" }],
  }));
  return (
    <View
      onLayout={(event) => setSize(event.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          overflow: "hidden",
          borderRadius: round ? radius.pill : radius.chip,
          backgroundColor: colors.border,
        },
        style,
      ]}
    >
      {reduced || size === 0 ? null : (
        <Animated.View style={[styles.shine, { width: band }, shine]} />
      )}
    </View>
  );
}

/**
 * Contenu qui remplace un squelette : fondu de 250 ms quand les données arrivent ; rien si elles
 * étaient déjà là (écran rouvert) ou si « Réduire les animations » est activé.
 */
export function useReveal(ready: boolean) {
  const reduced = useReducedMotion();
  const [startedEmpty] = useState(!ready);
  return startedEmpty && !reduced ? FadeIn.duration(250) : undefined;
}

const styles = StyleSheet.create({
  shine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
});
