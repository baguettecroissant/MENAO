import { PRICE_JUMP_BP, type InvoiceNewSupply, worksRecalculated } from "@menao/core";
import { router } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FicheButton, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { CheckRow } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import {
  applyInvoicePrices,
  type InvoiceChangeView,
  type InvoicePrices,
  loadInvoicePrices,
} from "@/lib/library-prices";
import { invalidateScreen } from "@/lib/screen-cache";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proLibrary.invoices;
const units = fr.proQuote.unitsShort as Record<string, string>;
const { colors, font, spacing } = theme;
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const percent = (bp: number) =>
  `${bp > 0 ? "+" : ""}${(bp / 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

/** Écart en pastille : orange en hausse, vert en baisse (maquette lot 43-44). */
function Delta({ bp }: { bp: number }) {
  const up = bp > 0;
  return (
    <View
      style={[
        styles.delta,
        { backgroundColor: up ? colors["warning-soft"] : colors["success-soft"] },
      ]}
    >
      <Text style={[styles.deltaText, { color: up ? colors.warning : colors.success }]}>
        {percent(bp)}
      </Text>
    </View>
  );
}

/**
 * Prix d'achat repérés dans les factures (F-149, lot 44, ADR 0313), comme sur le site : une carte
 * par fourniture (cochée sauf écart de plus de 30 %), articles inconnus à ajouter, mise à jour
 * d'un geste avec le bouton fixe en bas.
 */
export function InvoicePricesScreen() {
  const [data] = useFocusData(loadInvoicePrices);
  if (data === undefined) return <FicheSkeleton title={t.title} />;
  if (data === null) {
    return (
      <FicheScreen title={t.title}>
        <Notice tone="error">{t.failed}</Notice>
      </FicheScreen>
    );
  }
  if (data.changes.length === 0 && data.fresh.length === 0) {
    return (
      <FicheScreen title={t.title}>
        <Body muted>{t.empty}</Body>
      </FicheScreen>
    );
  }
  return <InvoicePricesForm data={data} />;
}

export function InvoicePricesForm({ data }: { data: InvoicePrices }) {
  const [updates, setUpdates] = useState(
    () => new Set(data.changes.filter((c) => c.checked).map((c) => c.supplyId)),
  );
  const [adds, setAdds] = useState(() => new Set<string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };
  const jumps = data.changes.some((c) => c.deltaBp !== null && Math.abs(c.deltaBp) > PRICE_JUMP_BP);

  async function apply() {
    setBusy(true);
    setError(null);
    const result = await applyInvoicePrices({
      updates: data.changes
        .filter((c) => updates.has(c.supplyId))
        .map((c) => ({ supplyId: c.supplyId, lineId: c.lineId })),
      add: [...adds],
      seen: [...data.changes.map((c) => c.lineId), ...data.fresh.map((f) => f.lineId)],
    });
    setBusy(false);
    if (!result) return setError(t.invalid);
    invalidateScreen("tab:bibliotheque");
    toast.success(t.done(result.updated, result.added));
    router.back();
  }

  return (
    <FicheScreen
      title={t.title}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            {t.summary(updates.size, worksRecalculated(data.works, updates))}
          </Text>
          <FicheButton
            label={t.button(updates.size, adds.size)}
            variant={updates.size + adds.size > 0 ? "primary" : "secondary"}
            tall
            loading={busy}
            onPress={() => void apply()}
          />
        </View>
      }
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      {data.changes.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.head}>
            <Text role="heading" style={styles.title}>
              {t.changedTitle(data.changes.length)}
            </Text>
            {data.since ? <Text style={styles.muted}>{t.since(dayMonth(data.since))}</Text> : null}
          </View>
          <View style={styles.group}>
            {data.changes.map((c) => (
              <ChangeRow
                key={c.supplyId}
                change={c}
                checked={updates.has(c.supplyId)}
                onChange={(on) => setUpdates((s) => toggle(s, c.supplyId, on))}
              />
            ))}
          </View>
          {jumps ? (
            <View style={styles.jump}>
              <TriangleAlert size={14} color={colors.warning} />
              <Text style={styles.jumpText}>{t.jump}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {data.fresh.length > 0 ? (
        <View style={styles.block}>
          <Text role="heading" style={styles.subtitle}>
            {t.freshTitle(data.fresh.length)}
          </Text>
          <View style={styles.group}>
            {data.fresh.map((f) => (
              <FreshRow
                key={f.lineId}
                item={f}
                checked={adds.has(f.lineId)}
                onChange={(on) => setAdds((s) => toggle(s, f.lineId, on))}
              />
            ))}
          </View>
        </View>
      ) : null}
    </FicheScreen>
  );
}

function ChangeRow({
  change: c,
  checked,
  onChange,
}: {
  change: InvoiceChangeView;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const matched =
    c.matchedBy === "reference" && c.reference
      ? t.matchedReference(c.reference)
      : t.matchedDesignation;
  return (
    <View style={styles.row}>
      <CheckRow label={t.select(c.designation)} checked={checked} onChange={onChange}>
        <Text style={styles.name}>{c.designation}</Text>
        <Text style={styles.muted}>
          {matched} · {dayMonth(c.issuedOn)}
        </Text>
        <View style={styles.prices}>
          <Text style={styles.old}>
            {c.oldCents === null ? t.noPrice : formatCents(c.oldCents)}
          </Text>
          <Text style={styles.old}>›</Text>
          <Text style={styles.new}>{formatCents(c.newCents)}</Text>
          {c.deltaBp !== null ? <Delta bp={c.deltaBp} /> : null}
        </View>
      </CheckRow>
    </View>
  );
}

function FreshRow({
  item: f,
  checked,
  onChange,
}: {
  item: InvoiceNewSupply;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <CheckRow label={t.add(f.designation)} checked={checked} onChange={onChange}>
        <View style={styles.freshLine}>
          <View style={styles.flex}>
            <Text style={styles.name}>{f.designation}</Text>
            <Text style={styles.muted}>
              {[f.supplier, units[f.unit] ?? f.unit].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <Text style={styles.new}>{formatCents(f.priceCents)}</Text>
        </View>
      </CheckRow>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing(2.5) },
  head: { gap: spacing(1) },
  title: { fontFamily: font.display, fontSize: 17, color: colors.foreground },
  subtitle: { fontFamily: font.display, fontSize: 16, color: colors.foreground },
  muted: { fontFamily: font.regular, fontSize: 12.5, color: colors["muted-foreground"] },
  group: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: -StyleSheet.hairlineWidth,
  },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  prices: { flexDirection: "row", alignItems: "center", gap: spacing(2), marginTop: spacing(1) },
  old: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  new: { fontFamily: font.bold, fontSize: 14, color: colors.foreground },
  delta: { height: 24, borderRadius: 7, paddingHorizontal: 8, justifyContent: "center" },
  deltaText: { fontFamily: font.bold, fontSize: 12.5 },
  jump: { flexDirection: "row", gap: spacing(2), alignItems: "center" },
  jumpText: { fontFamily: font.regular, fontSize: 12.5, color: colors.warning },
  freshLine: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  flex: { flex: 1, gap: 2 },
  footer: { gap: spacing(2) },
  footerNote: {
    fontFamily: font.regular,
    fontSize: 12.5,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
