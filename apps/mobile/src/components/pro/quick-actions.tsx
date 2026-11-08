import { router, type Href } from "expo-router";
import {
  CalendarDays,
  CalendarClock,
  Camera,
  CalendarX,
  ChevronRight,
  FilePen,
  ShoppingCart,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";
import { teamCan, type TeamPermission } from "@menao/core";
import { ExampleLock } from "@/components/examples";
import { useExamplesActive } from "@/lib/examples";
import { useTeamPosition } from "@/lib/team";
import { TAG_TONES } from "./fiche-kit";

const t = fr.proQuickActions;
const { colors, font, spacing } = theme;

/** `team` : action réservée aux places qui ont ce droit (ADR 0241). */
const ACTIONS: {
  icon: LucideIcon;
  label: string;
  detail: string;
  href: Href;
  team?: TeamPermission;
}[] = [
  {
    icon: FilePen,
    label: t.quote,
    detail: t.quoteDetail,
    href: { pathname: "/pro-choisir", params: { action: "devis" } },
    team: "money",
  },
  {
    icon: CalendarX,
    label: t.block,
    detail: t.blockDetail,
    href: "/pro-agenda/bloquer",
    team: "agenda",
  },
  {
    icon: Camera,
    label: t.photo,
    detail: t.photoDetail,
    href: { pathname: "/pro-choisir", params: { action: "photo" } },
  },
  {
    icon: ShoppingCart,
    label: t.expense,
    detail: t.expenseDetail,
    href: "/pro-depense/nouvelle",
    team: "money",
  },
  {
    icon: CalendarClock,
    label: t.availability,
    detail: t.availabilityDetail,
    href: "/pro-disponibilites",
    team: "agenda",
  },
  { icon: CalendarDays, label: t.agenda, detail: t.agendaDetail, href: "/pro-agenda" },
];

/**
 * Menu du bouton (+) de l'artisan, comme la barre d'onglets des maquettes : créer un devis,
 * bloquer un créneau, ajouter une photo au suivi d'un chantier, ajouter une dépense (F-62), gérer
 * ses disponibilités, ouvrir l'agenda (ADR 0130). Montée simple de la feuille, sans effet ajouté
 * (choix de l'utilisateur). Refonte « Nette » (lot 10) : grand titre et rond de fermeture, lignes
 * avec carré d'icône de 44 px, le premier en bleu nuit.
 */
/** Actions qui ont leurs exemples (ADR 0184). */
const EXAMPLE_ACTIONS: readonly string[] = [t.quote, t.agenda];

export function QuickActions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  // Exemples (ADR 0184) : seuls le devis (sur un chantier d'exemple) et l'agenda s'ouvrent.
  const example = useExamplesActive();
  const position = useTeamPosition();
  const actions = ACTIONS.filter(({ team }) => !team || !position || teamCan(position, team));
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} aria-label={t.close} role="button" onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing(4) }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <Text role="heading" style={styles.title}>
            {t.title}
          </Text>
          <Pressable
            role="button"
            aria-label={t.close}
            hitSlop={6}
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <X size={18} color={colors.foreground} strokeWidth={2.2} />
          </Pressable>
        </View>
        <View>
          {actions.map(({ icon: Icon, label, detail, href }, i) => {
            // « Créer un devis » en bleu nuit, les autres en gris clair.
            const first = label === t.quote;
            return (
              <ExampleLock key={label} locked={example && !EXAMPLE_ACTIONS.includes(label)}>
                <Tappable
                  role="link"
                  aria-label={`${label}, ${detail}`}
                  onPress={() => {
                    onClose();
                    router.push(href);
                  }}
                  style={[styles.row, i > 0 && styles.rowBorder]}
                >
                  <View style={[styles.icon, first && styles.iconFirst]}>
                    <Icon size={20} color={first ? colors["primary-foreground"] : colors.label} />
                  </View>
                  <View style={styles.texts}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.detail}>{detail}</Text>
                  </View>
                  <ChevronRight size={16} color={colors["muted-foreground"]} />
                </Tappable>
              </ExampleLock>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: `${colors.foreground}73` },
  sheet: {
    gap: spacing(1.5),
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2.5),
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors["border-strong"],
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingTop: spacing(2),
  },
  title: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 24,
    letterSpacing: -0.6,
    color: colors.foreground,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TAG_TONES.neutral.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: spacing(3),
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: TAG_TONES.neutral.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconFirst: { backgroundColor: colors.foreground },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
  detail: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
