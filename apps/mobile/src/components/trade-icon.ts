import {
  BrickWall,
  Building,
  Flame,
  Grid3x3,
  Hammer,
  House,
  KeyRound,
  Layers,
  type LucideIcon,
  PaintRoller,
  Shovel,
  Snowflake,
  Trees,
  Warehouse,
  Wrench,
  Zap,
} from "lucide-react-native";

/** Icône de chaque métier du référentiel ; un métier ajouté depuis le back-office prend le marteau. */
const TRADE_ICONS: Record<string, LucideIcon> = {
  electricien: Zap,
  plombier: Wrench,
  chauffagiste: Flame,
  climaticien: Snowflake,
  macon: BrickWall,
  peintre: PaintRoller,
  plaquiste: Layers,
  carreleur: Grid3x3,
  menuisier: Hammer,
  charpentier: Warehouse,
  couvreur: House,
  facadier: Building,
  serrurier: KeyRound,
  terrassier: Shovel,
  paysagiste: Trees,
};

export function tradeIcon(code: string): LucideIcon {
  return TRADE_ICONS[code] ?? Hammer;
}
