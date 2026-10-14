import { ARTISAN_CANCELLABLE_STATUSES, type ChantierStatus } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { NotebookPen } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { HeaderBand, whenMeta } from "@/components/header-band";
import { DetailBlock, RequestBlocks } from "@/components/pro/request-blocks";
import { FollowUpView } from "@/components/pro/follow-up-view";
import { SentQuoteBlock } from "@/components/pro/sent-quote-block";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { loadArtisanChantier, loadArtisanFollowUp } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAppointment;
const { colors, font, spacing } = theme;
const CANCELLABLE: readonly ChantierStatus[] = ARTISAN_CANCELLABLE_STATUSES;
/** Après l'acompte, la fiche devient la vue du chantier (F-22), comme sur le site. */
const FOLLOW_UP: readonly ChantierStatus[] = [
  "acompte_paye",
  "planifie",
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
  "cloture",
  "en_litige",
];

/**
 * Vue d'un rendez-vous côté artisan (F-18), comme sur le site (maquette « Vue d'un rendez-vous ») :
 * date et heure (modifiables tant que le rendez-vous est planifié), écrire au client, « Ce chantier
 * a besoin d'une expertise », dernier devis envoyé, client et lieu, rappel du chantier, notes
 * privées, annulation. Après l'acompte : suivi du
 * chantier (F-22). Aucun lien vers le site (règle 10).
 */
export default function ArtisanChantierScreen() {
  const { id, envoye, demarrage } = useLocalSearchParams<{
    id: string;
    envoye?: string;
    demarrage?: string;
  }>();
  const load = useCallback(async () => {
    const chantier = await loadArtisanChantier(id);
    if (!chantier) return null;
    const followUp = FOLLOW_UP.includes(chantier.detail.chantier.status)
      ? await loadArtisanFollowUp(id, chantier.detail.photos)
      : null;
    return { chantier, followUp };
  }, [id]);
  const [loaded, reload] = useFocusData(load);

  if (loaded === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (loaded === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.proChantiers.notFound}</Notice>
      </Screen>
    );
  }
  if (loaded.followUp) {
    return (
      <FollowUpView
        data={loaded.chantier}
        followUp={loaded.followUp}
        confirmed={demarrage === "confirme"}
        onChanged={reload}
      />
    );
  }

  const data = loaded.chantier;
  const c = data.detail;
  const status = c.chantier.status;
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const planned = status === "rdv_planifie" && appointment !== null;
  const awaitingQuote = status === "rdv_planifie" || status === "devis_en_revision";
  // « Ce chantier a besoin d'une expertise » tant que le chantier est actif, comme sur le site.
  const active = status !== "annule" && status !== "cloture" && status !== "devis_refuse";

  const quoteLabel =
    status === "devis_en_revision"
      ? fr.proQuote.edit
      : data.hasDraft
        ? fr.proQuote.resume
        : fr.proQuote.create;
  const cancellable = CANCELLABLE.includes(status);

  return (
    <Screen
      band={
        <HeaderBand
          title={planned ? t.bandTitle : c.chantier.title}
          meta={whenMeta(appointment?.starts_at)}
        >
          {active ? (
            <View style={styles.expertise}>
              <Button
                label={fr.proExpertise.open}
                variant="secondary"
                onPress={() => router.push(`/opportunite/${c.id}/expertise`)}
              />
            </View>
          ) : null}
        </HeaderBand>
      }
      footer={
        awaitingQuote || cancellable ? (
          <>
            {awaitingQuote ? (
              <Button label={quoteLabel} onPress={() => router.push(`/pro-chantier/${id}/devis`)} />
            ) : null}
            {cancellable ? (
              <Button
                label={t.cancel}
                variant="danger"
                onPress={() => router.push(`/pro-chantier/${id}/annuler`)}
              />
            ) : null}
          </>
        ) : undefined
      }
    >
      <View style={styles.head}>
        <StatusPill
          text={fr.proChantiers.status[status]}
          tone={status === "annule" || status === "devis_refuse" ? "neutral" : "primary"}
        />
        {planned ? (
          <Pressable
            role="button"
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: "/pro-chantier/[id]/rendez-vous",
                params: { id, starts: appointment.starts_at },
              })
            }
          >
            <Text style={styles.link}>{t.rescheduleTitle}</Text>
          </Pressable>
        ) : null}
      </View>
      {envoye === "1" && status === "devis_envoye" ? (
        <Notice tone="success">{fr.proQuote.send.sent}</Notice>
      ) : null}
      {status === "annule" ? (
        <Notice tone="info">
          {t.cancelled(formatDay(c.chantier.cancelled_at ?? c.chantier.created_at))}
        </Notice>
      ) : null}

      {data.sentQuote ? (
        <SentQuoteBlock
          quote={data.sentQuote}
          deposit={data.deposit}
          invoice={data.depositInvoice}
        />
      ) : null}
      <RequestBlocks
        detail={c}
        photoUrls={data.photoUrls}
        variant="rendez-vous"
        onMessage={() => router.push(`/conversation/${id}`)}
      />

      {c.appointment ? (
        <DetailBlock icon={<NotebookPen size={18} color={colors.primary} />} title={t.notes}>
          {c.appointment.notes ? <Text style={styles.text}>{c.appointment.notes}</Text> : null}
          <Pressable
            role="button"
            onPress={() =>
              router.push({
                pathname: "/pro-chantier/[id]/notes",
                params: { id, notes: c.appointment?.notes ?? "" },
              })
            }
            style={styles.notesButton}
          >
            <Text style={styles.link}>{c.appointment.notes ? t.editNotes : t.addNotes}</Text>
          </Pressable>
        </DetailBlock>
      ) : null}
      {status !== "annule" ? (
        <Pressable
          role="link"
          hitSlop={8}
          onPress={() => router.push(`/chantier/${id}/signaler`)}
          style={styles.report}
        >
          <Text style={styles.danger}>{fr.chantier.report}</Text>
        </Pressable>
      ) : null}
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
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  expertise: { paddingBottom: spacing(3) },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  link: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  notesButton: { paddingVertical: spacing(1) },
  report: { alignSelf: "center", paddingVertical: spacing(2) },
  danger: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
});
