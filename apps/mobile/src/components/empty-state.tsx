import {
  ILLUSTRATIONS,
  ILLUSTRATION_STROKE,
  ILLUSTRATION_VIEWBOX,
  type IllustrationName,
  type IllustrationTone,
} from "@menao/ui-tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

// Couleurs de chaque ton, comme sur le site.
const TONES: Record<IllustrationTone, { fill: string; stroke?: string }> = {
  soft: { fill: colors["primary-soft"] },
  card: { fill: colors.surface, stroke: colors.primary },
  line: { fill: "none", stroke: colors.primary },
  accent: { fill: colors.primary },
  inverse: { fill: "none", stroke: colors["primary-foreground"] },
};

/** Illustration maison d'un état vide (ADR 0095), décorative. */
export function Illustration({ name, width = 120 }: { name: IllustrationName; width?: number }) {
  const box = ILLUSTRATION_VIEWBOX;
  return (
    <Svg
      width={width}
      height={(width * box.height) / box.width}
      viewBox={`0 0 ${box.width} ${box.height}`}
      aria-hidden
    >
      {ILLUSTRATIONS[name].map((shape, i) => {
        const tone = TONES[shape.tone];
        return (
          <Path
            key={i}
            d={shape.d}
            fill={tone.fill}
            stroke={tone.stroke}
            strokeWidth={tone.stroke ? ILLUSTRATION_STROKE : 0}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

/** Cadre en pointillés d'une liste vide : illustration, titre éventuel, texte, action facultative. */
export function EmptyState({
  illustration,
  title,
  children,
  action,
}: {
  illustration: IllustrationName;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View style={styles.frame}>
      <Illustration name={illustration} />
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children ? <Text style={styles.text}>{children}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(8),
    paddingHorizontal: spacing(6),
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: font.medium,
    fontSize: 17,
    color: colors.foreground,
    textAlign: "center",
  },
  text: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
