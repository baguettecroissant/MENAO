import { useState } from "react";
import { StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const STEP = 5;
const THUMB = 28;

/**
 * Curseur de note de 0 à 100 %, par pas de 5 (avis du client, F-28), comme sur le site : rien
 * n'est choisi tant que le client n'y a pas touché. On le fait glisser ou on touche la piste ;
 * avec un lecteur d'écran, on l'ajuste en balayant vers le haut ou le bas.
 */
export function RatingSlider({
  label,
  value,
  onChange,
  valueText,
  caption,
  error,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  /** « 75 % », ou « -- % » tant que rien n'est choisi. */
  valueText: string;
  /** Libellé de la tranche (« Très soigné »), ou l'invitation à noter. */
  caption: string;
  error?: string;
}) {
  const [width, setWidth] = useState(0);

  // La piste reste la cible du toucher (enfants sans événements) : locationX lui est relatif.
  function pick(event: GestureResponderEvent) {
    // Le centre du bouton va d'un demi-bouton à l'autre bout de la piste.
    const usable = width - THUMB;
    if (usable <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.nativeEvent.locationX - THUMB / 2) / usable));
    const next = Math.round((ratio * 100) / STEP) * STEP;
    if (next !== value) onChange(next);
  }

  const position = value ?? 50;
  return (
    <View style={styles.field}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{valueText}</Text>
      </View>
      <View
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? caption : `${valueText}, ${caption}`}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const base = value ?? 50;
          if (event.nativeEvent.actionName === "increment") onChange(Math.min(100, base + STEP));
          if (event.nativeEvent.actionName === "decrement") onChange(Math.max(0, base - STEP));
        }}
        style={styles.touchArea}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={pick}
        onResponderMove={pick}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${value ?? 0}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            value === null && styles.thumbUnset,
            { left: Math.max(0, (width - THUMB) * (position / 100)) },
          ]}
        />
      </View>
      <Text style={[styles.caption, value === null && styles.captionUnset]}>{caption}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing(2) },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  label: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  value: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  touchArea: { height: theme.touchTarget, justifyContent: "center" },
  track: {
    height: 6,
    marginHorizontal: THUMB / 2,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  thumbUnset: { borderColor: colors["border-strong"] },
  caption: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  captionUnset: { fontFamily: font.regular, color: colors["muted-foreground"] },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
});
