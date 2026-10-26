import { ChevronRight, Ellipsis, Plus, Search } from "lucide-react-native";
import { Children, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setNote(null);
  };
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
        {more && more.length > 0 ? (
          <Tappable
            role="button"
            aria-label={t.more}
            aria-haspopup="menu"
            onPress={() => setOpen(true)}
            style={styles.more}
          >
            <Ellipsis size={20} color={colors.foreground} />
          </Tappable>
        ) : null}
        {primary ? (
          <Tappable role="button" onPress={primary.onPress} scaleTo={0.98} style={styles.primary}>
            <Plus size={18} color={colors["primary-foreground"]} />
            <Text style={styles.primaryLabel}>{primary.label}</Text>
          </Tappable>
        ) : null}
      </View>
      {more ? (
        <BottomSheet visible={open} onClose={close} title={t.more} closeLabel={t.close}>
          <View role="menu" style={styles.menu}>
            {more.map((item) => (
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
      ) : null}
    </View>
  );
}

/** Filtres soulignés, avec leur nombre ou leur montant (« À payer · 1 528 € »). */
export function ListFilters<V extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly { value: V; label: string; detail?: string; tone?: ListTone }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      role="tablist"
      aria-label={label}
      style={styles.filters}
      contentContainerStyle={styles.filtersContent}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            role="tab"
            aria-selected={active}
            onPress={() => {
              if (active) return;
              haptic.select();
              onChange(item.value);
            }}
            style={[styles.filter, active && styles.filterActive]}
          >
            <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
              {item.label}
              {item.detail ? (
                <Text style={{ color: item.tone ? TONES[item.tone] : colors["subtle-foreground"] }}>
                  {` · ${item.detail}`}
                </Text>
              ) : null}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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

/**
 * Une ligne : titre (deux lignes au plus) et détail à gauche ; montant et état à droite, état en
 * un mot et une couleur. `onPress` : ouvre la fiche (chevron) ; `busy` : roue à la place du chevron (PDF en préparation).
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
  busy?: boolean;
  disabled?: boolean;
}) {
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
      <View style={styles.texts}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {badge}
      </View>
      {value !== undefined || status ? (
        <View style={styles.side}>
          {value !== undefined ? <Text style={styles.value}>{value}</Text> : null}
          {status ? (
            <Text style={[styles.status, { color: TONES[status.tone] }]}>{status.text}</Text>
          ) : null}
        </View>
      ) : null}
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : onPress ? (
        <ChevronRight size={16} color={colors["subtle-foreground"]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  title: { flex: 1, fontFamily: font.medium, fontSize: 20, color: colors.foreground },
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
  primaryLabel: { fontFamily: font.medium, fontSize: 15, color: colors["primary-foreground"] },
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
  filterLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  filterLabelActive: { fontFamily: font.medium, color: colors.foreground },
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
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 64,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  pressed: { backgroundColor: colors.background },
  texts: { flex: 1, alignItems: "flex-start", gap: spacing(0.5) },
  rowTitle: {
    alignSelf: "stretch",
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.foreground,
  },
  detail: {
    alignSelf: "stretch",
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  side: { alignItems: "flex-end", gap: spacing(0.5) },
  value: {
    fontFamily: font.medium,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  status: { fontFamily: font.regular, fontSize: 12 },
});
