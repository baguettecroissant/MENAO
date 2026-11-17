import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/** Question fréquente dépliable (aide de l'artisan, ADR 0129 ; aide du particulier, ADR 0361). */
export function Question({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? "180deg" : "0deg", { duration: 200 }) }],
  }));
  return (
    <View style={styles.item}>
      <Tappable
        role="button"
        aria-expanded={open}
        aria-label={question}
        onPress={() => {
          haptic.select();
          setOpen((value) => !value);
        }}
        scaleTo={0.985}
        style={styles.question}
      >
        <Text style={styles.questionText}>{question}</Text>
        <Animated.View style={chevron}>
          <ChevronDown size={20} color={colors["muted-foreground"]} />
        </Animated.View>
      </Tappable>
      {open ? (
        <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}>
          <Text style={styles.answer}>{answer}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  question: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: theme.touchTarget,
    padding: spacing(4),
    backgroundColor: colors.surface,
  },
  questionText: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  answer: {
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(4),
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors["muted-foreground"],
  },
});
