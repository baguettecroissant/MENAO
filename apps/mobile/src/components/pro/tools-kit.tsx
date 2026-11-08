import { progressRatio } from "@menao/core";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Check, ChevronDown, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { fr } from "@/i18n/fr";
import { fromIsoDate, toIsoDate } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { theme } from "@/ui/theme";
import { TAG_TONES, type FicheTone } from "./fiche-kit";

const t = fr.proTools;
const { colors, font, radius, spacing } = theme;

/**
 * Briques des outils de l'artisan (refonte « Nette », lot 8), d'après les maquettes validées
 * (« DepenseApp », « AideApp », versions ordinateur transposées) : champs arrondis en 16 points
 * (pas de zoom sur iPhone), listes de choix dans une feuille, interrupteurs en carte, choix en
 * deux cartes, barres de progression, carrés d'icône et cases bleu nuit.
 */

/** Libellé, champ arrondi et aide ou erreur dessous. */
function FieldFrame({
  label,
  hint,
  error,
  style,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Champ de saisie des maquettes : 48 px, coins de 12 px, texte en 16 points. */
export function ToolField({
  label,
  hint,
  error,
  style,
  onFocus,
  onBlur,
  ...input
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  /** Bloc du champ (largeur partagée dans une rangée). */
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldFrame label={label} hint={hint} error={error} style={style}>
      <TextInput
        aria-label={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors["subtle-foreground"]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          input.multiline && styles.multiline,
          focused && styles.focused,
          error ? styles.invalid : null,
        ]}
        {...input}
      />
    </FieldFrame>
  );
}

/** Deux champs côte à côte, à parts égales. */
export function FieldPair({ children }: { children: ReactNode }) {
  return <View style={styles.pair}>{children}</View>;
}

/** Champ qui ouvre une liste de choix dans une feuille du bas (chantier, catégorie, type). */
export function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  error,
  style,
}: {
  label: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (value: V) => void;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? "";
  return (
    <FieldFrame label={label} hint={hint} error={error} style={style}>
      <Pressable
        role="button"
        aria-label={t.selectLabel(label, current)}
        aria-haspopup="dialog"
        onPress={() => {
          haptic.select();
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.input,
          styles.select,
          error ? styles.invalid : null,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.selectText} numberOfLines={1}>
          {current}
        </Text>
        <ChevronDown size={18} color={colors["muted-foreground"]} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label} closeLabel={t.close}>
        <View role="radiogroup" aria-label={label}>
          {options.map((option, i) => {
            const on = option.value === value;
            return (
              <Pressable
                key={option.value}
                role="radio"
                aria-checked={on}
                aria-label={option.label}
                onPress={() => {
                  haptic.select();
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  i > 0 && styles.optionBorder,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionText, on && styles.optionOn]}>{option.label}</Text>
                {on ? <Check size={18} color={colors["primary-strong"]} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </FieldFrame>
  );
}

/**
 * Date dans un champ des maquettes : calendrier compact sur iPhone, boîte de dialogue sur
 * Android, saisie AAAA-MM-JJ dans la version web.
 */
export function DateField({
  label,
  date,
  minDate,
  onDate,
  error,
  style,
}: {
  label: string;
  /** AAAA-MM-JJ, ou vide. */
  date: string;
  minDate: string;
  onDate: (date: string) => void;
  error?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web") {
    return (
      <ToolField
        label={label}
        value={date}
        onChangeText={onDate}
        placeholder={t.datePlaceholder}
        maxLength={10}
        error={error}
        style={style}
      />
    );
  }
  const value = fromIsoDate(date || minDate);
  return (
    <FieldFrame label={label} error={error} style={style}>
      {Platform.OS === "ios" ? (
        <View accessible accessibilityLabel={label} style={[styles.input, styles.dateBox]}>
          <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            minimumDate={fromIsoDate(minDate)}
            locale="fr-FR"
            accentColor={colors.primary}
            onChange={(event, picked) => {
              if (event.type === "set" && picked) onDate(toIsoDate(picked));
            }}
          />
        </View>
      ) : (
        <>
          <Pressable
            role="button"
            aria-label={date ? t.selectLabel(label, formatDay(date)) : label}
            onPress={() => setOpen(true)}
            style={[styles.input, styles.select, error ? styles.invalid : null]}
          >
            <Text style={styles.selectText} numberOfLines={1}>
              {date ? formatDay(date) : t.pickDate}
            </Text>
          </Pressable>
          {open ? (
            <DateTimePicker
              value={value}
              mode="date"
              display="default"
              minimumDate={fromIsoDate(minDate)}
              onChange={(event, picked) => {
                setOpen(false);
                if (event.type === "set" && picked) onDate(toIsoDate(picked));
              }}
            />
          ) : null}
        </>
      )}
    </FieldFrame>
  );
}

/**
 * Interrupteur en carte (« Déjà payée », « Envoyer automatiquement ») : intitulé, aide dessous et
 * interrupteur vert à droite ; `children` s'affiche dans la carte, sous la rangée. `soft` : fond
 * crème sans bordure, dans une carte blanche.
 */
export function SwitchCard({
  label,
  hint,
  value,
  onChange,
  soft = false,
  children,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  soft?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.switchCard, soft && styles.switchSoft]}>
      <View style={styles.switchRow}>
        <View style={styles.switchTexts}>
          <Text style={styles.switchLabel}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        <ToolSwitch label={label} value={value} onChange={onChange} />
      </View>
      {children}
    </View>
  );
}

/** Interrupteur vert des maquettes. */
export function ToolSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Switch
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        haptic.select();
        onChange(next);
      }}
      trackColor={{ true: colors.success, false: colors["border-strong"] }}
      thumbColor={colors.surface}
      // Version web : même pastille blanche, piste verte.
      {...(Platform.OS === "web" ? { activeThumbColor: colors.surface } : null)}
    />
  );
}

