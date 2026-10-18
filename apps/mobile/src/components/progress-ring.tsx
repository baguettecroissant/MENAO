import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { theme } from "@/ui/theme";

const { colors, font } = theme;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Anneau de progression (« Fiche complète à 80 % »), qui se remplit à l'ouverture de l'écran
 * (animations riches, refonte de l'espace artisan) ; vert à 100 %. Rempli d'emblée si
 * « Réduire les animations » est activé.
 */
export function ProgressRing({
  percent,
  size = 56,
  stroke = 6,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const progress = useSharedValue(reduced ? clamped : 0);

  useEffect(() => {
    progress.value = reduced
      ? clamped
      : withDelay(150, withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [clamped, reduced, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));
  const color = clamped >= 100 ? colors.success : colors.primary;

  return (
    <View style={{ width: size, height: size }} aria-hidden>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { color }]}>{clamped}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  value: { fontFamily: font.bold, fontSize: 13 },
});
