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
import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { theme } from "@/ui/theme";

const { colors } = theme;

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

// Hexagone des maquettes, pointe en haut.
const HEXAGON = "50,3 93,27 93,73 50,97 7,73 7,27";

/**
 * Badge MENAO (maquettes « Mon grade Menao ») : hexagone bleu plein une fois obtenu, gris clair
 * tant qu'il est à obtenir ; « Main d'or » en doré.
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
  const Icon = ICONS[code] ?? Award;
  const gold = code === "main_d_or";
  const fill = unlocked ? (gold ? colors.warning : colors.primary) : colors.border;
  const stroke = unlocked
    ? gold
      ? colors.warning
      : colors["primary-strong"]
    : colors["border-strong"];
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Polygon points={HEXAGON} fill={fill} stroke={stroke} strokeWidth={4} />
      </Svg>
      {/* Au-dessus de l'hexagone (lui aussi positionné). */}
      <View style={styles.icon}>
        <Icon
          size={Math.round(size * 0.42)}
          color={unlocked ? colors["primary-foreground"] : colors["muted-foreground"]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  icon: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
