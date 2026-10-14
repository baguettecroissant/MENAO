import { artisanSelectionSchema } from "@menao/validation";
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
import { Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;

/**
 * Envoi de la demande (F-11), précédé si besoin de la création du compte ou de la connexion
 * (F-08). Les artisans choisis arrivent dans l'adresse (`artisans`, séparés par des virgules).
 */
export default function Envoyer() {
  const { id, artisans } = useLocalSearchParams<{ id: string; artisans?: string }>();
  const selection = artisanSelectionSchema.safeParse((artisans ?? "").split(",").filter(Boolean));
  const artisanIds = selection.success ? selection.data : [];
  const { signedIn, role } = useSession();

  let content;
  if (!selection.success) content = <Notice tone="error">{r.nothingToSend}</Notice>;
  else if (!signedIn) return <AccountScreen projectId={id} artisanIds={artisanIds} />;
  else if (role !== "particulier") content = <Notice tone="error">{r.notParticulier}</Notice>;
  else return <SignedInSend projectId={id} artisanIds={artisanIds} />;
  return <Screen header={<TopBar />}>{content}</Screen>;
}

/**
 * Création du compte ou connexion avant l'envoi (maquette « Dernière étape ») : le résumé du besoin
 * reste en haut, comme sur le formulaire d'envoi. Le projet appartient à la session anonyme (RLS).
 */
function AccountScreen({ projectId, artisanIds }: { projectId: string; artisanIds: string[] }) {
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

  if (summary === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  const step = <AccountStep projectId={projectId} artisanIds={artisanIds} />;
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
function SignedInSend({ projectId, artisanIds }: { projectId: string; artisanIds: string[] }) {
  const key = artisanIds.join(",");
  const [loaded, setLoaded] = useState<
    { context: SendContext | null; summary: NeedSummary | null } | undefined
  >(undefined);

  useEffect(() => {
    let active = true;
    Promise.all([loadSendContext(projectId, key.split(",")), loadNeedSummary(projectId)]).then(
      ([context, summary]) => {
        if (active) setLoaded({ context, summary });
      },
    );
    return () => {
      active = false;
    };
  }, [projectId, key]);

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
