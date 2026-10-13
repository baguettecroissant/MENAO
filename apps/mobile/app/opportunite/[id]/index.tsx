import { timeLeft } from "@menao/core";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Clock } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadOpportunity } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { colors, font, spacing } = theme;

/**
 * Opportunité (F-17), comme sur le site (maquette « Vue d'une opportunité ») : client, adresse,
 * description, date souhaitée, message ; puis « Fixer un rendez-vous » ou « Refuser le chantier ».
 * Une fois le rendez-vous fixé, la demande s'ouvre sur la vue du chantier (F-18).
 */
export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadOpportunity(id), [id]);
  const [opportunity] = useFocusData(load);

  if (opportunity === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (opportunity === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }
  const { detail: r, photoUrls } = opportunity;
  if (r.chantier_id) return <Redirect href={`/pro-chantier/${r.chantier_id}`} />;

  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée sans rendez-vous (ADR 0016) : on peut encore agir.
  const open = (r.status === "envoyee" && left !== null) || r.status === "acceptee";

  return (
    <Screen
      header={<TopBar />}
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
                variant="ghost"
                onPress={() => router.push(`/opportunite/${id}/refuser`)}
              />
            ) : null}
          </View>
        ) : undefined
      }
    >
      <View style={styles.head}>
        <Title>{r.summary || r.trade || t.title}</Title>
        <View style={styles.tags}>
          <StatusPill
            text={t.status[r.status]}
            tone={r.status === "envoyee" ? "primary" : "neutral"}
          />
          {r.urgence ? <StatusPill text={t.urgent} tone="danger" /> : null}
        </View>
        {left ? (
          <View style={styles.row}>
            <Clock size={14} color={colors["muted-foreground"]} />
            <Text style={styles.meta}>{t.timeLeft(left.hours, left.minutes)}</Text>
          </View>
        ) : null}
      </View>
      <RequestBlocks detail={r} photoUrls={photoUrls} variant="opportunite" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  head: { gap: spacing(2) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  actions: { gap: spacing(1) },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
