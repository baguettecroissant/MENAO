import { AI_CONFIDENCE_THRESHOLD } from "@menao/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { CriteriaReview } from "@/components/criteria-review";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import {
  loadProject,
  loadProjectPhotos,
  type ProjectForReview,
  type ProjectPhoto,
} from "@/lib/project";
import { Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

/** Critères d'un projet analysé (F-07), et ses photos (F-05). */
export default function ProjetCriteres() {
  const { id, photos: photosParam } = useLocalSearchParams<{ id: string; photos?: string }>();
  const [loaded, setLoaded] = useState<
    { project: ProjectForReview | null; photos: ProjectPhoto[] } | undefined
  >(undefined);

  useEffect(() => {
    let active = true;
    Promise.all([loadProject(id, AI_CONFIDENCE_THRESHOLD), loadProjectPhotos(id)]).then(
      ([project, photos]) => {
        if (active) setLoaded({ project, photos });
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  if (loaded === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (loaded.project === null) {
    return (
      <Screen header={<TopBar title={fr.review.title} />}>
        <Notice tone="error">{fr.review.notFound}</Notice>
      </Screen>
    );
  }
  return (
    <CriteriaReview
      project={loaded.project}
      photos={loaded.photos}
      photosFailed={photosParam === "erreur"}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
