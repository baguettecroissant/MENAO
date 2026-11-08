import {
  CHANTIER_PHASES,
  chantierFigures,
  chantierPhase,
  isChantierFinished,
  type ChantierPhase,
  type ChantierStatus,
} from "@menao/core";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/empty-state";
import { SpaceExamplesNotice } from "@/components/examples";
import { FigureStrip, GroupTitle, ListFilters, ListGroup } from "@/components/list-kit";
import { ChantierListRow } from "@/components/pro/chantier-row";
import { ChantierCardsSkeleton } from "@/components/skeletons";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { exampleChantierList } from "@/lib/example-data";
import { loadSpaceExamplesShown } from "@/lib/examples";
import { PREFETCH_DELAY_MS, PREFETCH_FIRST, prefetchChantier } from "@/lib/prefetch";
import { loadArtisanChantiers, type ArtisanChantierRow } from "@/lib/pro-chantiers";
import { useTeamPosition } from "@/lib/team";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, useReveal } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proChantiers;
const { colors, spacing } = theme;

type Filter = "tous" | ChantierPhase;

/**
 * Onglet « Chantiers » de l'artisan (F-18), refonte « Nette » (lot 3) comme sur le site : trois
 * chiffres (rendez-vous, attente client, en travaux), filtres par phase en pastilles, puis une
 * ligne par chantier avec sa prochaine étape et son avancement. « Tous » : les chantiers en cours,
 * puis les terminés.
 */
export function ArtisanChantiersScreen({ switcher }: { switcher?: ReactNode }) {
  const [rows, reload] = useFocusData(loadArtisanChantiers, undefined, "tab:chantiers");
  // Rien reçu : chantiers d'exemple (ADR 0184), comme sur le site.
  const [examples, reloadExamples] = useFocusData(loadSpaceExamplesShown);
  const position = useTeamPosition();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("tous");
  // Squelette pendant le premier chargement, puis fondu (ADR 0192).
  const reveal = useReveal(rows !== undefined);
  // Premiers chantiers chargés d'avance : les ouvrir est instantané (ADR 0193).
  useEffect(() => {
    if (!rows?.length) return;
    const timer = setTimeout(() => {
      for (const r of rows.slice(0, PREFETCH_FIRST)) prefetchChantier(r.chantier_id, r.title);
    }, PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rows]);

  const showExamples = rows?.length === 0 && Boolean(examples);
  const list: ArtisanChantierRow[] = showExamples ? exampleChantierList() : (rows ?? []);
  const statusOf = (r: ArtisanChantierRow) => r.status as ChantierStatus;
  const figures = chantierFigures(
    list.map((r) => ({ status: statusOf(r), appointment_at: r.appointment_at })),
  );
  const counts = Object.fromEntries(
    CHANTIER_PHASES.map((p) => [p, list.filter((r) => chantierPhase(statusOf(r)) === p).length]),
  ) as Record<ChantierPhase, number>;
  // Filtre vidé entre deux chargements : retour à « Tous ».
  const active: Filter = filter !== "tous" && counts[filter] === 0 ? "tous" : filter;
  const shown =
    active === "tous"
      ? list.filter((r) => !isChantierFinished(statusOf(r)))
      : list.filter((r) => chantierPhase(statusOf(r)) === active);
  const finished = active === "tous" ? list.filter((r) => isChantierFinished(statusOf(r))) : [];
  const line = (r: ArtisanChantierRow) => (
    <ChantierListRow
      key={r.chantier_id}
      row={r}
      onPress={() => router.push(`/pro-chantier/${r.chantier_id}`)}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <TabHeader title={t.title}>{switcher}</TabHeader>
        {rows === undefined ? (
          <ChantierCardsSkeleton />
        ) : (
          <Animated.View entering={reveal} style={styles.list}>
            {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
            {showExamples ? (
              <SpaceExamplesNotice onHidden={() => void reloadExamples()} />
            ) : rows?.length === 0 ? (
              <EmptyState illustration="chantiers">
                {/* Ouvrier (ADR 0241) : seulement les chantiers qui lui sont attribués. */}
                {position === "ouvrier" ? fr.proDashboard.worker.empty : t.empty}
              </EmptyState>
            ) : null}
            {list.length > 0 ? (
              <>
                <FigureStrip
                  label={t.figures.label}
                  figures={[
                    { label: t.figures.appointments, value: String(figures.appointmentCount) },
                    {
                      label: t.figures.waiting,
                      value: String(figures.quotesToSign + figures.depositsDue),
                    },
                    { label: t.figures.works, value: String(figures.planned + figures.ongoing) },
                  ]}
                />
                <ListFilters
                  chips
                  label={t.filtersLabel}
                  value={active}
                  onChange={setFilter}
                  items={[
                    { value: "tous", label: t.filters.tous, detail: String(list.length) },
                    ...CHANTIER_PHASES.filter((p) => counts[p] > 0).map((p) => ({
                      value: p,
                      label: t.filters[p],
                      detail: String(counts[p]),
                    })),
                  ]}
                />
              </>
            ) : null}
            {shown.length > 0 ? <ListGroup>{shown.map(line)}</ListGroup> : null}
            {finished.length > 0 ? (
              <>
                <GroupTitle title={t.finishedTitle} count={finished.length} />
                <ListGroup>{finished.map(line)}</ListGroup>
              </>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  list: { gap: spacing(4) },
});
