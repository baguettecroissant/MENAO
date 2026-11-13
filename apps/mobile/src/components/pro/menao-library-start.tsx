import { formatCoefficient, formatEurosInput, parseCoefficient, parseEuros } from "@menao/core";
import { BookOpen, FileText, type LucideIcon, Upload } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { type StartTrade, startLibrary } from "@/lib/library";
import { Button, Chip, Notice, Screen, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const t = fr.proLibrary.start;

/**
 * Premier passage dans la bibliothèque (F-147, lot 41, écran 4) : bibliothèque MENAO pour les
 * métiers de la fiche, import (sur ordinateur, bientôt) ou devis, et les deux réglages.
 */
export function MenaoLibraryStart({
  trades,
  devisCount,
  hourPriceCents,
  coefBp,
  onDone,
  header,
}: {
  /** En-tête de l'onglet Argent ; le bouton « Créer » reste en bas d'écran (maquette). */
  header?: ReactNode;
  trades: StartTrade[];
  devisCount: number;
  hourPriceCents: number | null;
  coefBp: number;
  onDone: (added: number) => void;
}) {
  const [choice, setChoice] = useState<"menao" | "devis">("menao");
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(trades.filter((tr) => tr.mine).map((tr) => tr.code)),
  );
  const [hourPrice, setHourPrice] = useState(
    hourPriceCents === null ? "" : formatEurosInput(hourPriceCents),
  );
  const [coef, setCoef] = useState(formatCoefficient(coefBp));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const count = trades.filter((tr) => picked.has(tr.code)).reduce((s, tr) => s + tr.count, 0);

  async function create() {
    const hour = hourPrice.trim() ? parseEuros(hourPrice) : null;
    const coefValue = coef.trim() ? parseCoefficient(coef.replace(/^×\s*/, "")) : 10_000;
    if ((hourPrice.trim() && hour === null) || coefValue === null) return setError(t.invalid);
    if (choice === "menao" && hour === null) return setError(t.hourRequired);
    if (choice === "menao" && picked.size === 0) return setError(t.noTrade);
    setError(null);
    setBusy(true);
    const result = await startLibrary({
      choice,
      trades: [...picked],
      hourPriceCents: hour,
      coefBp: coefValue,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onDone(result.added);
  }

  return (
    <Screen
      footer={
        <Button
          label={t.create}
          onPress={create}
          loading={busy}
          disabled={choice === "menao" && picked.size === 0}
        />
      }
    >
      {header}
      <View style={styles.wrap}>
        <Text style={styles.title} role="heading">
          {t.title}
        </Text>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Option
          icon={BookOpen}
          title={t.menaoTitle}
          text={t.menaoText(count, picked.size)}
          selected={choice === "menao"}
          onPress={() => setChoice("menao")}
        >
          <Text style={styles.label}>{t.tradesLabel}</Text>
          <View style={styles.chips}>
            {trades.map((tr) => (
              <Chip
                key={tr.code}
                label={`${tr.label} ${tr.count}`}
                selected={picked.has(tr.code)}
                onPress={() =>
                  setPicked((set) => {
                    const next = new Set(set);
                    if (next.has(tr.code)) next.delete(tr.code);
                    else next.add(tr.code);
                    return next;
                  })
                }
              />
            ))}
          </View>
        </Option>
        <Option icon={Upload} title={t.importTitle} text={t.importText} selected={false} disabled />
        <Option
          icon={FileText}
          title={t.devisTitle}
          text={t.devisText(devisCount)}
          selected={choice === "devis"}
          onPress={() => setChoice("devis")}
        />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.settingsTitle}</Text>
          <TextField
            label={t.hourPrice}
            value={hourPrice}
            onChangeText={setHourPrice}
            keyboardType="decimal-pad"
            placeholder="55,00"
          />
          <TextField
            label={t.coef}
            value={coef}
            onChangeText={setCoef}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
    </Screen>
  );
}

function Option({
  icon: Icon,
  title,
  text,
  selected,
  onPress,
  disabled = false,
  badge,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.option, selected && styles.optionSelected, disabled && styles.disabled]}>
      <Pressable
        role="radio"
        aria-checked={selected}
        aria-disabled={disabled}
        aria-label={title}
        disabled={disabled}
        onPress={onPress}
        style={styles.optionRow}
      >
        <View style={styles.optionIcon}>
          <Icon size={17} color={colors.foreground} />
        </View>
        <View style={styles.optionTexts}>
          <View style={styles.optionHead}>
            <Text style={styles.optionTitle}>{title}</Text>
            {badge ? <Text style={styles.badge}>{badge}</Text> : null}
          </View>
          <Text style={styles.optionText}>{text}</Text>
        </View>
      </Pressable>
      {selected && children ? <View style={styles.optionExtra}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(3) },
  title: { fontFamily: font.display, fontSize: 20, color: colors.foreground },
  option: {
    gap: spacing(3),
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: { borderWidth: 2, borderColor: colors.foreground, padding: 13 },
  disabled: { opacity: 0.6 },
  optionRow: { flexDirection: "row", gap: spacing(3), alignItems: "flex-start" },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTexts: { flex: 1, gap: 2 },
  optionHead: { flexDirection: "row", alignItems: "center", gap: spacing(2), flexWrap: "wrap" },
  optionTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  optionText: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  badge: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors["muted-foreground"],
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  optionExtra: { gap: spacing(2) },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.label },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  card: {
    gap: spacing(2.5),
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
});