/** Choix en cartes côte à côte (rythme, rôle) : la carte choisie bordée de bleu nuit. */
export function ChoiceCards<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: V; label: string; detail?: string }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View role="radiogroup" aria-label={label} style={styles.choices}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={on}
              aria-label={option.detail ? `${option.label}, ${option.detail}` : option.label}
              onPress={() => {
                if (!on) haptic.select();
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.choice,
                on && styles.choiceOn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.choiceLabel}>{option.label}</Text>
              {option.detail ? <Text style={styles.hint}>{option.detail}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Barre de progression : `value` sur `target`, remplie en bleu (ou `color`). */
export function ProgressBar({
  value,
  target,
  label,
  color = colors.primary,
  track = colors.border,
  height = 8,
}: {
  value: number;
  target: number;
  /** Nom lu par les lecteurs d'écran. */
  label: string;
  color?: string;
  track?: string;
  height?: number;
}) {
  const ratio = progressRatio(value, target);
  return (
    <View
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={Math.min(value, target)}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}
    >
      <View
        style={{
          width: `${ratio * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Carré d'icône sur fond coloré (en-tête de l'assistant, absences, envois). */
export function IconSquare({
  icon: Icon,
  tone = "primary",
  size = 40,
  white = false,
}: {
  icon: LucideIcon;
  tone?: FicheTone;
  size?: number;
  /** Fond blanc (carte de statut colorée). */
  white?: boolean;
}) {
  const c = TAG_TONES[tone];
  return (
    <View
      style={[
        styles.square,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.3),
          backgroundColor: white ? colors.surface : c.bg,
        },
      ]}
    >
      <Icon size={Math.round(size * 0.48)} color={c.fg} />
    </View>
  );
}

/**
 * Case bleu nuit des maquettes (charte, éléments à envoyer) : `label` est lu par les lecteurs
 * d'écran et affiché, sauf si `children` le remplace (règle de la charte).
 */
export function CheckRow({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onPress={() => {
        haptic.select();
        onChange(!checked);
      }}
      style={({ pressed }) => [styles.check, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Check size={14} color={colors["primary-foreground"]} strokeWidth={3} /> : null}
      </View>
      <View style={styles.checkBody}>
        {children ?? <Text style={styles.checkLabel}>{label}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing(1.5) },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  error: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.danger },
  input: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: font.regular,
    // 16 points au moins : pas de zoom automatique sur iPhone (version web).
    fontSize: 16,
    color: colors.foreground,
  },
  multiline: {
    minHeight: 110,
    paddingTop: spacing(3),
    paddingBottom: spacing(3),
    textAlignVertical: "top",
  },
  // Contour du champ actif (remplace celui du navigateur sur la version web).
  focused: { borderColor: colors.primary, outlineWidth: 0 },
  invalid: { borderColor: colors.danger },
  pair: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2.5) },
  // Cartes de choix de même hauteur.
  choices: { flexDirection: "row", gap: spacing(2.5) },
  select: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  selectText: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.foreground },
  dateBox: { justifyContent: "center", alignItems: "flex-start", paddingHorizontal: spacing(1) },
  pressed: { opacity: 0.7 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 52,
    paddingVertical: spacing(2),
  },
  optionBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  optionText: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.foreground },
  optionOn: { fontFamily: font.semibold, color: colors["primary-strong"] },
  switchCard: {
    gap: spacing(3),
    paddingVertical: 14,
    paddingHorizontal: spacing(4),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  switchSoft: { borderWidth: 0, backgroundColor: colors.background, paddingHorizontal: 14 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  switchTexts: { flex: 1, gap: 2 },
  switchLabel: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  choice: {
    flex: 1,
    gap: 2,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  // Bordure de 2 px : la marge intérieure perd 1 px, la carte garde sa taille.
  choiceOn: {
    borderWidth: 2,
    borderColor: colors.foreground,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  choiceLabel: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  track: { overflow: "hidden" },
  square: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  check: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    minHeight: theme.touchTarget,
    paddingVertical: spacing(2.5),
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  checkBody: { flex: 1, paddingTop: 2 },
  checkLabel: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
});
