import { isExampleId, timeLeft } from "@menao/core";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { CalendarDays, CircleHelp, Flag } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ExampleLock } from "@/components/examples";
import { ClientReputationCard } from "@/components/pro/client-reputation-card";
import {
  FicheButton,
  FicheHead,
  FicheLink,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { PartnerRecommendations } from "@/components/pro/partner-recommendations";
import { RequestBlocks, RequestCountdown } from "@/components/pro/request-blocks";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";
import { formatDayMonth } from "@/lib/format";
import { loadOpportunity, opportunityScreenKey } from "@/lib/pro-requests";
import { readScreenPreview } from "@/lib/screen-cache";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { colors, font, spacing } = theme;

/**
 * Fiche d'une demande (F-17), refonte « Nette » (F-92) : puces, titre, compte à rebours de la
 * réponse, « La demande en bref » (IA), ce que dit le client, détails du chantier, client,
 * réputation (F-23) et partenaires à recommander (ADR 0174) ; « Ce chantier a besoin d'une
 * expertise » et « Faux particulier » en liens discrets ; « Refuser » et « Fixer un rendez-vous »
 * (ou « Proposer des créneaux », ADR 0222) dans la barre fixée en bas. Une fois le rendez-vous
 * fixé, la demande s'ouvre sur la fiche du chantier (F-18).
 */
function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadOpportunity(id), [id]);
  const [opportunity] = useFocusData(load, undefined, opportunityScreenKey(id));

  if (opportunity === undefined) {
    return (
      <FicheSkeleton title={t.detailTitle} preview={readScreenPreview(opportunityScreenKey(id))} />
    );
  }
  if (opportunity === null) {
    return (
      <FicheScreen title={t.detailTitle}>
        <Notice tone="error">{t.notFound}</Notice>
      </FicheScreen>
    );
  }
  const { detail: r, photoUrls, reputation, partners } = opportunity;
  if (r.chantier_id) return <Redirect href={`/pro-chantier/${r.chantier_id}`} />;

  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée sans rendez-vous (ADR 0016) : on peut encore agir.
  const open = (r.status === "envoyee" && left !== null) || r.status === "acceptee";
  // Exemple (ADR 0184) : mêmes blocs, actions inactives.
  const example = isExampleId(id);
  const client = r.client.first_name ?? "";
  const meta = [
    r.client.first_name,
    [r.code_postal, r.ville_nom].filter(Boolean).join(" "),
    t.receivedOn(formatDayMonth(r.created_at)),
  ]
    .filter(Boolean)
    .join(" · ");

  const appointment = () =>
    router.push({ pathname: "/opportunite/[id]/rendez-vous", params: { id, client } });
  const propose = () =>
    router.push({ pathname: "/opportunite/[id]/creneaux", params: { id, client } });
  const refuse = () =>
    router.push({
      pathname: "/opportunite/[id]/refuser",
      // Partenaires à recommander à sa place après le refus (ADR 0174).
      params: { id, partenaires: partners.some((p) => p.sameProject) ? "1" : "" },
    });

  return (
    <FicheScreen
      title={t.detailTitle}
      footer={
        open ? (
          <ExampleLock locked={example} note>
            {r.status === "envoyee" ? (
              <View style={styles.decision}>
                <Pressable role="button" hitSlop={6} onPress={propose} style={styles.propose}>
                  <Text style={styles.proposeText}>{fr.proAppointment.propose}</Text>
                </Pressable>
                <View style={styles.row}>
                  <FicheButton label={t.refuseShort} variant="secondary" tall onPress={refuse} />
                  <FicheButton
                    label={t.fixAppointment}
                    icon={CalendarDays}
                    tall
                    grow
                    onPress={appointment}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.decision}>
                <FicheButton
                  label={t.fixAppointment}
                  icon={CalendarDays}
                  tall
                  onPress={appointment}
                />
                <FicheButton
                  label={fr.proAppointment.propose}
                  variant="secondary"
                  tall
                  onPress={propose}
                />
              </View>
            )}
          </ExampleLock>
        ) : undefined
      }
    >
      <FicheHead
        tags={
          <>
            {r.trade ? <FicheTag text={r.trade} tone="neutral" /> : null}
            <FicheTag
              text={t.status[r.status]}
              tone={r.status === "envoyee" ? "primary" : "neutral"}
              dot={r.status === "envoyee"}
            />
            {r.urgence ? <FicheTag text={t.urgent} tone="danger" /> : null}
          </>
        }
        title={r.summary || r.trade || t.detailTitle}
        meta={meta}
      />
      {left ? <RequestCountdown left={left} /> : null}
      <RequestBlocks detail={r} photoUrls={photoUrls} variant="opportunite" />
      {reputation ? <ClientReputationCard reputation={reputation} /> : null}
      {partners.length > 0 ? (
        <PartnerRecommendations
          requestId={r.id}
          clientFirstName={r.client.first_name}
          options={partners}
        />
      ) : null}
      <View style={styles.links}>
        {open ? (
          <ExampleLock locked={example}>
            <FicheLink
              icon={CircleHelp}
              label={fr.proExpertise.open}
              onPress={() => router.push(`/opportunite/${id}/expertise`)}
            />
          </ExampleLock>
        ) : null}
        <ExampleLock locked={example}>
          <FicheLink
            icon={Flag}
            label={fr.proFakeClient.open}
            onPress={() => router.push(`/opportunite/${id}/faux-particulier`)}
          />
        </ExampleLock>
      </View>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  decision: { gap: spacing(2.5) },
  row: { flexDirection: "row", gap: spacing(2.5) },
  propose: { alignSelf: "center", paddingVertical: spacing(0.5) },
  proposeText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  links: { gap: spacing(2) },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", OpportunityScreen);
