import {
  CHANTIER_MESSAGE_MAX_LENGTH,
  LIFT_MESSAGE_MAX_LENGTH,
  canDeclareFinished,
  chantierStepIndex,
  isJournalOpen,
  type ChantierRights,
  type JournalDay,
} from "@menao/core";
import { chantierMessageSchema, liftMessageSchema } from "@menao/validation";
import { router } from "expo-router";
import {
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CircleCheck,
  Flag,
  Hourglass,
  PenLine,
  ShieldAlert,
  Wrench,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { DocumentsCard } from "@/components/chantier/dossier";
import { chantierTag } from "@/components/chantier/parts";
import { ExampleLock } from "@/components/examples";
import { JournalTimeline } from "@/components/journal-timeline";
import { ConversationCard } from "@/components/messages/conversation-card";
import { ChantierTeamCard } from "@/components/pro/chantier-team-card";
import { ChantierFrame, MoneyCard, NotesCard, PlanningCard } from "@/components/pro/chantier-fiche";
import { ClientRatingForm } from "@/components/pro/client-rating-form";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheLink,
  FicheTag,
  NextStepCard,
  PillTabs,
  capitalize,
} from "@/components/pro/fiche-kit";
import { PhotoUpload, PhotoUploadStatus, usePhotoUpload } from "@/components/pro/photo-upload";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { ReviewCard } from "@/components/pro/review-card";
import { StartDateForm } from "@/components/pro/start-date-form";
import { fr } from "@/i18n/fr";
import { formatCents, formatDateNumeric, formatDayAndTime } from "@/lib/format";
import { loadConversationPreview } from "@/lib/messages";
import {
  addChantierMessage,
  declareChantierFinished,
  signalReservesLifted,
  type ArtisanChantier,
  type ArtisanFollowUp,
} from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, LinkText, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proFollowUp;
const tf = fr.proChantierFiche;
const { colors, font, radius, spacing } = theme;
const FULL_RIGHTS: ChantierRights = {
  money: true,
  decisions: true,
  replyReviews: true,
  assign: true,
};

type Tab = "suivi" | "dossier" | "messages";

/**
 * Fiche d'un chantier côté artisan après l'acompte (F-22), refonte « Nette » (F-92) : frise des
 * étapes et « Prochaine étape » avec l'action du moment (confirmer la date de démarrage, déclarer
 * le chantier terminé, signaler la levée des réserves…), avis du client et réponse publique
 * (F-28), note de l'artisan sur son client (F-23), puis les onglets Suivi (fil chronologique,
 * photos et messages, argent, planning, équipe, notes privées), Dossier (documents, demande
 * d'origine, client) et Messages (conversation, F-40). Aucun lien vers le site (règle 10).
 */
