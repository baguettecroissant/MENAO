import {
  ARTISAN_CANCELLABLE_STATUSES,
  chantierRights,
  chantierStepIndex,
  type ChantierStatus,
  isExampleId,
} from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  CircleCheck,
  CircleHelp,
  CircleX,
  FilePen,
  Flag,
  Hourglass,
} from "lucide-react-native";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { ExampleLock } from "@/components/examples";
import { ChantierFrame, NotesCard } from "@/components/pro/chantier-fiche";
import { ChantierTeamCard } from "@/components/pro/chantier-team-card";
import {
  FicheButton,
  FicheLink,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
  NextStepCard,
} from "@/components/pro/fiche-kit";
import { FollowUpView } from "@/components/pro/follow-up-view";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { SentQuoteBlock } from "@/components/pro/sent-quote-block";
import { fr } from "@/i18n/fr";
import { formatDay, formatDayAndTime } from "@/lib/format";
import { chantierScreenKey, loadArtisanChantierScreen } from "@/lib/pro-chantiers";
import { readScreenPreview } from "@/lib/screen-cache";
import { useTeamPosition } from "@/lib/team";
import { useFocusData } from "@/lib/use-focus-data";
import { LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAppointment;
const tf = fr.proChantierFiche;
const { spacing } = theme;
const CANCELLABLE: readonly ChantierStatus[] = ARTISAN_CANCELLABLE_STATUSES;

/**
 * Fiche d'un chantier côté artisan (F-18), refonte « Nette » (F-92). Avant l'acompte : frise des
 * étapes, « Prochaine étape » (rendez-vous et devis à préparer ou à modifier, devis envoyé ou
 * signé), date du rendez-vous modifiable, équipe, dernier devis envoyé, client et demande
 * d'origine, notes privées, « Ce chantier a besoin d'une expertise », annulation et signalement.
 * Après l'acompte : suivi du chantier (F-22, `FollowUpView`). Aucun lien vers le site (règle 10).
 */
export default function ArtisanChantierScreen() {
  const { id, envoye, demarrage } = useLocalSearchParams<{
    id: string;
    envoye?: string;
    demarrage?: string;
  }>();
  const load = useCallback(() => loadArtisanChantierScreen(id), [id]);
  const [loaded, reload] = useFocusData(load, undefined, chantierScreenKey(id));
  // Place dans l'équipe (ADR 0241) : argent, décisions et attribution selon les droits.
  const rights = chantierRights(useTeamPosition() ?? "patron");

  if (loaded === undefined) {
    return <FicheSkeleton title={tf.title} preview={readScreenPreview(chantierScreenKey(id))} />;
  }
  if (loaded === null) {
    return (
      <FicheScreen title={tf.title} onRefresh={reload}>
        <Notice tone="error">{fr.proChantiers.notFound}</Notice>
      </FicheScreen>
    );
  }
  if (loaded.followUp) {
    return (
      <FollowUpView
        data={loaded.chantier}
        followUp={loaded.followUp}
        confirmed={demarrage === "confirme"}
        onChanged={reload}
        example={isExampleId(id)}
        rights={rights}
      />
    );
  }

  const data = loaded.chantier;
  const c = data.detail;
  const status = c.chantier.status;
  const client = c.client.first_name ?? fr.proFollowUp.yourClientFallback;
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const planned = status === "rdv_planifie" && appointment !== null;
  const awaitingQuote =
    rights.money && (status === "rdv_planifie" || status === "devis_en_revision");
  // « Ce chantier a besoin d'une expertise » tant que le chantier est actif, comme sur le site.
  const active = status !== "annule" && status !== "cloture" && status !== "devis_refuse";

  const quoteLabel =
    status === "devis_en_revision"
      ? fr.proQuote.edit
      : data.hasDraft
        ? fr.proQuote.resume
        : fr.proQuote.create;
  const cancellable = rights.decisions && CANCELLABLE.includes(status);
  // Exemple (ADR 0184) : on navigue (devis, conversation), les actions sont inactives.
  const example = isExampleId(id);

  const quoteButton = awaitingQuote ? (
    <FicheButton
      label={quoteLabel}
      icon={FilePen}
      tall
      onPress={() => router.push(`/pro-chantier/${id}/devis`)}
    />
  ) : null;
  const reschedule =
    rights.decisions && planned && !example ? (
      <LinkText
        label={t.rescheduleTitle}
        onPress={() =>
          router.push({
            pathname: "/pro-chantier/[id]/rendez-vous",
            params: { id, starts: appointment.starts_at },
          })
        }
      />
    ) : null;

  const nextStep = (() => {
    switch (status) {
      case "rdv_planifie": {
        const when = appointment ? formatDayAndTime(appointment.starts_at) : null;
        return (
          <NextStepCard
            icon={when ? CalendarDays : FilePen}
            title={when ? fr.chantier.next.appointmentOn(when.day, when.time) : tf.next.quoteTitle}
            text={tf.next.appointmentText}
          >
            {quoteButton}
            {reschedule}
          </NextStepCard>
        );
      }
      case "devis_en_revision":
        return (
          <NextStepCard
            icon={FilePen}
            title={fr.chantier.clientStatus.devis_en_revision}
            text={tf.next.revisionText}
          >
            {quoteButton}
          </NextStepCard>
        );
      case "devis_envoye":
        return (
          <NextStepCard
            icon={Hourglass}
            title={tf.next.sentTitle}
            text={tf.next.sentText(client)}
          />
        );
      case "devis_signe":
        return (
          <NextStepCard
            icon={CircleCheck}
            title={tf.next.signedTitle}
            text={tf.next.signedText(client)}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <ChantierFrame
      detail={c}
      tags={
        <FicheTag
          text={fr.proChantiers.status[status]}
          tone={status === "annule" || status === "devis_refuse" ? "neutral" : "primary"}
          dot={status !== "annule" && status !== "devis_refuse"}
        />
      }
      step={chantierStepIndex(status)}
      nextStep={nextStep}
      onRefresh={reload}
    >
      {envoye === "1" && status === "devis_envoye" ? (
        <Notice tone="success">{fr.proQuote.send.sent}</Notice>
      ) : null}
      {status === "annule" ? (
        <Notice tone="info">
          {t.cancelled(formatDay(c.chantier.cancelled_at ?? c.chantier.created_at))}
        </Notice>
      ) : null}

      {rights.assign && !example ? <ChantierTeamCard chantierId={id} /> : null}
      {rights.money && data.sentQuote ? (
        <ExampleLock locked={example}>
          <SentQuoteBlock
            quote={data.sentQuote}
            deposit={data.deposit}
            invoice={data.depositInvoice}
          />
        </ExampleLock>
      ) : null}
      <RequestBlocks
        detail={c}
        photoUrls={data.photoUrls}
        variant="rendez-vous"
        contactActions={false}
      />
      {c.appointment ? (
        <NotesCard chantierId={id} notes={c.appointment.notes} example={example} />
      ) : null}

      <View style={styles.links}>
        {rights.decisions && active ? (
          <ExampleLock locked={example}>
            <FicheLink
              icon={CircleHelp}
              label={fr.proExpertise.open}
              onPress={() => router.push(`/opportunite/${c.id}/expertise`)}
            />
          </ExampleLock>
        ) : null}
        {status !== "annule" && !example ? (
          <FicheLink
            icon={Flag}
            label={fr.chantier.report}
            onPress={() => router.push(`/chantier/${id}/signaler`)}
          />
        ) : null}
        {cancellable ? (
          <ExampleLock locked={example} note>
            <FicheLink
              icon={CircleX}
              label={t.cancel}
              tone="danger"
              onPress={() => router.push(`/pro-chantier/${id}/annuler`)}
            />
          </ExampleLock>
        ) : null}
      </View>
    </ChantierFrame>
  );
}

const styles = StyleSheet.create({
  links: { gap: spacing(2) },
});
