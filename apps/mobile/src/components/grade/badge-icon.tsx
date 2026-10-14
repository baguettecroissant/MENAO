import {
  BADGE_FACE,
  BADGE_RING,
  BADGE_SHINE,
  BADGE_STYLES,
  BADGE_VIEWBOX,
  badgeStyle,
} from "@menao/ui-tokens";
import {
  AlarmClock,
  Award,
  Camera,
  Hand,
  Heart,
  HeartHandshake,
  type LucideIcon,
  PenLine,
  Sparkles,
  SprayCan,
} from "lucide-react-native";
import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/** Pictogramme de chaque badge du référentiel ; un badge ajouté en base prend la médaille. */
const ICONS: Record<string, LucideIcon> = {
  artisan_exceptionnel: Heart,
  toujours_a_l_heure: AlarmClock,
  maitre_des_finitions: Sparkles,
  expert_de_la_photo: Camera,
  pro_du_nettoyage: SprayCan,
  artisan_applique: PenLine,
  artisan_attentionne: HeartHandshake,
  main_d_argent: Hand,
  main_d_or: Hand,
};

/**
 * Badge MENAO (maquettes « Mon grade Menao », ADR 0096) : hexagone bleu à liseré argenté une fois
 * obtenu, liseré doré pour « Main d'or », gris tant qu'il est à obtenir. Même dessin que le site
 * (`@menao/ui-tokens`).
 */
export function BadgeIcon({
  code,
  unlocked,
  size = 56,
}: {
  code: string;
  unlocked: boolean;
  size?: number;
}) {
  // Identifiants des dégradés propres à chaque badge (plusieurs badges par écran).
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const Icon = ICONS[code] ?? Award;
  const style = BADGE_STYLES[badgeStyle(code, unlocked)];
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${BADGE_VIEWBOX} ${BADGE_VIEWBOX}`}
        style={styles.layer}
      >
        <Defs>
          <LinearGradient id={`${id}ring`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={style.ring[0]} />
            <Stop offset="1" stopColor={style.ring[1]} />
          </LinearGradient>
          <LinearGradient id={`${id}face`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={style.face[0]} />
            <Stop offset="1" stopColor={style.face[1]} />
          </LinearGradient>
          <LinearGradient id={`${id}shine`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={style.shine} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path
          d={BADGE_RING}
          fill={`url(#${id}ring)`}
          stroke={`url(#${id}ring)`}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <Path
          d={BADGE_FACE}
          fill={`url(#${id}face)`}
          stroke={`url(#${id}face)`}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path d={BADGE_SHINE} fill={`url(#${id}shine)`} />
      </Svg>
      {/* Au-dessus de l'hexagone (lui aussi positionné). */}
      <View style={styles.layer}>
        <Icon
          size={Math.round(size * 0.4)}
          color={style.icon}
          fill={style.iconFill}
          strokeWidth={2.2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
