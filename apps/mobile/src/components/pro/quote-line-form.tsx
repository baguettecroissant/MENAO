import {
  DEFAULT_UNIT,
  QUOTE_LINE_TYPES,
  QUOTE_UNITS,
  formatQuantity,
  lineTotalHtCents,
  lineTtcCents,
  parseEuros,
  parseQuantity,
  type QuoteLineType,
  type QuoteUnit,
} from "@menao/core";
import { quoteLineFormSchema, type QuoteLineInput } from "@menao/validation";
import { Search, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { searchPreviousLines } from "@/lib/pro-quotes";
import { Button, Chip, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuote;
const { colors, font, radius, spacing } = theme;
const vatLabel = (bp: number) => `${(bp / 100).toLocaleString("fr-FR")} %`;
const priceInput = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, useGrouping: false });

/**
 * Ajout ou modification d'une ligne du devis (F-19), comme sur le site : type, désignation (avec
 * le catalogue personnel), description, quantité, unité, prix HT et TVA, totaux en direct
 * (calculs de @menao/core) et mêmes contrôles (`quoteLineFormSchema`).
 */
export function LineForm({
  title,
  initial,
  rates,
  defaultVat,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial: QuoteLineInput | null;
  rates: readonly number[];
  defaultVat: number;
  onSubmit: (line: QuoteLineInput) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<QuoteLineType>(initial?.type ?? "materiel");
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [quantity, setQuantity] = useState(initial ? formatQuantity(initial.quantityMilli) : "1");
  const [unit, setUnit] = useState<QuoteUnit>(initial?.unit ?? DEFAULT_UNIT.materiel);
  const [price, setPrice] = useState(initial ? priceInput(initial.unitPriceHtCents) : "");
  const [vat, setVat] = useState(
    initial && rates.includes(initial.vatRateBp) ? initial.vatRateBp : defaultVat,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  const quantityMilli = parseQuantity(quantity);
  const unitPrice = parseEuros(price);
  const ht =
    quantityMilli !== null && unitPrice !== null
      ? lineTotalHtCents(quantityMilli, unitPrice)
      : null;
  const ttc =
    quantityMilli !== null && unitPrice !== null
      ? lineTtcCents({ quantityMilli, unitPriceHtCents: unitPrice, vatRateBp: vat })
      : null;
  const priceLabel =
    type === "autre"
      ? t.price
      : type === "main_oeuvre" && unit === "h"
        ? t.hourlyRate
        : t.unitPrice;

  function changeType(next: QuoteLineType) {
    // L'unité suit le type tant que l'artisan ne l'a pas changée.
    if (unit === DEFAULT_UNIT[type]) setUnit(DEFAULT_UNIT[next]);
    setType(next);
  }

  function pick(line: QuoteLineInput) {
    setType(line.type);
    setDesignation(line.designation);
    setDescription(line.description);
    if ((QUOTE_UNITS as readonly string[]).includes(line.unit)) setUnit(line.unit);
    setPrice(priceInput(line.unitPriceHtCents));
    if (rates.includes(line.vatRateBp)) setVat(line.vatRateBp);
    setSearching(false);
  }

  function submit() {
    const parsed = quoteLineFormSchema.safeParse({
      type,
      designation,
      description,
      quantity,
      unit,
      unitPrice: price,
      vatRateBp: vat,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <View style={styles.form} aria-label={title}>
      <Text style={styles.title}>{title}</Text>
      <Segmented
        label={t.lineType}
        options={QUOTE_LINE_TYPES.map((value) => ({ value, label: t.types[value] }))}
        value={type}
        onChange={changeType}
      />
      <TextField
        label={t.designation}
        value={designation}
        onChangeText={setDesignation}
        maxLength={200}
        autoFocus={initial === null}
        error={errors.designation}
      />
      <Pressable
        role="button"
        aria-expanded={searching}
        onPress={() => setSearching(!searching)}
        style={styles.searchToggle}
        hitSlop={8}
      >
        <Text style={styles.small}>{searching ? t.closeSearch : t.search}</Text>
        {searching ? (
          <X size={14} color={colors["muted-foreground"]} />
        ) : (
          <Search size={14} color={colors["muted-foreground"]} />
        )}
      </Pressable>
      {searching ? <ArticleSearch initialQuery={designation} onPick={pick} /> : null}
      <TextField
        label={t.description}
        value={description}
        onChangeText={setDescription}
        maxLength={1000}
        error={errors.description}
      />
      <TextField
        label={t.quantity}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        error={errors.quantity}
      />
      <Text style={styles.label}>{t.unit}</Text>
      <View style={styles.units}>
        {QUOTE_UNITS.map((value) => (
          <Chip
            key={value}
            label={t.units[value]}
            selected={unit === value}
            onPress={() => setUnit(value)}
          />
        ))}
      </View>
      <TextField
        label={priceLabel}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="0,00"
        error={errors.unitPrice}
      />
      <View style={styles.totals}>
        <View style={styles.totalLine}>
          <Text style={styles.text}>{t.totalHt}</Text>
          <Text style={styles.text}>{ht !== null ? formatCents(ht) : t.none}</Text>
        </View>
        {rates.length > 1 ? (
          <View style={styles.vat}>
            <Text style={styles.text}>{t.vat}</Text>
            <Segmented
              label={t.vat}
              options={rates.map((value) => ({ value, label: vatLabel(value) }))}
              value={vat}
              onChange={setVat}
            />
            {/* TODO(legal) : conditions des taux réduits à faire valider par l'expert-comptable. */}
            {vat !== 2000 ? <Text style={styles.small}>{t.vatHint}</Text> : null}
          </View>
        ) : null}
        <View style={styles.totalLine}>
          <Text style={styles.strong}>{t.totalTtc}</Text>
          <Text style={styles.strong}>{ttc !== null ? formatCents(ttc) : t.none}</Text>
        </View>
      </View>
      <Button label={t.validate} variant="secondary" onPress={submit} />
      <Button label={t.cancelLine} variant="ghost" onPress={onCancel} />
    </View>
  );
}

/** « Rechercher l'article » : lignes déjà utilisées dans les devis de l'artisan. */
function ArticleSearch({
  initialQuery,
  onPick,
}: {
  initialQuery: string;
  onPick: (line: QuoteLineInput) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<QuoteLineInput[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPreviousLines(query).then((found) => {
        if (!cancelled) setResults(found);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={styles.search}>
      <TextField label={t.searchLabel} value={query} onChangeText={setQuery} />
      {results?.length === 0 ? <Text style={styles.small}>{t.noResult}</Text> : null}
      {(results ?? []).map((line) => (
        <Pressable
          key={`${line.designation}-${line.unitPriceHtCents}`}
          role="button"
          onPress={() => onPick(line)}
          style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
        >
          <Text style={styles.resultText} numberOfLines={1}>
            {line.designation}
          </Text>
          <Text style={styles.small}>{`${formatCents(line.unitPriceHtCents)} HT`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  title: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  searchToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: spacing(1),
    marginTop: -spacing(1),
  },
  units: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  totals: {
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  totalLine: { flexDirection: "row", justifyContent: "space-between" },
  vat: { gap: spacing(2) },
  search: {
    gap: spacing(2),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    padding: spacing(3),
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    minHeight: theme.touchTarget,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
  },
  resultPressed: { backgroundColor: colors["primary-softer"] },
  resultText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.foreground },
});
