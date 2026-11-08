import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ArtisanProfileView } from "@/components/artisan-profile";
import { ActionSubmit } from "@/components/pro/action-kit";
import { FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadArtisanPage, type ArtisanPage } from "@/lib/requests";
import { Notice } from "@/ui";

/**
 * Fiche d'un artisan proposé pour le projet (F-10), avec l'envoi direct de la demande. Écran
 * « Nette » (lot 12, maquette « FicheParcoursNette » transposée) : barre de retour, grand en-tête
 * et rubriques en cartes, bouton bleu nuit collé en bas.
 */
export default function ArtisanFiche() {
  const { id, artisanId, canRequest } = useLocalSearchParams<{
    id: string;
    artisanId: string;
    canRequest?: string;
  }>();
  const [page, setPage] = useState<ArtisanPage | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadArtisanPage(artisanId).then((found) => {
      if (active) setPage(found);
    });
    return () => {
      active = false;
    };
  }, [artisanId]);

  if (page === undefined) return <FicheSkeleton />;
  if (page === null) {
    return (
      <FicheScreen>
        <Notice tone="error">{fr.profile.notFound}</Notice>
      </FicheScreen>
    );
  }
  const request = canRequest === "1";
  return (
    <FicheScreen
      footer={
        request ? (
          <ActionSubmit
            label={fr.profile.request}
            variant="dark"
            onPress={() =>
              router.push({ pathname: "/projet/[id]/envoyer", params: { id, artisans: artisanId } })
            }
          />
        ) : undefined
      }
    >
      <ArtisanProfileView page={page} />
    </FicheScreen>
  );
}
