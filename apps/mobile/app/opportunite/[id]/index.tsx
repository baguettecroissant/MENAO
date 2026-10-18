import { timeLeft } from "@menao/core";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Clock } from "lucide-react-native";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { HeaderBand } from "@/components/header-band";
import { ClientReputationCard } from "@/components/pro/client-reputation-card";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadOpportunity } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, ScreenSkeleton } from "@/ui";
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
  const { detail: r, photoUrls, reputation } = opportunity;
  if (r.chantier_id) return <Redirect href={`/pro-chantier/${r.chantier_id}`} />;

  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée sans rendez-vous (ADR 0016) : on peut encore agir.
  const open = (r.status === "envoyee" && left !== null) || r.status === "acceptee";

  return (
    <Screen
      band={
        <HeaderBand
          title={r.summary || r.trade || t.title}
          meta={left ? [{ icon: Clock, text: t.timeLeft(left.hours, left.minutes) }] : []}
        >
          {open ? (
            <View style={styles.expertise}>
              <Button
                label={fr.proExpertise.open}
                variant="secondary"
                onPress={() => router.push(`/opportunite/${id}/expertise`)}
              />
            </View>
          ) : null}
        </HeaderBand>
      }
      footer={
        open ? (
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
                onPress={() => router.push(`/opportunite/${id}/refuser`)}
              />
            ) : null}
          </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  actions: { gap: spacing(1) },
  expertise: { paddingBottom: spacing(3) },
});
