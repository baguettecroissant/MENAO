import { useEffect, type ReactNode } from "react";
import {
  Pressable,
  type DimensionValue,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
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

/** Bloc gris qui pulse doucement à la place d'un contenu en cours de chargement. */
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
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.45, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
    );
  }, [reduced, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: round ? radius.pill : radius.chip,
          backgroundColor: colors.border,
        },
        style,
        animated,
      ]}
    />
  );
}
