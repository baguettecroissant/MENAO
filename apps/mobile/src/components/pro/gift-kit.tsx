import { REWARD_SIZES, type RewardSize } from "@menao/core";
import { Check, MapPin } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { haptic } from "@/lib/haptics";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/**
 * Briques de la récompense de niveau et du cadeau de bienvenue (refonte « Nette », lot 37),
 * d'après la maquette validée « RecompenseCadeauApp » : tailles en pastilles, adresse de livraison
 * en résumé avec « Modifier », grandes tuiles de choix illustrées et dessins du t-shirt et de la
 * casquette MENAO (illustrations, pas les vrais articles).
 */

/** Bleu nuit des articles MENAO dessinés (maquette du lot 37). */
const NAVY = "#1d2a5b";
const NAVY_LIGHT = "#2c3c7a";

/** T-shirt MENAO dessiné (maquette du lot 37). */
export function TShirtDrawing({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <Path
        d="M30 14 L42 10 Q50 18 58 10 L70 14 L88 32 L76 42 L70 36 L70 90 L30 90 L30 36 L24 42 L12 32 Z"
        fill={NAVY}
      />
      <SvgText
        x={50}
        y={58}
        textAnchor="middle"
        fontFamily={font.display}
        fontSize={11}
        fontWeight="800"
        fill="#ffffff"
      >
        menao
      </SvgText>
    </Svg>
  );
}

/** Casquette MENAO dessinée (maquette du lot 37). */
export function CapDrawing({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <Path d="M18 62 Q18 26 52 26 Q82 26 84 60 Z" fill={NAVY} />
      <Path d="M14 62 L92 62 Q96 70 86 72 L20 72 Q10 70 14 62 Z" fill={NAVY_LIGHT} />
      <Circle cx={52} cy={26} r={3.5} fill={NAVY_LIGHT} />
      <SvgText
        x={51}
        y={52}
        textAnchor="middle"
        fontFamily={font.display}
        fontSize={11}
        fontWeight="800"
        fill="#ffffff"
      >
        menao
      </SvgText>
    </Svg>
  );
}

/** Intitulé d'un groupe du formulaire (« Veste », « Livraison »). */
export function GiftLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

/** Tailles S à XXL en 5 pastilles ; la taille choisie bordée de 2 px bleu nuit. */
export function SizePills({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: RewardSize | null;
  onChange: (size: RewardSize) => void;
  error?: string;
}) {
  return (
    <View style={styles.group}>
      <GiftLabel text={label} />
      <View role="radiogroup" aria-label={label} style={styles.sizes}>
        {REWARD_SIZES.map((size) => {
          const on = value === size;
          return (
            <Pressable
              key={size}
              role="radio"
              aria-checked={on}
              aria-label={size}
              onPress={() => {
                if (!on) haptic.select();
                onChange(size);
              }}
              style={({ pressed }) => [styles.size, on && styles.sizeOn, pressed && styles.pressed]}
            >
              <Text style={[styles.sizeText, on && styles.sizeTextOn]}>{size}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/**
 * Adresse de livraison en résumé : épingle, nom de l'entreprise en gras, adresse, mention en
 * petit et lien « Modifier » à droite, qui déplie les champs.
 */
export function DeliverySummary({
  title,
  name,
  address,
  caption,
  editLabel,
  onEdit,
}: {
  title: string;
  name: string | null;
  address: string;
  caption: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <View style={styles.group}>
      <GiftLabel text={title} />
      <View style={styles.address}>
        <MapPin size={18} color={colors["muted-foreground"]} style={styles.pin} />
        <View style={styles.addressText}>
          {name ? <Text style={styles.addressName}>{name}</Text> : null}
          <Text style={styles.addressLine}>{address}</Text>
          <Text style={styles.addressCaption}>{caption}</Text>
        </View>
        <Pressable role="link" hitSlop={8} onPress={onEdit}>
          <Text style={styles.edit}>{editLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Grande tuile de choix illustrée, coche ronde en haut à droite. */
export function GiftTile({
  label,
  drawing,
  selected,
  onPress,
}: {
  label: string;
  drawing: ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onPress={() => {
        if (!selected) haptic.select();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, selected && styles.tileOn, pressed && styles.pressed]}
    >
      <View style={[styles.check, selected ? styles.checkOn : styles.checkOff]}>
        {selected ? <Check size={13} color={colors["primary-foreground"]} strokeWidth={3} /> : null}
      </View>
      {drawing}
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

/** Rangée des tuiles de choix, à parts égales. */
export function GiftTiles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View role="radiogroup" aria-label={label} style={styles.tiles}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing(2) },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  error: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.danger },
  pressed: { opacity: 0.75 },
  sizes: { flexDirection: "row", gap: spacing(2) },
  size: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sizeOn: { borderWidth: 2, borderColor: colors.foreground },
  sizeText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.label },
  sizeTextOn: { color: colors.foreground },
  address: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    paddingVertical: spacing(3),
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pin: { marginTop: 2, flexShrink: 0 },
  addressText: { flex: 1, minWidth: 0, gap: 2 },
  addressName: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: colors.foreground },
  addressLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  addressCaption: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  edit: { fontFamily: font.semibold, fontSize: 13.5, color: colors["primary-strong"] },
  tiles: { flexDirection: "row", gap: spacing(3) },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: spacing(1.5),
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // Bordure de 2 px : la marge intérieure perd 1 px, la tuile garde sa taille.
  tileOn: { borderWidth: 2, borderColor: colors.foreground, padding: 13 },
  tileLabel: {
    textAlign: "center",
    fontFamily: font.bold,
    fontSize: 14.5,
    color: colors.foreground,
  },
  check: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.foreground },
  checkOff: { borderWidth: 1.5, borderColor: colors["border-strong"] },
});
