import {
  MAX_ARTISANS_PER_REQUEST,
  MAX_SEARCH_RESULTS,
  joinNames,
  showWiderZone,
} from "@menao/core";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ArtisanTile, HelpTile, TILE_WIDTH, type CardSelection } from "@/components/artisan-card";
import { LotStart } from "@/components/lot-start";
import { NeedSummaryBand } from "@/components/need-summary";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadResults, type MatchedArtisan, type ProjectResults } from "@/lib/project";
import { loadProjectRequests, sendScreenParams, type ProjectRequests } from "@/lib/requests";
import { Body, Button, LinkText, Notice, Screen, ScreenSkeleton, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.results;
const s = fr.selection;
const GAP = theme.spacing(3);

/**
 * Artisans proposés pour le projet (F-09) : fiche de chacun, et sélection de 3 artisans au plus
 * (moins ceux déjà sollicités) avant l'envoi de la demande (F-11). Dans un chantier à plusieurs
 * métiers, les artisans des autres métiers se cochent ici aussi, pour un seul envoi (ADR 0170).
 */
export default function ProjetArtisans() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<
    { results: ProjectResults | null; requests: ProjectRequests } | undefined
  >(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  // Artisans cochés dans les autres métiers, par lot (ADR 0170).
  const [lotSelected, setLotSelected] = useState<Record<string, string[]>>({});
  // Groupe dont les places sont toutes prises : "" pour le métier principal, sinon le lot.
  const [limitReached, setLimitReached] = useState<string | null>(null);

  // Rechargé à chaque retour sur l'écran (demande envoyée depuis la fiche d'un artisan) et après
  // la modification de la date d'un lot (ADR 0169).
  const load = useCallback(() => {
    let active = true;
    Promise.all([loadResults(id), loadProjectRequests(id)]).then(([results, requests]) => {
      if (!active) return;
      setData({ results, requests });
      setSelected((current) => current.filter((a) => !requests.requested.has(a)));
      setLotSelected((current) =>
        Object.fromEntries(
          (results?.lots ?? []).map((lot) => [
            lot.id,
            (current[lot.id] ?? []).filter((a) => !lot.requested.has(a)),
          ]),
        ),
      );
    });
    return () => {
      active = false;
    };
  }, [id]);
  useFocusEffect(load);

  if (data === undefined) return <ScreenSkeleton header={<TopBar />} />;
  const { results, requests } = data;
  if (results === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.error}</Notice>
      </Screen>
    );
  }

  function toggle(artisanId: string) {
    if (selected.includes(artisanId)) {
      setLimitReached(null);
      return setSelected(selected.filter((a) => a !== artisanId));
    }
    if (selected.length >= requests.slots) return setLimitReached("");
    setLimitReached(null);
    setSelected([...selected, artisanId]);
  }

  function selectionOf(artisanId: string): CardSelection {
    if (requests.requested.has(artisanId)) return "sent";
    if (selected.includes(artisanId)) return "selected";
    return requests.slots > 0 ? "selectable" : "none";
  }

  type Lot = NonNullable<typeof results>["lots"][number];
  function toggleLot(lot: Lot, artisanId: string) {
    const current = lotSelected[lot.id] ?? [];
    if (current.includes(artisanId)) {
      setLimitReached(null);
      return setLotSelected({ ...lotSelected, [lot.id]: current.filter((a) => a !== artisanId) });
    }
    if (current.length >= Math.min(lot.slots, MAX_ARTISANS_PER_REQUEST)) {
      return setLimitReached(lot.id);
    }
    setLimitReached(null);
    setLotSelected({ ...lotSelected, [lot.id]: [...current, artisanId] });
  }

  function lotSelectionOf(lot: Lot, artisanId: string): CardSelection {
    if (lot.requested.has(artisanId)) return "sent";
    if ((lotSelected[lot.id] ?? []).includes(artisanId)) return "selected";
    return lot.slots > 0 ? "selectable" : "none";
  }

  const lotChoices = results.lots
    .map((lot) => ({ projectId: lot.id, artisanIds: lotSelected[lot.id] ?? [] }))
    .filter((lot) => lot.artisanIds.length > 0);
  const total = selected.length + lotChoices.reduce((n, lot) => n + lot.artisanIds.length, 0);
  const severalTrades = results.lots.some(
    (lot) => (lot.artisans.length > 0 || lot.recommended.length > 0) && lot.slots > 0,
  );

  const rootTile = (artisan: MatchedArtisan, recommendedBy?: string | null) => (
    <ArtisanTile
      key={artisan.id}
      artisan={artisan}
      tradeLabel={results.tradeLabel}
      projectWorkTypes={results.workTypeCodes}
      selection={selectionOf(artisan.id)}
      onToggle={() => toggle(artisan.id)}
      recommendedBy={recommendedBy}
      onOpen={() =>
        router.push({
          pathname: "/projet/[id]/artisan/[artisanId]",
          params: {
            id,
            artisanId: artisan.id,
            // La fiche propose l'envoi seulement si une place reste et l'artisan n'est pas sollicité.
            canRequest: requests.slots > 0 && !requests.requested.has(artisan.id) ? "1" : "0",
          },
        })
      }
    />
  );
  const lotTile = (lot: Lot, artisan: MatchedArtisan, recommendedBy?: string | null) => (
    <ArtisanTile
      key={artisan.id}
      artisan={artisan}
      tradeLabel={lot.trade}
      projectWorkTypes={lot.workTypeCodes}
      selection={lotSelectionOf(lot, artisan.id)}
      onToggle={() => toggleLot(lot, artisan.id)}
      otherTrade
      recommendedBy={recommendedBy}
      onOpen={() =>
        router.push({
          pathname: "/projet/[id]/artisan/[artisanId]",
          params: {
            id: lot.id,
            artisanId: artisan.id,
            canRequest: lot.slots > 0 && !lot.requested.has(artisan.id) ? "1" : "0",
          },
        })
      }
    />
  );

  // Zone élargie (ADR 0165) : plus aucun artisan de la zone à contacter.
  const wider = showWiderZone({
    inZoneToContact: results.artisans.filter((a) => !requests.requested.has(a.id)).length,
    slots: requests.slots,
    nearby: results.nearby.length,
  })
    ? results.nearby.slice(0, MAX_SEARCH_RESULTS)
    : [];
  const shown = [...results.artisans, ...wider];
  const empty = results.artisans.length === 0;

  const send = () =>
    router.push({
      pathname: "/projet/[id]/envoyer",
      params: sendScreenParams(id, selected, lotChoices),
    });

  return (
    <Screen
      band={
        <NeedSummaryBand
          summary={results.summary}
          onEdit={() => router.dismissTo({ pathname: "/projet/[id]", params: { id } })}
        />
      }
      footer={total > 0 ? <Button label={s.submit(total)} onPress={send} /> : undefined}
    >
      {results.parentId ? <Notice tone="info">{t.lots.lotOf(results.tradeLabel)}</Notice> : null}
      {results.parentId ? (
        <LinkText
          label={t.lots.back}
          onPress={() =>
            router.push({
              pathname: "/projet/[id]/artisans",
              params: { id: results.parentId ?? id },
            })
          }
        />
      ) : null}
      <Title>{!empty ? t.title : wider.length ? t.wider.emptyTitle : t.noneTitle}</Title>
      <Body muted>
        {!empty ? t.found(results.artisans.length) : wider.length ? t.wider.emptyLead : t.none}
      </Body>
      {!empty && wider.length > 0 ? <Notice tone="info">{t.wider.lead}</Notice> : null}
      {requests.pendingNames.length > 0 && (
        <Notice tone="success">{s.sentBanner(joinNames(requests.pendingNames))}</Notice>
      )}
      {shown.length > 0 &&
        (requests.slots > 0 ? (
          <Body muted>{severalTrades ? s.hintLots : s.hint}</Body>
        ) : (
          <Notice tone="info">{s.noSlot}</Notice>
        ))}
      {limitReached === "" && <Notice tone="info">{s.limit}</Notice>}
      {/* Partenaires recommandés par un artisan du chantier (ADR 0174), hors du classement. */}
      {results.recommended.length > 0 ? (
        <View style={styles.recommended}>
          <Text role="heading" style={styles.lotsHeading}>
            {t.recommended.title}
          </Text>
          <Body muted>{t.recommended.lead}</Body>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TILE_WIDTH + GAP}
            decelerationRate="fast"
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
          >
            {results.recommended.map((r) => rootTile(r.artisan, r.by))}
          </ScrollView>
        </View>
      ) : null}
      {/* Carrousel de la maquette « Résultat de recherche - in app », bord à bord. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TILE_WIDTH + GAP}
        decelerationRate="fast"
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {shown.map((artisan) => rootTile(artisan))}
        <HelpTile
          onPress={() => router.push({ pathname: "/projet/[id]/dossier", params: { id } })}
        />
      </ScrollView>
      {results.lots.length > 0 ? (
        <View style={styles.lots}>
          <Text role="heading" style={styles.lotsHeading}>
            {t.lots.title}
          </Text>
          {results.workOrder.length > 1 ? (
            <Text style={styles.lotFound}>{t.lots.workOrder(results.workOrder.join(", "))}</Text>
          ) : null}
          {results.lots.map((lot) => (
            <View key={lot.id} style={styles.lot}>
              <View style={styles.lotRow}>
                <View style={styles.lotText}>
                  <Text role="heading" style={styles.lotTrade}>
                    {lot.trade}
                  </Text>
                  <Text style={styles.lotFound}>
                    {lot.sent ? t.lots.sent : t.lots.found(lot.found)}
                  </Text>
                </View>
                {/* Pas d'artisan de la zone : la page du métier propose ceux d'un peu plus loin. */}
                {lot.artisans.length === 0 ? (
                  <LinkText
                    label={t.lots.see}
                    onPress={() =>
                      router.push({ pathname: "/projet/[id]/artisans", params: { id: lot.id } })
                    }
                  />
                ) : null}
              </View>
              {lot.tradeCode ? (
                <LotStart
                  projectId={id}
                  tradeCode={lot.tradeCode}
                  trade={lot.trade}
                  dateMode={lot.dateMode}
                  dateSouhaitee={lot.dateSouhaitee}
                  own={lot.own}
                  editable={!lot.sent}
                  onSaved={load}
                />
              ) : null}
              {limitReached === lot.id && <Notice tone="info">{s.limitLots}</Notice>}
              {lot.artisans.length > 0 || lot.recommended.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={TILE_WIDTH + GAP}
                  decelerationRate="fast"
                  style={styles.carousel}
                  contentContainerStyle={styles.carouselContent}
                >
                  {/* Partenaires recommandés (ADR 0174), avant les artisans du classement. */}
                  {lot.recommended.map((r) => lotTile(lot, r.artisan, r.by))}
                  {lot.artisans.map((artisan) => lotTile(lot, artisan))}
                </ScrollView>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  recommended: { gap: theme.spacing(2) },
  lots: { gap: theme.spacing(3), paddingTop: theme.spacing(2) },
  lotsHeading: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
  lot: {
    gap: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing(2.5),
  },
  lotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(3),
  },
  lotText: { flex: 1, gap: theme.spacing(0.5) },
  lotTrade: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors.foreground },
  lotFound: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors["muted-foreground"],
  },
  // Le carrousel déborde des marges de l'écran, les cartes restent alignées sur le texte.
  carousel: { marginHorizontal: -theme.spacing(5), flexGrow: 0 },
  carouselContent: {
    gap: GAP,
    paddingHorizontal: theme.spacing(5),
    paddingVertical: theme.spacing(1),
    alignItems: "stretch",
  },
});
