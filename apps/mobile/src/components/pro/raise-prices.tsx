import {
  formatRaise,
  parseRaise,
  RAISE_ROUNDINGS,
  type RaiseRounding,
  raisePlan,
} from "@menao/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
  PillTabs,
} from "@/components/pro/fiche-kit";
import { CheckRow } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { loadRaiseBase, raisePrices, type RaiseBase } from "@/lib/library-prices";
import { invalidateScreen } from "@/lib/screen-cache";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proLibrary.raise;
const units = fr.proQuote.unitsShort as Record<string, string>;
const { colors, font, spacing } = theme;
const PREVIEW = 3;

/** Prix avec son unité (« 70,00 €/m² »), sans unité pour la pièce ou le forfait. */
const price = (cents: number, unit: string) =>
  unit === "u" || unit === "forfait"
    ? formatCents(cents)
    : `${formatCents(cents)}/${units[unit] ?? unit}`;

/**
 * Augmenter ses prix en un geste (F-149, lot 44, ADR 0313), comme sur le site : hausse, sur quoi,
 * arrondi, aperçu calculé par @menao/core ; la base garde les prix d'avant (annulable 24 h depuis
 * la bibliothèque).
 */
export function RaiseScreen() {
  const [data] = useFocusData(loadRaiseBase);
  if (data === undefined) return <FicheSkeleton title={t.title} />;
  if (data === null) {
    return (
      <FicheScreen title={t.title}>
        <Notice tone="error">{t.failed}</Notice>
      </FicheScreen>
    );
  }
  return <RaiseForm base={data} />;
}

export function RaiseForm({ base }: { base: RaiseBase }) {
  const fixedWorks = base.works.filter((w) => w.manualPriceCents !== null).length;
  const pricedSupplies = base.supplies.filter((s) => s.purchasePriceCents !== null).length;
  const [rate, setRate] = useState(formatRaise(300));
  const [onWorks, setOnWorks] = useState(fixedWorks > 0);
  const [onSupplies, setOnSupplies] = useState(fixedWorks === 0 && pricedSupplies > 0);
  const [rounding, setRounding] = useState<RaiseRounding>("dix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bp = parseRaise(rate);
  const plan =
    bp === null
      ? []
      : raisePlan(base.works, base.supplies, bp, rounding, {
          works: onWorks,
          supplies: onSupplies,
        });
  const nWorks = plan.filter((i) => i.kind === "ouvrage").length;

  async function apply() {
    if (bp === null || plan.length === 0) return;
    setBusy(true);
    setError(null);
    const ok = await raisePrices({ rateBp: bp, rounding, works: onWorks, supplies: onSupplies });
    setBusy(false);
    if (!ok) return setError(t.failed);
    invalidateScreen("tab:bibliotheque");
    router.back();
  }

  return (
    <FicheScreen
      title={t.title}
      keyboard
      footer={
        <View style={styles.footer}>
          {bp !== null && plan.length > 0 ? (
            <Text style={styles.footerNote}>
              {t.summary(formatRaise(bp), nWorks, plan.length - nWorks)}
            </Text>
          ) : null}
          <FicheButton
            label={t.apply}
            tall
            loading={busy}
            disabled={bp === null || plan.length === 0}
            onPress={() => void apply()}
          />
        </View>
      }
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      <View style={styles.rateRow}>
        <View style={styles.rateField}>
          <TextField
            label={t.rate}
            value={rate}
            onChangeText={setRate}
            keyboardType="numbers-and-punctuation"
            error={bp === null ? t.rateHint : undefined}
          />
        </View>
        <View style={styles.presets}>
          {t.presets.map((p) => (
            <Pressable
              key={p}
              role="button"
              aria-pressed={bp === p}
              onPress={() => setRate(formatRaise(p))}
              style={({ pressed }) => [
                styles.preset,
                bp === p && styles.presetOn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.presetLabel, bp === p && styles.presetLabelOn]}>
                {formatRaise(p)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.label}>{t.scope}</Text>
      <ScopeCard
        title={t.works}
        hint={t.worksHint(fixedWorks)}
        checked={onWorks}
        disabled={fixedWorks === 0}
        onChange={setOnWorks}
      />
      <ScopeCard
        title={t.supplies}
        hint={t.suppliesHint(pricedSupplies)}
        checked={onSupplies}
        disabled={pricedSupplies === 0}
        onChange={setOnSupplies}
      />

      <Text style={styles.label}>{t.rounding}</Text>
      <PillTabs
        label={t.rounding}
        options={RAISE_ROUNDINGS.map((r) => ({ value: r, label: t.roundings[r] ?? r }))}
        value={rounding}
        onChange={setRounding}
      />

      <FicheCard padding={3.5} gap={1}>
        <CardHeading
          title={t.preview}
          size={15}
          right={
            plan.length > 0 ? (
              <Text style={styles.muted}>
                {t.previewCount(Math.min(PREVIEW, plan.length), plan.length)}
              </Text>
            ) : null
          }
        />
        {plan.length === 0 ? (
          <Text style={styles.muted}>{t.nothing}</Text>
        ) : (
          plan.slice(0, PREVIEW).map((i) => (
            <View key={`${i.kind}-${i.id}`} style={styles.previewRow}>
              <Text style={styles.previewName} numberOfLines={1}>
                {i.designation}
              </Text>
              <Text style={styles.previewPrices}>
                <Text style={styles.mutedInline}>{price(i.beforeCents, i.unit)}</Text>
                {" › "}
                <Text style={styles.bold}>{price(i.afterCents, i.unit)}</Text>
              </Text>
            </View>
          ))
        )}
      </FicheCard>
    </FicheScreen>
  );
}

/** Carte « Sur quoi ? » : bordure bleu nuit quand elle est cochée (maquette). */
function ScopeCard({
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <View
      style={[styles.scope, checked && styles.scopeOn, disabled && styles.disabled]}
      pointerEvents={disabled ? "none" : "auto"}
      aria-disabled={disabled}
    >
      <CheckRow label={title} checked={checked} onChange={onChange}>
        <Text style={styles.scopeTitle}>{title}</Text>
        <Text style={styles.muted}>{hint}</Text>
      </CheckRow>
    </View>
  );
}

const styles = StyleSheet.create({
  rateRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2.5) },
  rateField: { width: 120 },
  presets: { flexDirection: "row", gap: spacing(1.5), paddingTop: 30 },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  preset: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  presetOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  presetLabel: { fontFamily: font.semibold, fontSize: 13.5, color: colors.foreground },
  presetLabelOn: { color: colors.surface },
  pressed: { opacity: 0.7 },
  scope: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scopeOn: {
    borderWidth: 2,
    borderColor: colors.foreground,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  disabled: { opacity: 0.6 },
  scopeTitle: { fontFamily: font.semibold, fontSize: 14.5, color: colors.foreground },
  muted: { fontFamily: font.regular, fontSize: 12.5, color: colors["muted-foreground"] },
  mutedInline: { color: colors["muted-foreground"] },
  bold: { fontFamily: font.bold, color: colors.foreground },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(2),
    paddingVertical: spacing(2.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  previewName: { flex: 1, fontFamily: font.regular, fontSize: 13.5, color: colors.foreground },
  previewPrices: { fontFamily: font.regular, fontSize: 13.5, color: colors.foreground },
  footer: { gap: spacing(2) },
  footerNote: {
    fontFamily: font.regular,
    fontSize: 12.5,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
