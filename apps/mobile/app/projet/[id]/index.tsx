import { AI_CONFIDENCE_THRESHOLD } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { CriteriaReview } from "@/components/criteria-review";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import {
  loadProject,
  loadProjectPhotos,
  type ProjectForReview,
  type ProjectPhoto,
} from "@/lib/project";
import { Notice, Screen, ScreenSkeleton } from "@/ui";

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
        if (!active) return;
        // Lot d'un chantier à plusieurs métiers (ADR 0167) : ses critères sont ceux du chantier.
        if (project?.parentId) {
          router.replace({ pathname: "/projet/[id]", params: { id: project.parentId } });
          return;
        }
        setLoaded({ project, photos });
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  if (loaded === undefined) return <ScreenSkeleton header={<TopBar />} />;
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
