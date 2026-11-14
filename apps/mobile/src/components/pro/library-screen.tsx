import { formatRaise, formatRateBp } from "@menao/core";
import { router } from "expo-router";
import { BookOpen, ReceiptText, TrendingUp } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ListFilters, ListGroup, ListRow, ListSearch } from "@/components/list-kit";
import { MenaoLibraryStart } from "@/components/pro/menao-library-start";
import { ListRowsSkeleton } from "@/components/skeletons";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { useExamplesActive } from "@/lib/examples";
import {
  type AppLibrary,
  filterWorks,
  loadLibrary,
  loadMenaoTrades,
  type StartTrade,
} from "@/lib/library";
import {
  loadInvoiceCounts,
  loadUndoableRaise,
  undoRaise,
  type UndoableRaise,
} from "@/lib/library-prices";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, toast } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font } = theme;
const t = fr.proLibrary;
const units = fr.proQuote.unitsShort as Record<string, string>;
const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR");

type LibraryData = {
  library: AppLibrary;
  trades: StartTrade[];
  /** Dernière hausse encore annulable (F-149, lot 44). */
  raise: UndoableRaise | null;
  /** Prix d'achat repérés dans les factures (F-149, lot 44). */
  invoices: { changed: number; fresh: number };
};

/**
 * Bibliothèque, et pour le premier passage les métiers du catalogue MENAO (F-147) ; ensuite la
 * hausse annulable et les prix repérés dans les factures (F-149).
 */
const load = async (): Promise<LibraryData | null> => {
  const library = await loadLibrary({ seed: true });
  if (!library) return null;
  if (!library.onboarded) {
    return {
      library,
      trades: await loadMenaoTrades(),
      raise: null,
      invoices: { changed: 0, fresh: 0 },
    };
  }
  const [raise, invoices] = await Promise.all([loadUndoableRaise(), loadInvoiceCounts()]);
  return { library, trades: [], raise, invoices };
};

const until = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Bibliothèque d'ouvrages dans l'onglet Argent (F-141, ADR 0293, 0294), comme sur le site : chaque
 * ouvrage avec son prix et sa marge (taux de marque), recherche. Remplie avec les anciens devis à
 * la première ouverture. Ouvrages, fournitures et réglages se modifient sur ordinateur.
 */
