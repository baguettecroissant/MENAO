import { formatRateBp } from "@menao/core";
import { useState, type ReactNode } from "react";
import { ListGroup, ListRow, ListSearch } from "@/components/list-kit";
import { ListRowsSkeleton } from "@/components/skeletons";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { filterWorks, loadLibrary } from "@/lib/library";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen } from "@/ui";

const t = fr.proLibrary;
const units = fr.proQuote.unitsShort as Record<string, string>;
const load = () => loadLibrary({ seed: true });

/**
 * Bibliothèque d'ouvrages dans l'onglet Argent (F-141, ADR 0293, 0294), comme sur le site : chaque
 * ouvrage avec son prix et sa marge (taux de marque), recherche. Remplie avec les anciens devis à
 * la première ouverture. Ouvrages, fournitures et réglages se modifient sur ordinateur.
 */
export function LibraryScreen({ switcher }: { switcher: ReactNode }) {
  const [library] = useFocusData(load, undefined, "tab:bibliotheque");
  const [query, setQuery] = useState("");
  const header = <TabHeader title={fr.tabs.money}>{switcher}</TabHeader>;

  if (library === undefined) {
    return (
      <Screen>
        {header}
        <ListRowsSkeleton />
      </Screen>
    );
  }
  if (library === null) {
    return (
      <Screen>
        {header}
        <Notice tone="error">{t.failed}</Notice>
      </Screen>
    );
  }
  const works = filterWorks(library.works, query);
  return (
    <Screen>
      {header}
      {library.seeded !== null ? <Notice tone="info">{t.seeded(library.seeded)}</Notice> : null}
      {library.works.length > 0 ? (
        <ListSearch value={query} onChangeText={setQuery} placeholder={t.search} />
      ) : null}
      {library.works.length === 0 ? (
        <Body muted>{t.empty}</Body>
      ) : works.length === 0 ? (
        <Body muted>{t.noResult}</Body>
      ) : (
        <ListGroup>
          {works.map((w) => {
            const { priceCents, marginCents, markupBp } = w.pricing;
            const origin = w.composed ? t.composed : w.source === "devis" ? t.fromQuotes : t.manual;
            return (
              <ListRow
                key={w.id}
                title={w.designation}
                detail={`${units[w.unit] ?? w.unit} · ${origin}`}
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
      <Body muted>{t.editOnComputer}</Body>
    </Screen>
  );
}
