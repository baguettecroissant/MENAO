import { router, useLocalSearchParams } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ArtisanCard } from "@/components/artisan-card";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadResults, type ProjectResults } from "@/lib/project";
import { Body, Card, LinkText, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.results;

/** Artisans proposés pour le projet (F-09). Fiche et envoi de la demande : partie 3 du lot 6b. */
export default function ProjetArtisans() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [results, setResults] = useState<ProjectResults | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadResults(id).then((found) => {
      if (active) setResults(found);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (results === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  return (
    <Screen header={<TopBar />}>
      {results === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <>
          <Card tone="soft">
            <View style={styles.summary}>
              <Sparkles size={16} color={theme.colors.primary} />
              <Text style={styles.summaryLabel}>{t.project}</Text>
              <LinkText label={t.edit} onPress={() => router.back()} />
            </View>
            <Text style={styles.summaryValue}>
              {results.city
                ? t.projectSummary(results.tradeLabel, results.city)
                : results.tradeLabel}
            </Text>
          </Card>
          <Title>{results.artisans.length ? t.title : t.noneTitle}</Title>
          <Body muted>{results.artisans.length ? t.found(results.artisans.length) : t.none}</Body>
          {results.artisans.map((artisan) => (
            <ArtisanCard
              key={artisan.id}
              artisan={artisan}
              tradeLabel={results.tradeLabel}
              projectWorkTypes={results.workTypeCodes}
            />
          ))}
          <Notice tone="info">{t.nextStep}</Notice>
        </>
      )}
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
  summary: { flexDirection: "row", alignItems: "center", gap: theme.spacing(2) },
  summaryLabel: {
    flex: 1,
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors["primary-strong"],
  },
  summaryValue: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
});
