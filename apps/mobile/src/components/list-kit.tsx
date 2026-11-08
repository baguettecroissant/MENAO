import { ChevronRight, Ellipsis, Plus, Search, type LucideIcon } from "lucide-react-native";
import { Children, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { BottomSheet } from "@/components/bottom-sheet";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proLists;
const { colors, font, radius, spacing } = theme;

/**
 * Briques des listes de l'espace artisan (ADR 0189), comme sur le site et façon iPhone : un
 * en-tête court (titre, un seul bouton principal, le reste dans « … »), des filtres avec leur
 * montant, une recherche, puis des lignes fines dans un seul cadre.
 */

export type ListTone = "success" | "danger" | "warning" | "neutral" | "primary";

const TONES: Record<ListTone, string> = {
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  neutral: colors["muted-foreground"],
  primary: colors["primary-strong"],
};

export type MoreItem =
  | { label: string; onPress: () => void }
  /** Élément annoncé mais pas encore actif (« Bientôt ») : un toucher affiche `note`. */
  | { label: string; soon: string; note: string };

/**
 * En-tête d'une liste : titre à gauche ; à droite « … » (feuille des actions secondaires) puis le
 * bouton principal. `locked` : exemples (ADR 0184), actions visibles mais inactives.
 */
export function ListHeader({
  title,
  more,
  primary,
  locked = false,
}: {
  title: string;
  more?: readonly MoreItem[];
  primary?: { label: string; onPress: () => void };
  locked?: boolean;
}) {
  return (
    <View style={styles.header}>
      <Text role="heading" style={styles.title}>
        {title}
      </Text>
      <View
        pointerEvents={locked ? "none" : "auto"}
        aria-disabled={locked}
        style={[styles.actions, locked && styles.locked]}
      >
        {more && more.length > 0 ? <MoreButton items={more} /> : null}
        {primary ? (
          <Tappable role="button" onPress={primary.onPress} scaleTo={0.98} style={styles.primary}>
            <Plus size={18} color={colors["primary-foreground"]} />
            <Text style={styles.primaryLabel}>{primary.label}</Text>
          </Tappable>
        ) : null}
      </View>
    </View>
  );
}

/** Bouton rond « … » : ouvre la feuille des actions secondaires (exporter, comptable…). */
export function MoreButton({ items }: { items: readonly MoreItem[] }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setNote(null);
  };
  return (
    <>
      <Tappable
        role="button"
        aria-label={t.more}
        aria-haspopup="menu"
        onPress={() => setOpen(true)}
        style={styles.more}
      >
        <Ellipsis size={20} color={colors.foreground} />
      </Tappable>
      <BottomSheet visible={open} onClose={close} title={t.more} closeLabel={t.close}>
        <View role="menu" style={styles.menu}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              role="menuitem"
              onPress={() => {
                if ("note" in item) {
                  setNote(item.note);
                  return;
                }
                close();
                item.onPress();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Text style={[styles.menuLabel, "note" in item && styles.muted]}>{item.label}</Text>
              {"soon" in item ? <Text style={styles.soon}>{item.soon}</Text> : null}
            </Pressable>
          ))}
        </View>
        {note ? (
          <Text role="status" style={styles.note}>
            {note}
          </Text>
        ) : null}
      </BottomSheet>
    </>
  );
}

/**
 * Filtres soulignés, avec leur nombre ou leur montant (« À payer · 1 528 € »). `chips` : pastilles
 * qui défilent jusqu'au bord de l'écran, l'active en bleu nuit (listes « Nette », lot 3).
 */
