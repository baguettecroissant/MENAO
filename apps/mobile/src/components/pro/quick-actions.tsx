import { router, type Href } from "expo-router";
import {
  CalendarDays,
  CalendarClock,
  Camera,
  CalendarX,
  ChevronRight,
  FilePen,
  type LucideIcon,
} from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuickActions;
const { colors, font, radius, spacing } = theme;

const ACTIONS: { icon: LucideIcon; label: string; detail: string; href: Href }[] = [
  {
    icon: FilePen,
    label: t.quote,
    detail: t.quoteDetail,
    href: { pathname: "/pro-choisir", params: { action: "devis" } },
  },
  { icon: CalendarX, label: t.block, detail: t.blockDetail, href: "/pro-agenda/bloquer" },
  {
    icon: Camera,
    label: t.photo,
    detail: t.photoDetail,
    href: { pathname: "/pro-choisir", params: { action: "photo" } },
  },
  {
    icon: CalendarClock,
    label: t.availability,
    detail: t.availabilityDetail,
    href: "/pro-disponibilites",
  },
  { icon: CalendarDays, label: t.agenda, detail: t.agendaDetail, href: "/pro-agenda" },
];

/**
 * Menu du bouton (+) de l'artisan, comme la barre d'onglets des maquettes : créer un devis,
 * bloquer un créneau, ajouter une photo au suivi d'un chantier, gérer ses disponibilités, ouvrir
 * l'agenda (ADR 0130). Montée simple de la feuille, sans effet ajouté (choix de l'utilisateur).
 */
export function QuickActions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} aria-label={t.close} role="button" onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing(4) }]}>
        <View style={styles.handle} />
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
        {ACTIONS.map(({ icon: Icon, label, detail, href }) => (
          <Tappable
            key={label}
            role="link"
            aria-label={label}
            onPress={() => {
              onClose();
              router.push(href);
            }}
            style={styles.row}
          >
            <View style={styles.icon}>
              <Icon size={20} color={colors.primary} />
            </View>
            <View style={styles.texts}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.detail}>{detail}</Text>
            </View>
            <ChevronRight size={18} color={colors["muted-foreground"]} />
          </Tappable>
        ))}
        <Tappable role="button" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>{t.close}</Text>
        </Tappable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: `${colors.foreground}66` },
  sheet: {
    gap: spacing(2),
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors["border-strong"],
    marginBottom: spacing(2),
  },
  title: {
    fontFamily: font.medium,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: spacing(1),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3.5),
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  detail: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  close: { alignItems: "center", paddingVertical: spacing(3) },
  closeText: { fontFamily: font.medium, fontSize: 15, color: colors["primary-strong"] },
});
