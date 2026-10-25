import { isExampleId, timeLeft } from "@menao/core";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Clock } from "lucide-react-native";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { ExampleLock } from "@/components/examples";
import { HeaderBand } from "@/components/header-band";
import { ClientReputationCard } from "@/components/pro/client-reputation-card";
import { PartnerRecommendations } from "@/components/pro/partner-recommendations";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadOpportunity } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, LinkText, Notice, Screen, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { spacing } = theme;

/**
 * Opportunité (F-17), comme sur le site (maquette « Vue d'une opportunité ») : client, adresse,
 * description, date souhaitée, message, « Ce client sur MENAO » si l'équipe a rendu les notes
 * visibles (F-23) ; puis « Fixer un rendez-vous » ou « Refuser le chantier », et « Ce chantier a
 * besoin d'une expertise ». Une fois le rendez-vous fixé, la demande s'ouvre sur
 * la vue du chantier (F-18).
 */
export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadOpportunity(id), [id]);
  const [opportunity] = useFocusData(load, undefined, `opportunite:${id}`);

  if (opportunity === undefined) return <ScreenSkeleton header={<TopBar />} />;
  if (opportunity === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }
  const { detail: r, photoUrls, reputation, partners } = opportunity;
  if (r.chantier_id) return <Redirect href={`/pro-chantier/${r.chantier_id}`} />;

  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée sans rendez-vous (ADR 0016) : on peut encore agir.
  const open = (r.status === "envoyee" && left !== null) || r.status === "acceptee";
  // Exemple (ADR 0184) : mêmes blocs, actions inactives.
  const example = isExampleId(id);

  return (
    <Screen
      band={
        <HeaderBand
          title={r.summary || r.trade || t.title}
          meta={left ? [{ icon: Clock, text: t.timeLeft(left.hours, left.minutes) }] : []}
        >
          {open ? (
            <ExampleLock locked={example}>
              <View style={styles.expertise}>
                <Button
                  label={fr.proExpertise.open}
                  variant="secondary"
                  onPress={() => router.push(`/opportunite/${id}/expertise`)}
                />
              </View>
            </ExampleLock>
          ) : null}
        </HeaderBand>
      }
      footer={
        open ? (
          <ExampleLock locked={example} note>
            <View style={styles.actions}>
              <Button
                label={t.fixAppointment}
                onPress={() =>
                  router.push({
                    pathname: "/opportunite/[id]/rendez-vous",
                    params: { id, client: r.client.first_name ?? "" },
                  })
                }
              />
              {r.status === "envoyee" ? (
                <Button
                  label={t.refuse}
                  variant="danger"
                  onPress={() =>
                    router.push({
                      pathname: "/opportunite/[id]/refuser",
                      // Partenaires à recommander à sa place après le refus (ADR 0174).
                      params: { id, partenaires: partners.some((p) => p.sameProject) ? "1" : "" },
                    })
                  }
                />
              ) : null}
            </View>
          </ExampleLock>
        ) : undefined
      }
    >
      <View style={styles.tags}>
        <StatusPill
          text={t.status[r.status]}
          tone={r.status === "envoyee" ? "primary" : "neutral"}
        />
        {r.urgence ? <StatusPill text={t.urgent} tone="danger" /> : null}
      </View>
      <RequestBlocks detail={r} photoUrls={photoUrls} variant="opportunite" />
      {reputation ? <ClientReputationCard reputation={reputation} /> : null}
      {partners.length > 0 ? (
        <PartnerRecommendations
          requestId={r.id}
          clientFirstName={r.client.first_name}
          options={partners}
        />
      ) : null}
      <ExampleLock locked={example}>
        <LinkText
          label={fr.proFakeClient.open}
          onPress={() => router.push(`/opportunite/${id}/faux-particulier`)}
        />
      </ExampleLock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  actions: { gap: spacing(1) },
  expertise: { paddingBottom: spacing(3) },
});
