import { useRef, useState } from "react";
import { StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fr } from "@/i18n/fr";
import { LinkText } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proCharter;
const { colors, font, radius, spacing } = theme;
// Même cadre que le site (600 × 150) : le tracé enregistré ne dépend pas de l'écran.
const FRAME = { width: 600, height: 150 };

/**
 * Signature tracée au doigt (charte qualité, ADR 0104 et 0109), comme sur le site : chemin SVG
 * (M et L, coordonnées entières dans un cadre de 600 × 150), vide tant que rien n'est tracé.
 */
export function SignaturePad({ onChange }: { onChange: (path: string) => void }) {
  const [path, setPath] = useState("");
  const size = useRef({ width: 1, height: 1 });
  const current = useRef("");

  const point = (event: GestureResponderEvent) => {
    const x = Math.round((event.nativeEvent.locationX / size.current.width) * FRAME.width);
    const y = Math.round((event.nativeEvent.locationY / size.current.height) * FRAME.height);
    return `${Math.min(FRAME.width, Math.max(0, x))} ${Math.min(FRAME.height, Math.max(0, y))}`;
  };
  // Le doigt reste la cible du toucher (enfants sans événements) : locationX lui est relatif.
  const start = (event: GestureResponderEvent) => {
    current.current = `${current.current ? `${current.current} ` : ""}M ${point(event)}`;
    setPath(current.current);
  };
  const move = (event: GestureResponderEvent) => {
    current.current = `${current.current} L ${point(event)}`;
    setPath(current.current);
  };

  return (
    <View style={styles.wrap}>
      <View
        accessible
        aria-label={t.padLabel}
        style={styles.pad}
        onLayout={(event) => {
          size.current = {
            width: event.nativeEvent.layout.width || 1,
            height: event.nativeEvent.layout.height || 1,
          };
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={start}
        onResponderMove={move}
        onResponderRelease={() => onChange(current.current)}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
          pointerEvents="none"
        >
          {path ? (
            <Path
              d={path}
              fill="none"
              stroke="#1f2b6e"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {!path ? (
          <Text pointerEvents="none" style={styles.hint}>
            {t.padHint}
          </Text>
        ) : null}
      </View>
      <LinkText
        label={t.clear}
        onPress={() => {
          current.current = "";
          setPath("");
          onChange("");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(2) },
  pad: {
    width: "100%",
    aspectRatio: FRAME.width / FRAME.height,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    position: "absolute",
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
});