export function LibraryScreen({ switcher }: { switcher: ReactNode }) {
  const [data, reload] = useFocusData(load, undefined, "tab:bibliotheque");
  const [query, setQuery] = useState("");
  const [trade, setTrade] = useState("tous");
  const [added, setAdded] = useState<number | null>(null);
  const examples = useExamplesActive();
  const header = <TabHeader title={fr.tabs.money}>{switcher}</TabHeader>;

  if (data === undefined) {
    return (
      <Screen>
        {header}
        <ListRowsSkeleton />
      </Screen>
    );
  }
  if (data === null) {
    return (
      <Screen>
        {header}
        <Notice tone="error">{t.failed}</Notice>
      </Screen>
    );
  }
  const { library } = data;
  // Premier passage (F-147) ; jamais en mode exemples, où rien ne s'écrit en base.
  if (!library.onboarded && !examples && data.trades.length > 0) {
    return (
      <MenaoLibraryStart
        header={header}
        trades={data.trades}
        devisCount={library.works.length}
        hourPriceCents={library.settings.hourPriceCents}
        coefBp={library.settings.supplyCoefBp}
        onDone={(n) => {
          setAdded(n > 0 ? n : null);
          void reload();
        }}
      />
    );
  }
  const menaoCount = library.works.filter((w) => w.source === "menao").length;
  const tradeOf = new Map(library.trades.map((tr) => [tr.code, tr.label]));
  const works = filterWorks(library.works, query).filter((w) =>
    trade === "tous" ? true : trade === "miens" ? w.source !== "menao" : w.tradeCode === trade,
  );
  return (
    <Screen>
      {header}
      {added !== null ? <Notice tone="info">{t.added(added)}</Notice> : null}
      {library.seeded !== null ? <Notice tone="info">{t.seeded(library.seeded)}</Notice> : null}
      {data.raise && !examples ? (
        <PriceBanner
          tone="primary"
          icon={TrendingUp}
          text={t.raise.done(
            formatRaise(data.raise.rateBp),
            data.raise.works,
            data.raise.supplies,
            until(data.raise.until),
          )}
          link={t.raise.undo}
          onPress={async () => {
            const restored = await undoRaise(data.raise!.id);
            if (restored === null) toast.error(t.raise.undoFailed);
            else toast.success(t.raise.undone(restored));
            await reload();
          }}
        />
      ) : null}
      {!examples && (data.invoices.changed > 0 || data.invoices.fresh > 0) ? (
        <PriceBanner
          tone="neutral"
          icon={ReceiptText}
          text={t.invoices.banner(data.invoices.changed, data.invoices.fresh)}
          link={t.invoices.bannerLink}
          onPress={() => router.push("/pro-prix-factures")}
        />
      ) : null}
      {library.works.length > 0 ? (
        <View style={styles.searchRow}>
          <View style={styles.searchGrow}>
            <ListSearch value={query} onChangeText={setQuery} placeholder={t.search} />
          </View>
          {!examples ? (
            <Pressable
              role="button"
              aria-label={t.raise.title}
              onPress={() => router.push("/pro-hausse")}
              style={({ pressed }) => [styles.raiseButton, pressed && styles.pressed]}
            >
              <TrendingUp size={16} color={colors.foreground} />
              <Text style={styles.raiseLabel}>{t.raise.button}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {menaoCount > 0 ? (
        <ListFilters
          chips
          label={t.filtersLabel}
          value={trade}
          onChange={setTrade}
          items={[
            { value: "tous", label: t.all },
            ...library.trades.map((tr) => ({ value: tr.code, label: tr.label })),
            { value: "miens", label: t.mine },
          ]}
        />
      ) : null}
      {library.works.length === 0 ? (
        <Body muted>{t.empty}</Body>
      ) : works.length === 0 ? (
        <Body muted>{t.noResult}</Body>
      ) : (
        <ListGroup>
          {works.map((w) => {
            const { priceCents, marginCents, markupBp } = w.pricing;
            const unit = units[w.unit] ?? w.unit;
            if (w.source === "menao") {
              const tradeLabel = w.tradeCode ? tradeOf.get(w.tradeCode) : undefined;
              return (
                <ListRow
                  key={w.id}
                  title={w.designation}
                  badge={<MenaoChip detail={[tradeLabel, unit].filter(Boolean).join(" · ")} />}
                  value={
                    w.range
                      ? formatCents(w.range.lowCents)
                      : priceCents === null
                        ? t.noPrice
                        : formatCents(priceCents)
                  }
                  status={
                    w.range
                      ? { text: t.rangeTo(formatCents(w.range.highCents)), tone: "neutral" }
                      : marginCents === null || markupBp === null
                        ? { text: t.costMissing, tone: "neutral" }
                        : {
                            text: formatRateBp(markupBp),
                            tone: marginCents < 0 ? "danger" : "success",
                          }
                  }
                />
              );
            }
            const origin = w.composed
              ? t.composed
              : w.source === "devis"
                ? t.fromQuotes
                : w.source === "import"
                  ? t.imported
                  : t.manual;
            return (
              <ListRow
                key={w.id}
                title={w.designation}
                detail={`${unit} · ${origin}`}
                value={priceCents === null ? t.noPrice : formatCents(priceCents)}
                status={
                  marginCents === null || markupBp === null
                    ? { text: t.costMissing, tone: "neutral" }
                    : { text: formatRateBp(markupBp), tone: marginCents < 0 ? "danger" : "success" }
                }
              />
            );
          })}
        </ListGroup>
      )}
      {library.publicPricesOn ? (
        <Body muted>{t.sourceFooter(shortDate(library.publicPricesOn))}</Body>
      ) : null}
      <Body muted>{t.editOnComputer}</Body>
    </Screen>
  );
}

/** Bandeau de la bibliothèque (lot 44) : hausse annulable, ou prix à vérifier. */
function PriceBanner({
  tone,
  icon: Icon,
  text,
  link,
  onPress,
}: {
  tone: "primary" | "neutral";
  icon: typeof TrendingUp;
  text: string;
  link: string;
  onPress: () => void;
}) {
  const fg = tone === "primary" ? colors["primary-strong"] : colors.foreground;
  return (
    <Pressable
      role="button"
      aria-label={`${text} ${link}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        tone === "primary" ? styles.bannerPrimary : styles.bannerNeutral,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={17} color={fg} />
      <Text style={[styles.bannerText, { color: fg }]}>{text}</Text>
      <Text style={[styles.bannerLink, { color: fg }]}>{link}</Text>
    </Pressable>
  );
}

/** Pastille « MENAO » suivie du métier et de l'unité (lot 41, écran 4). */
export function MenaoChip({ detail }: { detail: string }) {
  return (
    <View style={styles.chipRow}>
      <View style={styles.chip}>
        <BookOpen size={12} color={colors["primary-strong"]} />
        <Text style={styles.chipText}>{t.chip}</Text>
      </View>
      <Text style={styles.chipDetail} numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchGrow: { flex: 1 },
  raiseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: theme.touchTarget,
    paddingHorizontal: 12,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  raiseLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  pressed: { opacity: 0.7 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerPrimary: { backgroundColor: colors["primary-soft"] },
  bannerNeutral: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bannerText: { flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 19 },
  bannerLink: { fontFamily: font.bold, fontSize: 13.5 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: colors["primary-soft"],
  },
  chipText: { fontFamily: font.bold, fontSize: 12, color: colors["primary-strong"] },
  chipDetail: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12.5,
    color: colors["muted-foreground"],
  },
});
