import {
  MAX_ARTISANS_PER_REQUEST,
  MAX_SEARCH_RESULTS,
  directRequest,
  joinNames,
  showWiderZone,
} from "@menao/core";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArtisanPickCard, HelpCard, type CardSelection } from "@/components/artisan-card";
import { LotStart } from "@/components/lot-start";
import { NeedSummaryBand } from "@/components/need-summary";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { FicheLink, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadResults, type MatchedArtisan, type ProjectResults } from "@/lib/project";
import { loadProjectRequests, sendScreenParams, type ProjectRequests } from "@/lib/requests";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.results;
const s = fr.selection;
const { colors, font, spacing } = theme;

/**
 * Artisans proposés pour le projet (F-09) : fiche de chacun, et sélection de 3 artisans au plus
 * (moins ceux déjà sollicités) avant l'envoi de la demande (F-11). Dans un chantier à plusieurs
 * métiers, les artisans des autres métiers se cochent ici aussi, pour un seul envoi (ADR 0170).
 * Écran « Nette » (lot 12, maquette « ResultatsApp ») : résumé du besoin en haut, grand titre,
 * une carte par artisan avec son rond de sélection, et barre collée en bas (« N sélectionnés sur
 * 3 » et bouton d'envoi).
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
  // Demande directe (ADR 0198) : l'artisan choisi est coché d'office, une seule fois.
  const preselected = useRef(false);

  // Rechargé à chaque retour sur l'écran (demande envoyée depuis la fiche d'un artisan) et après
  // la modification de la date d'un lot (ADR 0169).
  const load = useCallback(() => {
    let active = true;
    Promise.all([loadResults(id), loadProjectRequests(id)]).then(([results, requests]) => {
      if (!active) return;
      setData({ results, requests });
      const chosen = results?.preferred?.id ?? null;
      const preselect =
        chosen !== null &&
        !preselected.current &&
        directRequest({ matches: true, status: requests.sentTo.get(chosen)?.status ?? null }) ===
          "a_envoyer";
      if (preselect) preselected.current = true;
      setSelected((current) => {
        const kept = current.filter((a) => !requests.requested.has(a));
        return preselect && !kept.includes(chosen) ? [chosen, ...kept] : kept;
      });
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

  if (data === undefined) return <FicheSkeleton />;
  const { results, requests } = data;
  if (results === null) {
    return (
      <ActionScreen title={t.noneTitle}>
        <Notice tone="error">{t.error}</Notice>
      </ActionScreen>
    );
  }

  // « Redemander un devis » ou fiche publique (ADR 0173, 0198) : la demande ne part qu'à l'artisan
  // choisi ; la liste revient s'il refuse ou laisse passer les 72 h.
  const preferredRequest = results.preferredId
    ? requests.sentTo.get(results.preferredId)
    : undefined;
  const direct = directRequest(
    results.preferredId
      ? { matches: results.preferred !== null, status: preferredRequest?.status ?? null }
      : null,
  );
  const directName = results.preferredName ?? preferredRequest?.name ?? "";

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
    <ArtisanPickCard
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
    <ArtisanPickCard
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
  const wider =
    !direct &&
    showWiderZone({
      inZoneToContact: results.artisans.filter((a) => !requests.requested.has(a.id)).length,
      slots: requests.slots,
      nearby: results.nearby.length,
    })
      ? results.nearby.slice(0, MAX_SEARCH_RESULTS)
      : [];
  const shown = direct
    ? results.preferred
      ? [results.preferred]
      : []
    : [...results.artisans, ...wider];
  const empty = results.artisans.length === 0;

  const send = () =>
    router.push({
      pathname: "/projet/[id]/envoyer",
      params: sendScreenParams(id, selected, lotChoices),
    });

  // Compteur de la maquette, pour le seul métier principal (3 places au plus par métier).
  const countNote =
    !direct && lotChoices.length === 0 ? s.count(selected.length, requests.slots) : undefined;

  return (
    <ActionScreen
      band={
        <NeedSummaryBand
          summary={results.summary}
          onEdit={() => router.dismissTo({ pathname: "/projet/[id]", params: { id } })}
        />
      }
      title={
        direct
          ? t.direct.title(directName)
          : !empty
            ? t.title
            : wider.length
              ? t.wider.emptyTitle
              : t.noneTitle
      }
      lead={
        direct === "a_envoyer"
          ? t.direct.lead(directName)
          : direct === "envoyee"
            ? t.direct.sentLead(directName)
            : !empty
              ? t.found(results.artisans.length)
              : wider.length
                ? t.wider.emptyLead
                : t.none
      }
      footer={
        total > 0 ? (
          <ActionSubmit
            label={
              direct && lotChoices.length === 0 ? t.direct.submit(directName) : s.submit(total)
            }
            note={countNote}
            onPress={send}
          />
        ) : undefined
      }
    >
      {results.parentId ? <Notice tone="info">{t.lots.lotOf(results.tradeLabel)}</Notice> : null}
      {results.parentId ? (
        <FicheLink
          icon={ArrowLeft}
          label={t.lots.back}
          onPress={() =>
            router.push({
              pathname: "/projet/[id]/artisans",
              params: { id: results.parentId ?? id },
            })
          }
        />
      ) : null}
      {!direct && results.preferredId && !results.preferred && results.preferredName ? (
        <Notice tone="info">{t.knownUnavailable(results.preferredName)}</Notice>
      ) : null}
      {!empty && wider.length > 0 ? <Notice tone="info">{t.wider.lead}</Notice> : null}
      {requests.pendingNames.length > 0 && (
        <Notice tone="success">{s.sentBanner(joinNames(requests.pendingNames))}</Notice>
      )}
      {direct ? (
        severalTrades ? (
          <Text style={styles.hint}>{s.hintLots}</Text>
        ) : null
      ) : (
        shown.length > 0 &&
        (requests.slots > 0 ? (
          <Text style={styles.hint}>{severalTrades ? s.hintLots : s.hint}</Text>
        ) : (
          <Notice tone="info">{s.noSlot}</Notice>
        ))
      )}
      {limitReached === "" && <Notice tone="info">{s.limit}</Notice>}
      {/* Partenaires recommandés par un artisan du chantier (ADR 0174), hors du classement. */}
      {results.recommended.length > 0 ? (
        <View style={styles.group}>
          <Text role="heading" style={styles.heading}>
            {t.recommended.title}
          </Text>
          <Text style={styles.hint}>{t.recommended.lead}</Text>
          {results.recommended.map((r) => rootTile(r.artisan, r.by))}
        </View>
      ) : null}
      {/* Une carte par artisan (maquette « ResultatsApp »). */}
      <View style={styles.list}>
        {shown.map((artisan) => rootTile(artisan))}
        {/* Demande directe (ADR 0198) : le client a déjà choisi son artisan. */}
        {direct ? null : (
          <HelpCard
            onPress={() => router.push({ pathname: "/projet/[id]/dossier", params: { id } })}
          />
        )}
      </View>
      {results.lots.length > 0 ? (
        <View style={styles.lots}>
          <Text role="heading" style={styles.heading}>
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
                  <FicheLink
                    icon={ChevronRight}
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
              {/* Partenaires recommandés (ADR 0174), avant les artisans du classement. */}
              {lot.recommended.map((r) => lotTile(lot, r.artisan, r.by))}
              {lot.artisans.map((artisan) => lotTile(lot, artisan))}
            </View>
          ))}
        </View>
      ) : null}
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  group: { gap: spacing(2.5) },
  list: { gap: spacing(3) },
  lots: { gap: spacing(3), paddingTop: spacing(2) },
  heading: {
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  lot: {
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  lotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  lotText: { flex: 1, gap: spacing(0.5) },
  lotTrade: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
  lotFound: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
