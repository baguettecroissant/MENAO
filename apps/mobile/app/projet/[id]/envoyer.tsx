import { artisanSelectionSchema, lotSelectionSchema, type LotSelection } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AccountStep } from "@/components/account-step";
import { NeedSummaryBand } from "@/components/need-summary";
import { RequestForm } from "@/components/request-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadNeedSummary, type NeedSummary } from "@/lib/project";
import { loadSendContext, type SendContext } from "@/lib/requests";
import { useSession } from "@/lib/session";
import { Notice, Screen, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;

/**
 * Envoi de la demande (F-11), précédé si besoin de la création du compte ou de la connexion
 * (F-08). Les artisans choisis arrivent dans l'adresse (`artisans`, séparés par des virgules), et
 * ceux des autres métiers du chantier dans `lots` (« <lot>.<artisan> », ADR 0170).
 */
export default function Envoyer() {
  const { id, artisans, lots } = useLocalSearchParams<{
    id: string;
    artisans?: string;
    lots?: string;
  }>();
  const requested = (artisans ?? "").split(",").filter(Boolean);
  const lotValues = (lots ?? "").split(",").filter(Boolean);
  const lotSelection = lotSelectionSchema.safeParse(lotValues);
  // Seuls des artisans des autres métiers peuvent être choisis (aucun pour le métier principal).
  const selection =
    requested.length === 0 && lotValues.length > 0
      ? { success: true as const, data: [] as string[] }
      : artisanSelectionSchema.safeParse(requested);
  const valid = selection.success && lotSelection.success;
  const artisanIds = selection.success ? selection.data : [];
  const lotChoices = lotSelection.success ? lotSelection.data : [];
  const { signedIn, role } = useSession();

  let content;
  if (!valid) content = <Notice tone="error">{r.nothingToSend}</Notice>;
  else if (!signedIn) {
    return <AccountScreen projectId={id} artisanIds={artisanIds} lots={lotChoices} />;
  } else if (role !== "particulier") content = <Notice tone="error">{r.notParticulier}</Notice>;
  else return <SignedInSend projectId={id} artisanIds={artisanIds} lots={lotChoices} />;
  return <Screen header={<TopBar />}>{content}</Screen>;
}

/**
 * Création du compte ou connexion avant l'envoi (maquette « Dernière étape ») : le résumé du besoin
 * reste en haut, comme sur le formulaire d'envoi. Le projet appartient à la session anonyme (RLS).
 */
function AccountScreen({
  projectId,
  artisanIds,
  lots,
}: {
  projectId: string;
  artisanIds: string[];
  lots: LotSelection;
}) {
  const [summary, setSummary] = useState<NeedSummary | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadNeedSummary(projectId).then((found) => {
      if (active) setSummary(found);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  if (summary === undefined) return <ScreenSkeleton header={<TopBar />} />;
  const step = <AccountStep projectId={projectId} artisanIds={artisanIds} lots={lots} />;
  return summary ? (
    <Screen
      band={
        <NeedSummaryBand
          summary={summary}
          onEdit={() => router.dismissTo({ pathname: "/projet/[id]", params: { id: projectId } })}
        />
      }
    >
      {step}
    </Screen>
  ) : (
    <Screen header={<TopBar />}>{step}</Screen>
  );
}

/** Formulaire d'envoi d'un particulier connecté : artisans encore joignables et coordonnées. */
function SignedInSend({
  projectId,
  artisanIds,
  lots,
}: {
  projectId: string;
  artisanIds: string[];
  lots: LotSelection;
}) {
  const key = artisanIds.join(",");
  const lotKey = JSON.stringify(lots);
  const [loaded, setLoaded] = useState<
    { context: SendContext | null; summary: NeedSummary | null } | undefined
  >(undefined);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadSendContext(
        projectId,
        key.split(",").filter(Boolean),
        JSON.parse(lotKey) as LotSelection,
      ),
      loadNeedSummary(projectId),
    ]).then(([context, summary]) => {
      if (active) setLoaded({ context, summary });
    });
    return () => {
      active = false;
    };
  }, [projectId, key, lotKey]);

  if (loaded === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!loaded.context || !loaded.summary) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="info">{r.nothingToSend}</Notice>
      </Screen>
    );
  }
  return <RequestForm projectId={projectId} context={loaded.context} summary={loaded.summary} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
