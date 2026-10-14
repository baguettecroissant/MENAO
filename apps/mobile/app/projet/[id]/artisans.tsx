import { joinNames } from "@menao/core";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { ArtisanTile, HelpTile, TILE_WIDTH, type CardSelection } from "@/components/artisan-card";
import { NeedSummaryBand } from "@/components/need-summary";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadResults, type ProjectResults } from "@/lib/project";
import { loadProjectRequests, type ProjectRequests } from "@/lib/requests";
import { Body, Button, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.results;
const s = fr.selection;
const GAP = theme.spacing(3);

/**
 * Artisans proposés pour le projet (F-09) : fiche de chacun, et sélection de 3 artisans au plus
 * (moins ceux déjà sollicités) avant l'envoi de la demande (F-11).
 */
export default function ProjetArtisans() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<
    { results: ProjectResults | null; requests: ProjectRequests } | undefined
  >(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [limitReached, setLimitReached] = useState(false);

  // Rechargé à chaque retour sur l'écran (demande envoyée depuis la fiche d'un artisan).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([loadResults(id), loadProjectRequests(id)]).then(([results, requests]) => {
        if (!active) return;
        setData({ results, requests });
        setSelected((current) => current.filter((a) => !requests.requested.has(a)));
      });
      return () => {
        active = false;
      };
    }, [id]),
  );

  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
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
      setLimitReached(false);
      return setSelected(selected.filter((a) => a !== artisanId));
    }
    if (selected.length >= requests.slots) return setLimitReached(true);
    setLimitReached(false);
    setSelected([...selected, artisanId]);
  }

  function selectionOf(artisanId: string): CardSelection {
    if (requests.requested.has(artisanId)) return "sent";
    if (selected.includes(artisanId)) return "selected";
    return requests.slots > 0 ? "selectable" : "none";
  }

  const send = (artisanIds: string[]) =>
    router.push({
      pathname: "/projet/[id]/envoyer",
      params: { id, artisans: artisanIds.join(",") },
    });

  return (
    <Screen
      band={
        <NeedSummaryBand
          summary={results.summary}
          onEdit={() => router.dismissTo({ pathname: "/projet/[id]", params: { id } })}
        />
      }
      footer={
        selected.length > 0 ? (
          <Button label={s.submit(selected.length)} onPress={() => send(selected)} />
        ) : undefined
      }
    >
      <Title>{results.artisans.length ? t.title : t.noneTitle}</Title>
      <Body muted>{results.artisans.length ? t.found(results.artisans.length) : t.none}</Body>
      {requests.pendingNames.length > 0 && (
        <Notice tone="success">{s.sentBanner(joinNames(requests.pendingNames))}</Notice>
      )}
      {results.artisans.length > 0 &&
        (requests.slots > 0 ? (
          <Body muted>{s.hint}</Body>
        ) : (
          <Notice tone="info">{s.noSlot}</Notice>
        ))}
      {limitReached && <Notice tone="info">{s.limit}</Notice>}
      {/* Carrousel de la maquette « Résultat de recherche - in app », bord à bord. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TILE_WIDTH + GAP}
        decelerationRate="fast"
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {results.artisans.map((artisan) => (
          <ArtisanTile
            key={artisan.id}
            artisan={artisan}
            tradeLabel={results.tradeLabel}
            projectWorkTypes={results.workTypeCodes}
            selection={selectionOf(artisan.id)}
            onToggle={() => toggle(artisan.id)}
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
        ))}
        <HelpTile
          onPress={() => router.push({ pathname: "/projet/[id]/dossier", params: { id } })}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
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
