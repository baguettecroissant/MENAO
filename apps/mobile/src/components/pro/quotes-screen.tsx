import { isExampleId, quoteFigures } from "@menao/core";
import { router } from "expo-router";
import { FileText } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { EmptyState } from "@/components/empty-state";
import { FiguresSkeleton, FiltersSkeleton, ListRowsSkeleton } from "@/components/skeletons";
import { ExampleBadge } from "@/components/examples";
import { ListFilters, ListGroup, ListRow, type ListTone } from "@/components/list-kit";
import { MoneyFigures } from "@/components/pro/money-kit";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents, formatDayMonthNumeric, formatTime } from "@/lib/format";
import { loadArtisanQuotes, type ArtisanQuote } from "@/lib/pro-documents";
import { prefetchChantier } from "@/lib/prefetch";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen, useReveal } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuotes;

const STATUS_TONE: Record<ArtisanQuote["status"], ListTone> = {
  brouillon: "neutral",
  envoye: "primary",
  signe: "success",
  refuse: "danger",
  revision_demandee: "warning",
  remplace: "neutral",
};

/** État du devis en quelques mots, comme sur le site. */
function statusText(q: ArtisanQuote): string {
  if (q.status === "brouillon") {
    return [t.draft, t.lineCount(q.line_count), q.version > 1 ? t.version(q.version) : null]
      .filter(Boolean)
      .join(" · ");
  }
  if (q.status === "envoye" && q.sent_at) {
    return t.sentOn(formatDayMonthNumeric(q.sent_at), formatTime(q.sent_at));
  }
  return t.statuses[q.status];
}

/** Icône de la ligne : verte une fois signé, rouge si refusé, bleue sinon (maquette « Nette »). */
const iconTone = (status: ArtisanQuote["status"]): ListTone =>
  status === "signe" ? "success" : status === "refuse" ? "danger" : "primary";

/**
 * Devis de l'artisan, en lignes comme sur le site (ADR 0189) : chiffres clés (en attente de
 * signature, à envoyer, taux de signature, calculs de @menao/core), puis « À envoyer »
 * (brouillons, vers la préparation du devis) et « Envoyés » (vers le chantier). Dans l'onglet
 * Argent (ADR 0188), sous les onglets Devis · Factures · Dépenses (`switcher`).
 */
export function ArtisanQuotesScreen({ switcher }: { switcher?: ReactNode }) {
  const [rows, reload] = useFocusData(loadArtisanQuotes, undefined, "tab:devis");
  const [tab, setTab] = useState<"a-envoyer" | "envoyes">("a-envoyer");
  // Squelette des lignes pendant le premier chargement, puis fondu (ADR 0192).
  const reveal = useReveal(rows !== undefined);

  if (rows === undefined) {
    return (
      <Screen>
        <TabHeader title={fr.tabs.money}>{switcher}</TabHeader>
        <FiguresSkeleton />
        <FiltersSkeleton />
        <ListRowsSkeleton rows={3} />
      </Screen>
    );
  }
  const drafts = (rows ?? []).filter((q) => q.status === "brouillon");
  const sent = (rows ?? []).filter((q) => q.status !== "brouillon");
  const list = tab === "a-envoyer" ? drafts : sent;
  const figures = quoteFigures(
    (rows ?? []).map((q) => ({
      status: q.status,
      totalTtcCents: q.total_ttc_cents,
      sentAt: q.sent_at,
    })),
  );

  return (
    <Screen onRefresh={reload}>
      <TabHeader title={fr.tabs.money}>{switcher}</TabHeader>
      <Animated.View entering={reveal} style={styles.revealed}>
        {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
        {rows ? (
          <MoneyFigures
            figures={[
              {
                label: t.figures.pending,
                value: formatCents(figures.pendingCents),
                hint: t.figures.pendingHint(figures.pendingCount),
              },
              {
                label: t.figures.toSend,
                value: String(figures.toSendCount),
                hint: t.figures.toSendHint,
              },
              {
                label: t.figures.signRate,
                value: figures.signRate === null ? t.figures.none : `${figures.signRate} %`,
                hint: t.figures.signRateHint,
              },
            ]}
          />
        ) : null}
        <ListFilters
          label={t.filtersLabel}
          value={tab}
          onChange={setTab}
          items={[
            { value: "a-envoyer", label: t.filterToSend, detail: String(drafts.length) },
            { value: "envoyes", label: t.filterSent, detail: String(sent.length) },
          ]}
        />
        {list.length === 0 ? (
          <EmptyState illustration="devis">
            {tab === "a-envoyer" ? t.emptyToSend : t.emptySent}
          </EmptyState>
        ) : (
          <ListGroup>
            {list.map((q) => (
              <ListRow
                key={q.quote_id}
                label={t.openQuote(q.title)}
                onPressIn={
                  q.status === "brouillon"
                    ? undefined
                    : () => prefetchChantier(q.chantier_id, q.title, q.client_name)
                }
                onPress={() =>
                  router.push(
                    q.status === "brouillon"
                      ? `/pro-chantier/${q.chantier_id}/devis`
                      : `/pro-chantier/${q.chantier_id}`,
                  )
                }
                title={q.title}
                detail={[
                  q.client_name,
                  q.numero && `N° ${q.numero}`,
                  q.status === "brouillon" && q.appointment_at
                    ? t.visit(formatDayMonthNumeric(q.appointment_at), formatTime(q.appointment_at))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                badge={isExampleId(q.quote_id) ? <ExampleBadge /> : undefined}
                icon={{ icon: FileText, tone: iconTone(q.status) }}
                value={q.line_count > 0 ? formatCents(q.total_ttc_cents) : undefined}
                status={{ text: statusText(q), tone: STATUS_TONE[q.status] }}
                statusBelow
              />
            ))}
          </ListGroup>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({ revealed: { gap: theme.spacing(4) } });