export function FollowUpView({
  data,
  followUp: f,
  confirmed,
  onChanged,
  example = false,
  rights = FULL_RIGHTS,
}: {
  data: ArtisanChantier;
  followUp: ArtisanFollowUp;
  /** Date de démarrage tout juste confirmée. */
  confirmed: boolean;
  onChanged: () => void;
  /** Exemple (ADR 0184) : on navigue (conversation, onglets), les actions sont inactives. */
  example?: boolean;
  /** Ce que la place dans l'équipe permet (ADR 0241) ; tout par défaut (patron, exemples). */
  rights?: ChantierRights;
}) {
  const [tab, setTab] = useState<Tab>("suivi");
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const c = data.detail;
  const id = c.chantier.id;
  const status = c.chantier.status;
  const startAt = c.chantier.start_at;
  const clientName =
    [c.client.first_name, c.client.last_name].filter(Boolean).join(" ") || t.yourClientFallback;
  const client = c.client.first_name ?? t.yourClientFallback;
  const open = isJournalOpen(status);
  const start = startAt ? formatDayAndTime(startAt) : null;
  const showConfirmed = (confirmed || justConfirmed) && status === "planifie" && start;
  const [conversation] = useFocusData(useCallback(() => loadConversationPreview(id), [id]));
  const quoteId = f.documents.find((d) => d.kind === "devis")?.id ?? null;

  const nextStep = (() => {
    switch (status) {
      case "acompte_paye":
        return rights.decisions ? (
          <NextStepCard
            icon={CalendarCheck}
            title={tf.next.startTitle}
            text={tf.next.startText(capitalize(client))}
          >
            {example ? (
              <ExampleLock locked note>
                {null}
              </ExampleLock>
            ) : (
              <StartDateForm
                chantierId={id}
                quoteStart={f.quote?.startDate ?? null}
                onConfirmed={() => {
                  setJustConfirmed(true);
                  onChanged();
                }}
              />
            )}
          </NextStepCard>
        ) : null;
      case "planifie":
        return start ? (
          <NextStepCard
            icon={CalendarDays}
            title={fr.chantier.next.startOn(start.day, start.time)}
            text={fr.chantier.journal.artisanLocked}
          />
        ) : null;
      case "en_cours":
        return canDeclareFinished(status) ? (
          <NextStepCard
            icon={Flag}
            title={tf.next.finishTitle}
            text={tf.next.finishText(
              capitalize(client),
              rights.money && f.progress ? formatCents(f.progress.remainingCents) : null,
            )}
          >
            {rights.decisions ? (
              <ExampleLock locked={example} note>
                <FicheButton
                  label={t.finish}
                  icon={Check}
                  tall
                  onPress={() => setFinishOpen(true)}
                />
              </ExampleLock>
            ) : null}
          </NextStepCard>
        ) : null;
      case "travaux_termines":
        return (
          <NextStepCard
            icon={Hourglass}
            title={tf.next.receptionTitle}
            text={t.awaitingReception(client)}
          />
        );
      case "reserves_a_lever":
        return (
          <NextStepCard icon={Wrench} title={t.reservesTitle(client)} text={t.reservesNext}>
            {f.reception?.reserves ? (
              <Text style={styles.reserves}>{f.reception.reserves}</Text>
            ) : null}
            {f.reception?.liftSignaledAt ? (
              <Notice tone="info">
                {t.liftSignaled(client, formatDateNumeric(f.reception.liftSignaledAt))}
              </Notice>
            ) : null}
            {rights.decisions && !example ? (
              <LiftPanel chantierId={id} client={client} onDone={onChanged} />
            ) : null}
          </NextStepCard>
        );
      case "receptionne":
        return (
          <NextStepCard
            icon={CircleCheck}
            title={tf.next.receivedTitle}
            text={
              rights.money && f.receivedAt
                ? t.received(
                    client,
                    formatDateNumeric(f.receivedAt),
                    formatCents(f.progress?.remainingCents ?? 0),
                  )
                : null
            }
          />
        );
      case "cloture":
        return (
          <NextStepCard
            icon={CircleCheck}
            title={tf.next.closedTitle}
            text={
              rights.money && f.balancePaidAt && f.balanceCents !== null
                ? t.closed(formatDateNumeric(f.balancePaidAt), formatCents(f.balanceCents))
                : null
            }
          />
        );
      case "en_litige":
        return (
          <NextStepCard icon={ShieldAlert} title={tf.next.disputeTitle} text={fr.dispute.ongoing}>
            {f.openTicketId ? (
              <LinkText
                label={fr.dispute.follow}
                onPress={() => router.push(`/signalement/${f.openTicketId}`)}
              />
            ) : null}
          </NextStepCard>
        );
      default:
        return null;
    }
  })();

  return (
    <ChantierFrame
      detail={c}
      tags={
        <>
          {/* Même pastille que la vue du client et que le site (« Démarrage prévu le … »). */}
          <FicheTag
            {...chantierTag({
              status,
              startAt,
              finishedAt: f.finishedAt,
              closedAt: status === "cloture" ? f.balancePaidAt : null,
              receivedAt: f.receivedAt,
            })}
          />
          {rights.money && f.depositPaid ? (
            <FicheTag text={fr.chantier.depositReceived} tone="success" dot />
          ) : null}
        </>
      }
      step={chantierStepIndex(status)}
      nextStep={nextStep}
    >
      {showConfirmed ? (
        <View style={styles.group}>
          <Notice tone="success">
            {`${t.confirmedTitle}. ${t.confirmed(start.day, start.time, client)}`}
          </Notice>
          <LinkText label={t.dashboard} onPress={() => router.navigate("/pro")} />
        </View>
      ) : null}
      {status !== "en_litige" && f.openTicketId ? (
        <View style={styles.group}>
          <Notice tone="info">{fr.dispute.pending}</Notice>
          <LinkText
            label={fr.dispute.follow}
            onPress={() => router.push(`/signalement/${f.openTicketId}`)}
          />
        </View>
      ) : null}
      {f.review ? (
        <ReviewCard
          review={f.review}
          heading={t.reviewTitle(client)}
          onReplied={onChanged}
          canReply={rights.replyReviews}
        />
      ) : status === "cloture" ? (
        <Notice tone="info">{t.reviewPending(client)}</Notice>
      ) : null}
      {rights.decisions && status === "cloture" ? (
        f.clientRating ? (
          <Notice tone="info">
            {fr.proClientRating.done(
              formatDateNumeric(f.clientRating.created_at),
              f.clientRating.welcome,
              f.clientRating.clarity,
              f.clientRating.payment,
            )}
          </Notice>
        ) : (
          <ClientRatingForm
            chantierId={id}
            clientName={client}
            visibleToNetwork={f.ratingsVisible}
            onRated={onChanged}
          />
        )
      ) : null}

      <PillTabs
        label={tf.tabs.label}
        options={[
          { value: "suivi", label: tf.tabs.suivi },
          { value: "dossier", label: tf.tabs.dossier },
          { value: "messages", label: tf.tabs.messages, badge: conversation?.unread ?? 0 },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "suivi" ? (
        <>
          <JournalTimelineCard
            chantierId={id}
            client={client}
            open={open}
            example={example}
            days={f.timeline}
            photoUrlByPath={f.photoUrlByPath}
            authors={f.journalAuthors}
            onChanged={onChanged}
          />
          {rights.money && f.quote ? (
            <MoneyCard
              totalCents={f.quote.totalTtcCents}
              progress={f.progress}
              deposit={data.deposit}
              depositInvoiceId={data.depositInvoice?.id ?? null}
              quoteId={quoteId}
              balance={
                f.balancePaidAt && f.balanceCents !== null
                  ? { paidAt: f.balancePaidAt, cents: f.balanceCents }
                  : null
              }
              start={
                (f.startCents ?? 0) > 0
                  ? { cents: f.startCents ?? 0, paidAt: f.startPaidAt ?? null }
                  : null
              }
              example={example}
            />
          ) : null}
          <PlanningCard
            startAt={startAt}
            onEdit={
              rights.decisions && status === "planifie" && startAt && !example
                ? () =>
                    router.push({
                      pathname: "/pro-chantier/[id]/demarrage",
                      params: { id, debut: startAt },
                    })
                : null
            }
          />
          {rights.assign && !example ? <ChantierTeamCard chantierId={id} /> : null}
          {c.appointment ? (
            <NotesCard chantierId={id} notes={c.appointment.notes} example={example} />
          ) : null}
        </>
      ) : tab === "dossier" ? (
        <>
          {rights.money ? (
            <ExampleLock locked={example}>
              <DocumentsCard documents={f.documents} />
            </ExampleLock>
          ) : null}
          <RequestBlocks
            detail={c}
            photoUrls={data.photoUrls}
            variant="rendez-vous"
            contactActions={false}
          />
        </>
      ) : (
        <>
          <ConversationCard chantierId={id} name={clientName} example={example} />
          <FicheButton
            label={tf.openConversation}
            variant="secondary"
            onPress={() => router.push(`/conversation/${id}`)}
          />
        </>
      )}
      {example ? null : (
        <FicheLink
          icon={Flag}
          label={fr.chantier.report}
          onPress={() => router.push(`/chantier/${id}/signaler`)}
        />
      )}
      <BottomSheet
        visible={finishOpen}
        onClose={() => setFinishOpen(false)}
        title={t.finishTitle}
        closeLabel={fr.chantier.next.close}
      >
        <FinishPanel
          chantierId={id}
          client={client}
          onDone={() => {
            setFinishOpen(false);
            onChanged();
          }}
        />
      </BottomSheet>
    </ChantierFrame>
  );
}

/**
 * « Suivi du chantier » : « Photo » et « Message » (pendant les travaux, F-22), puis le fil
 * chronologique par jour, le plus récent en tête (point bleu), avec auteur, textes et photos.
 */
function JournalTimelineCard({
  chantierId,
  client,
  open,
  example,
  days,
  photoUrlByPath,
  authors,
  onChanged,
}: {
  chantierId: string;
  client: string;
  open: boolean;
  example: boolean;
  days: JournalDay[];
  photoUrlByPath: Readonly<Record<string, string>>;
  authors: Readonly<Record<string, string>>;
  onChanged: () => void;
}) {
  const upload = usePhotoUpload({ chantierId, onAdded: onChanged });
  const [composing, setComposing] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <FicheCard padding={4.5}>
      <CardHeading
        title={fr.chantier.journal.title}
        right={<Text style={styles.meta}>{tf.clientSees(capitalize(client))}</Text>}
      />
      {open ? (
        <View style={styles.group}>
          <ExampleLock locked={example}>
            <View style={styles.row}>
              <FicheButton
                label={tf.photo}
                icon={Camera}
                grow
                loading={upload.progress !== null}
                onPress={upload.add}
              />
              <FicheButton
                label={tf.message}
                variant="secondary"
                icon={PenLine}
                grow
                onPress={() => {
                  setComposing(true);
                  setSent(false);
                }}
              />
            </View>
          </ExampleLock>
          <PhotoUploadStatus progress={upload.progress} notice={upload.notice} />
          {sent ? <Notice tone="success">{t.messageSent}</Notice> : null}
          {composing ? (
            <MessageForm
              chantierId={chantierId}
              onCancel={() => setComposing(false)}
              onDone={() => {
                setComposing(false);
                setSent(true);
                onChanged();
              }}
            />
          ) : null}
        </View>
      ) : null}
      {days.length === 0 ? (
        <Body muted>
          {open ? fr.chantier.journal.artisanIntro(client) : fr.chantier.journal.artisanLocked}
        </Body>
      ) : (
        <JournalTimeline
          days={days}
          photoUrlByPath={photoUrlByPath}
          authorOf={(day) =>
            day.messages.map((m) => authors[m.id]).find(Boolean) ??
            (day.messages.length > 0 ? tf.you : null)
          }
        />
      )}
    </FicheCard>
  );
}

