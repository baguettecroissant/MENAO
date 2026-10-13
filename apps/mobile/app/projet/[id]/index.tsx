import { AI_CONFIDENCE_THRESHOLD } from "@menao/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { CriteriaReview } from "@/components/criteria-review";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadProject, type ProjectForReview } from "@/lib/project";
import { Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

/** Critères d'un projet analysé (F-07). */
export default function ProjetCriteres() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectForReview | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadProject(id, AI_CONFIDENCE_THRESHOLD).then((found) => {
      if (active) setProject(found);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (project === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (project === null) {
    return (
      <Screen header={<TopBar title={fr.review.title} />}>
        <Notice tone="error">{fr.review.notFound}</Notice>
      </Screen>
    );
  }
  return <CriteriaReview project={project} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
