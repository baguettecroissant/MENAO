import type { TodoItem } from "@menao/core";
import { router, type Href } from "expo-router";
import {
  CalendarCheck,
  ChevronRight,
  Clock,
  FileClock,
  FilePen,
  Inbox,
  PartyPopper,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion, ZoomIn } from "react-native-reanimated";
import { fr } from "@/i18n/fr";
import { formatDayAndTime } from "@/lib/format";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDashboard;
const { colors, font, radius, spacing } = theme;

type Tone = "danger" | "warning" | "primary";
type Line = {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail: string;
  /** Court texte à droite : temps restant, ou l'action (« Répondre »). */
  accessory: string;
  /** Lecture complète du texte de droite pour VoiceOver (« 5 heures pour répondre »). */
  accessoryLabel?: string;
  /** Petite horloge devant le temps restant. */
  clock?: boolean;
  urgent?: boolean;
  href: Href;
};

const PALETTE: Record<Tone, { bg: string; fg: string }> = {
  danger: { bg: colors["danger-soft"], fg: colors.danger },
  warning: { bg: colors["warning-soft"], fg: colors.warning },
  primary: { bg: colors["primary-soft"], fg: colors["primary-strong"] },
};

/** Ligne affichée pour chaque élément de `artisanTodo` (@menao/core). */
function line(item: TodoItem): Line {
  switch (item.kind) {
    case "demande":
      return {
        key: `demande-${item.id}`,
        icon: Inbox,
        tone: item.urgent ? "danger" : "primary",
        title: t.todo.demande,
        detail: [item.title, item.place].filter(Boolean).join(" · "),
        accessory: t.todo.hoursLeft(item.hoursLeft),
        accessoryLabel: t.todo.hoursLeftLabel(item.hoursLeft),
        clock: true,
        urgent: item.urgent,
        href: `/opportunite/${item.id}`,
      };
    case "rdv": {
      const { time } = formatDayAndTime(item.at);
      return {
        key: `rdv-${item.appointment}-${item.chantierId}`,
        icon: CalendarCheck,
        tone: "primary",
        title: item.appointment === "visite" ? t.todo.visite(time) : t.todo.demarrage(time),
        detail: [item.title, item.place].filter(Boolean).join(" · "),
        accessory: t.todo.today,
        href: `/pro-chantier/${item.chantierId}`,
      };
    }
    case "devis":
      return {
        key: `devis-${item.chantierId}`,
        icon: FilePen,
        tone: "primary",
        title: t.todo.devis,
        detail: [item.title, item.place].filter(Boolean).join(" · "),
        accessory: t.todo.devisAction,
        href: `/pro-chantier/${item.chantierId}/devis`,
      };
    case "documents":
      return {
        key: "documents",
        icon: FileClock,
        tone: "warning",
        title: t.todo.documents,
        detail: item.types.map((type) => fr.proDossier.documents[type]).join(", "),
        accessory: t.todo.renew,
        href:
          item.types.length === 1
            ? { pathname: "/pro-document", params: { type: item.types[0] } }
            : "/pro-documents",
      };
    case "urssaf":
      return {
        key: "urssaf",
        icon: FileClock,
        tone: "warning",
        title: t.todo.urssaf,
        detail: t.todo.urssafHint,
        accessory: t.todo.add,
        href: { pathname: "/pro-document", params: { type: "urssaf" } },
      };
    case "paiements":
      return {
        key: "paiements",
        icon: Wallet,
        tone: "warning",
        title: t.todo.paiements,
        detail: t.todo.paiementsHint,
        accessory: t.todo.activate,
        href: "/pro-paiements",
      };
    case "avis":
      return {
        key: "avis",
        icon: Star,
        tone: "primary",
        title: t.todo.avis(item.count),
        detail: t.todo.avisHint,
        accessory: t.todo.respond,
        href: "/pro-avis",
      };
  }
}

/**
 * « À faire maintenant » (ADR 0130) : une liste par urgence, chaque ligne mène à l'action ; quand
 * il ne reste rien, « Tout est à jour » apparaît avec une petite animation.
 */
export function TodoList({ items }: { items: TodoItem[] }) {
  if (items.length === 0) {
    return (
      <Animated.View
        entering={FadeInDown.duration(320).reduceMotion(ReduceMotion.System)}
        style={styles.done}
      >
        <Animated.View
          entering={ZoomIn.delay(120).springify().damping(12).reduceMotion(ReduceMotion.System)}
          style={styles.doneIcon}
        >
          <PartyPopper size={26} color={colors.success} />
        </Animated.View>
        <View style={styles.doneText}>
          <Text style={styles.doneTitle}>{t.allDone}</Text>
          <Text style={styles.doneHint}>{t.allDoneHint}</Text>
        </View>
      </Animated.View>
    );
  }
  return (
    <View style={styles.section}>
      <Text role="heading" style={styles.heading}>
        {t.todoTitle}
      </Text>
      <View style={styles.group}>
        {items.map((item, index) => {
          const l = line(item);
          const palette = PALETTE[l.tone];
          return (
            <Animated.View
              key={l.key}
              entering={FadeInDown.delay(50 * index)
                .duration(280)
                .reduceMotion(ReduceMotion.System)}
            >
              <Tappable
                role="link"
                aria-label={[l.title, l.detail, l.accessoryLabel ?? l.accessory]
                  .filter(Boolean)
                  .join(", ")}
                onPress={() => router.push(l.href)}
                scaleTo={0.985}
                style={[styles.row, index > 0 && styles.rowBorder]}
              >
                <View style={[styles.icon, { backgroundColor: palette.bg }]}>
                  <l.icon size={18} color={palette.fg} />
                </View>
                <View style={styles.texts}>
                  <Text style={styles.title} numberOfLines={1}>
                    {l.title}
                  </Text>
                  {l.detail ? (
                    <Text style={styles.detail} numberOfLines={1}>
                      {l.detail}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.accessoryWrap}>
                  {l.clock ? (
                    <Clock
                      size={13}
                      color={l.urgent ? colors.danger : colors["muted-foreground"]}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.accessory,
                      l.clock && { color: colors["muted-foreground"] },
                      l.urgent && { color: colors.danger },
                    ]}
                    numberOfLines={1}
                  >
                    {l.accessory}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors["subtle-foreground"]} />
              </Tappable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing(2.5) },
  heading: { fontFamily: font.bold, fontSize: 18, color: colors.foreground },
  group: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 60,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    backgroundColor: colors.surface,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  detail: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  accessoryWrap: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "30%" },
  accessory: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors["primary-strong"],
  },
  done: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3.5),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors["success-soft"],
  },
  doneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { flex: 1, gap: 2 },
  doneTitle: { fontFamily: font.bold, fontSize: 16, color: colors.success },
  doneHint: { fontFamily: font.regular, fontSize: 13, color: colors.foreground },
});