/** F-22 « Ajouter un message » au journal, visible par le client. */
function MessageForm({
  chantierId,
  onDone,
  onCancel,
}: {
  chantierId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = chantierMessageSchema.safeParse({ message });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.message?.[0]);
      return;
    }
    setError(undefined);
    setPending(true);
    const failed = await addChantierMessage(chantierId, parsed.data.message);
    setPending(false);
    if (failed) return setError(failed);
    setMessage("");
    onDone();
  }

  return (
    <View style={styles.group}>
      <TextField
        label={t.messageLabel}
        value={message}
        onChangeText={(value) => {
          setMessage(value);
          setError(undefined);
        }}
        maxLength={CHANTIER_MESSAGE_MAX_LENGTH}
        multiline
        autoFocus
        error={error}
      />
      <Button label={t.messageSubmit} onPress={submit} loading={pending} />
      <Button label={t.messageCancel} variant="ghost" onPress={onCancel} />
    </View>
  );
}

/**
 * F-22 « Déclarer le chantier terminé », dans la feuille « Ce chantier est-il terminé ? »
 * (maquette « Chantier en cours ») : rappel des photos, puis confirmation.
 */
function FinishPanel({
  chantierId,
  client,
  onDone,
}: {
  chantierId: string;
  client: string;
  onDone: () => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setFailure(null);
    setPending(true);
    const failed = await declareChantierFinished(chantierId);
    setPending(false);
    if (failed) return setFailure(failed);
    onDone();
  }

  return (
    <>
      <Body muted>{t.finishIntro(client)}</Body>
      <Text style={styles.important}>
        <Text style={styles.importantLabel}>{t.finishImportant}</Text> {t.finishReminder}
      </Text>
      <PhotoUpload chantierId={chantierId} label={t.addPhotos} variant="link" onAdded={onDone} />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.finish} onPress={confirm} loading={pending} />
    </>
  );
}