export function ListFilters<V extends string>({
  label,
  items,
  value,
  onChange,
  chips = false,
}: {
  label: string;
  items: readonly { value: V; label: string; detail?: string; tone?: ListTone }[];
  value: V;
  onChange: (value: V) => void;
  chips?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      role="tablist"
      aria-label={label}
      style={chips ? styles.chips : styles.filters}
      contentContainerStyle={chips ? styles.chipsContent : styles.filtersContent}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            role="tab"
            aria-selected={active}
            aria-label={item.detail ? `${item.label}, ${item.detail}` : item.label}
            hitSlop={chips ? { top: 4, bottom: 4 } : undefined}
            onPress={() => {
              if (active) return;
              haptic.select();
              onChange(item.value);
            }}
            style={
              chips
                ? [styles.chip, active && styles.chipActive]
                : [styles.filter, active && styles.filterActive]
            }
          >
            {chips ? (
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {item.label}
                {item.detail ? <Text style={styles.chipCount}>{` ${item.detail}`}</Text> : null}
              </Text>
            ) : (
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {item.label}
                {item.detail ? (
                  <Text
                    style={{ color: item.tone ? TONES[item.tone] : colors["muted-foreground"] }}
                  >
                    {` · ${item.detail}`}
                  </Text>
                ) : null}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export type StripFigure = {
  label: string;
  value: string;
  /** Chiffre en rouge (demande sur le point d'expirer). */
  danger?: boolean;
  /** Valeur lue par les lecteurs d'écran à la place de `value` (« aucune » pour « — »). */
  spoken?: string;
};

/**
 * Trois chiffres serrés sur une ligne, en tête des listes Demandes et Chantiers (refonte
 * « Nette », lot 3) : le chiffre en grand, son libellé court dessous.
 */
export function FigureStrip({
  label,
  figures,
}: {
  label: string;
  figures: readonly StripFigure[];
}) {
  return (
    <View role="group" aria-label={label} style={styles.strip}>
      {figures.map((figure, i) => (
        <View
          key={figure.label}
          accessible
          aria-label={`${figure.label} : ${figure.spoken ?? figure.value}`}
          style={[styles.stripCell, i > 0 && styles.stripLeft]}
        >
          <Text
            style={[styles.stripValue, figure.danger && styles.stripDanger]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {figure.value}
          </Text>
          <Text style={styles.stripLabel}>{figure.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Titre d'un groupe de lignes, avec son nombre en gris (« À traiter  2 », « … 2 rendez-vous »). */
export function GroupTitle({ title, count }: { title: string; count: number | string }) {
  return (
    <Text role="heading" aria-label={`${title}, ${count}`} style={styles.groupTitle}>
      {title}
      <Text style={styles.groupCount}>{`  ${count}`}</Text>
    </Text>
  );
}

/** Champ de recherche compact, loupe à l'intérieur. */
export function ListSearch({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Search size={16} color={colors["subtle-foreground"]} />
      <TextInput
        aria-label={t.search}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors["subtle-foreground"]}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={styles.searchInput}
      />
    </View>
  );
}

/** Cadre des lignes, séparées par un trait fin. */
export function ListGroup({ children }: { children: ReactNode }) {
  return (
    <View style={styles.group}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={index > 0 && styles.separator}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Fond clair des icônes et des pastilles d'état (refonte « Nette », lot 2). */
const SOFT_TONES: Record<ListTone, string> = {
  success: colors["success-soft"],
  danger: colors["danger-soft"],
  warning: colors["warning-soft"],
  neutral: "#f1f2f5",
  primary: colors["primary-soft"],
};

/**
 * Une ligne : titre (deux lignes au plus) et détail à gauche ; montant et état à droite, état en
 * un mot et une couleur. `onPress` : ouvre la fiche (chevron) ; `busy` : roue à la place du chevron (PDF en préparation).
 * Rubrique Argent (lot 2) : `icon`, icône de 44 px sur fond coloré à gauche, et `statusBelow`,
 * état en pastille sous le détail plutôt que sous le montant.
 */
export function ListRow({
  onPress,
  onPressIn,
  label,
  title,
  detail,
  value,
  status,
  badge,
  icon,
  statusBelow = false,
  busy = false,
  disabled = false,
}: {
  onPress?: () => void;
  /** Doigt posé : la fiche commence à se charger (ADR 0193). */
  onPressIn?: () => void;
  /** Nom accessible (« Ouvrir la dépense … »). */
  label?: string;
  title: string;
  detail?: ReactNode;
  value?: string;
  status?: { text: string; tone: ListTone };
  /** Pastille sous le titre (« Exemple »). */
  badge?: ReactNode;
  icon?: { icon: LucideIcon; tone: ListTone };
  statusBelow?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const Icon = icon?.icon;
  const pill = statusBelow && status;
  return (
    <Pressable
      role={onPress ? "button" : undefined}
      aria-label={label}
      aria-busy={busy}
      disabled={!onPress || disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon && Icon ? (
        <View style={[styles.rowIcon, { backgroundColor: SOFT_TONES[icon.tone] }]}>
          <Icon size={20} color={TONES[icon.tone]} />
        </View>
      ) : null}
      <View style={[styles.texts, pill && styles.textsPill]}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {pill ? (
          <View style={styles.pills}>
            <Text
              style={[
                styles.pill,
                { color: TONES[status.tone], backgroundColor: SOFT_TONES[status.tone] },
              ]}
            >
              {status.text}
            </Text>
            {badge}
          </View>
        ) : (
          badge
        )}
      </View>
      {value !== undefined || (status && !pill) ? (
        <View style={styles.side}>
          {value !== undefined ? <Text style={styles.value}>{value}</Text> : null}
          {status && !pill ? (
            <Text style={[styles.status, { color: TONES[status.tone] }]}>{status.text}</Text>
          ) : null}
        </View>
      ) : null}
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : onPress ? (
        <ChevronRight size={18} color={colors["muted-foreground"]} />
      ) : null}
    </Pressable>
  );
}

export type SwipeAction = {
  label: string;
  icon: LucideIcon;
  tone: "success" | "danger" | "primary";
  onPress: () => void;
};

const SWIPE_TONES: Record<SwipeAction["tone"], string> = {
  success: colors.success,
  danger: colors.danger,
  primary: colors.primary,
};

/**
 * Glisser une ligne vers la gauche pour agir (ADR 0196), comme Mail sur iPhone : les boutons
 * apparaissent à droite (« Payée », « Supprimer », « Répondre »). Un toucher agit et referme
 * la ligne. Les mêmes actions restent dans la fiche (lecteurs d'écran, exemples).
 */
export function Swipe({
  actions,
  enabled = true,
  rounded = false,
  children,
}: {
  actions: readonly SwipeAction[];
  enabled?: boolean;
  /** Carte aux coins arrondis (demandes) : les boutons suivent ses coins. */
  rounded?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<SwipeableMethods>(null);
  if (!enabled || actions.length === 0) return children;
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={rounded ? styles.swipeRounded : undefined}
      onSwipeableWillOpen={() => haptic.select()}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              role="button"
              aria-label={action.label}
              onPress={() => {
                ref.current?.close();
                haptic.tap();
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.swipeAction,
                { backgroundColor: SWIPE_TONES[action.tone] },
                pressed && styles.swipePressed,
              ]}
            >
              <action.icon size={18} color={colors["primary-foreground"]} />
              <Text style={styles.swipeText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  swipeActions: { flexDirection: "row" },
  swipeRounded: { overflow: "hidden", borderRadius: radius.card },
  swipeAction: {
    width: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
  },
  swipePressed: { opacity: 0.85 },
  swipeText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-foreground"] },
  header: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  title: {
    flex: 1,
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: colors.foreground,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  locked: { opacity: 0.5 },
  more: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: theme.touchTarget,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(4),
  },
  primaryLabel: { fontFamily: font.semibold, fontSize: 15, color: colors["primary-foreground"] },
  menu: { gap: spacing(0.5) },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    minHeight: 52,
    borderRadius: radius.input,
    paddingHorizontal: spacing(3),
  },
  menuLabel: { flexShrink: 1, fontFamily: font.regular, fontSize: 16, color: colors.foreground },
  muted: { color: colors["muted-foreground"] },
  soon: {
    overflow: "hidden",
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  note: {
    paddingHorizontal: spacing(3),
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
  filters: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersContent: { gap: spacing(1) },
  filter: {
    minHeight: theme.touchTarget,
    justifyContent: "center",
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    paddingHorizontal: spacing(2),
  },
  filterActive: { borderBottomColor: colors.foreground },
  filterLabel: { fontFamily: font.medium, fontSize: 15, color: colors["muted-foreground"] },
  filterLabelActive: { fontFamily: font.semibold, color: colors.foreground },
  // Pastilles jusqu'au bord de l'écran (marge des listes : 20 px).
  chips: { flexGrow: 0, marginHorizontal: -spacing(5) },
  chipsContent: { gap: spacing(2), paddingHorizontal: spacing(5) },
  chip: {
    height: 36,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  chipActive: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  chipLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  chipLabelActive: { color: colors["primary-foreground"] },
  chipCount: { fontFamily: font.medium, opacity: 0.7 },
  strip: {
    flexDirection: "row",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stripCell: {
    flex: 1,
    minWidth: 0,
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingVertical: 14,
  },
  stripLeft: { borderLeftWidth: 1, borderLeftColor: colors.border },
  stripValue: {
    fontFamily: font.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  stripDanger: { color: colors.danger },
  stripLabel: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: colors.label },
  groupTitle: {
    marginTop: spacing(2),
    marginBottom: -spacing(1),
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  groupCount: {
    fontFamily: font.semibold,
    fontSize: 14,
    letterSpacing: 0,
    color: colors["muted-foreground"],
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    minHeight: theme.touchTarget,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
  },
  searchInput: {
    flex: 1,
    minHeight: theme.touchTarget,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.foreground,
  },
  group: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 72,
    // Fond plein : la ligne glisse par-dessus ses boutons (ADR 0196).
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
  },
  pressed: { backgroundColor: colors.background },
  texts: { flex: 1, alignItems: "flex-start", gap: spacing(0.5) },
  rowTitle: {
    alignSelf: "stretch",
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.foreground,
  },
  detail: {
    alignSelf: "stretch",
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  side: { alignItems: "flex-end", gap: spacing(0.5) },
  value: {
    fontFamily: font.display,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  status: { fontFamily: font.semibold, fontSize: 13 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textsPill: { gap: spacing(1) },
  pills: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(1.5) },
  pill: {
    overflow: "hidden",
    borderRadius: radius.chip,
    paddingHorizontal: 9,
    paddingVertical: spacing(1),
    fontFamily: font.bold,
    fontSize: 12,
  },
});
