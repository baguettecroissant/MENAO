import { formatRateBp } from "@menao/core";
import { BookOpen } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font } = theme;
const t = fr.proLibrary;
const units = fr.proQuote.unitsShort as Record<string, string>;
const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR");

/** Bibliothèque, et pour le premier passage les métiers du catalogue MENAO (F-147). */
const load = async (): Promise<{ library: AppLibrary; trades: StartTrade[] } | null> => {
  const library = await loadLibrary({ seed: true });
  if (!library) return null;
  return { library, trades: library.onboarded ? [] : await loadMenaoTrades() };
};

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
      {library.works.length > 0 ? (
        <ListSearch value={query} onChangeText={setQuery} placeholder={t.search} />
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