/** F-26 « Signaler la levée des réserves », avec un message facultatif pour le client. */
function LiftPanel({
  chantierId,
  client,
  onDone,
}: {
  chantierId: string;
  client: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = liftMessageSchema.safeParse({ message });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.message?.[0]);
      return;
    }
    setError(undefined);
    setPending(true);
    const failed = await signalReservesLifted(chantierId, parsed.data.message);
    setPending(false);
    if (failed) return setError(failed);
    setOpen(false);
    onDone();
  }

  if (!open) {
    return <FicheButton label={t.signalLift} icon={Check} tall onPress={() => setOpen(true)} />;
  }
  return (
    <View style={styles.panel}>
      <Text role="heading" style={styles.panelTitle}>
        {t.liftTitle}
      </Text>
      <Body muted>{t.liftText(client)}</Body>
      <TextField
        label={t.liftMessage}
        value={message}
        onChangeText={(value) => {
          setMessage(value);
          setError(undefined);
        }}
        maxLength={LIFT_MESSAGE_MAX_LENGTH}
        multiline
        error={error}
      />
      <Button label={t.liftSubmit} onPress={submit} loading={pending} />
      <Button label={t.back} variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing(2.5) },
  row: { flexDirection: "row", gap: spacing(2.5) },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  reserves: {
    overflow: "hidden",
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    padding: spacing(3),
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
  },
  panel: {
    gap: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  panelTitle: { fontFamily: font.medium, fontSize: 16, color: colors["primary-strong"] },
  important: {
    overflow: "hidden",
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
    padding: spacing(3),
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["primary-strong"],
  },
  importantLabel: { fontFamily: font.medium },
});
