import { artisanSelectionSchema } from "@menao/validation";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AccountStep } from "@/components/account-step";
import { RequestForm } from "@/components/request-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
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
  else if (!signedIn) content = <AccountStep projectId={id} artisanIds={artisanIds} />;
  else if (role !== "particulier") content = <Notice tone="error">{r.notParticulier}</Notice>;
  else return <SignedInSend projectId={id} artisanIds={artisanIds} />;
  return <Screen header={<TopBar />}>{content}</Screen>;
}

/** Formulaire d'envoi d'un particulier connecté : artisans encore joignables et coordonnées. */
function SignedInSend({ projectId, artisanIds }: { projectId: string; artisanIds: string[] }) {
  const key = artisanIds.join(",");
  const [context, setContext] = useState<SendContext | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadSendContext(projectId, key.split(",")).then((found) => {
      if (active) setContext(found);
    });
    return () => {
      active = false;
    };
  }, [projectId, key]);

  if (context === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  return (
    <Screen header={<TopBar />}>
      {context ? (
        <RequestForm projectId={projectId} context={context} />
      ) : (
        <Notice tone="info">{r.nothingToSend}</Notice>
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
});
