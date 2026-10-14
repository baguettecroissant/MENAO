import {
  CHANTIER_MESSAGE_MAX_LENGTH,
  LIFT_MESSAGE_MAX_LENGTH,
  canDeclareFinished,
  chantierStepIndex,
  isJournalOpen,
  nextIntervention,
} from "@menao/core";
import { chantierMessageSchema, liftMessageSchema } from "@menao/validation";
import { router } from "expo-router";
import { NotebookPen, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { ChantierLayout } from "@/components/chantier/chantier-layout";
import { DocumentsCard, JournalCard, ScheduleCard } from "@/components/chantier/dossier";
import {
  NextInterventionCard,
  PersonRow,
  StatusPill,
  chantierTag,
} from "@/components/chantier/parts";
import { ConversationCard } from "@/components/messages/conversation-card";
import { PhotoUpload } from "@/components/pro/photo-upload";
import { DetailBlock, RequestBlocks } from "@/components/pro/request-blocks";
import { ReviewCard } from "@/components/pro/review-card";
import { StartDateForm } from "@/components/pro/start-date-form";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import { formatCents, formatDateNumeric, formatDayAndTime } from "@/lib/format";
import {
  addChantierMessage,
  declareChantierFinished,
  signalReservesLifted,
  type ArtisanChantier,
  type ArtisanFollowUp,
} from "@/lib/pro-chantiers";
import { Body, Button, LinkText, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proFollowUp;
const { colors, font, radius, spacing } = theme;

/**
 * Vue d'un chantier côté artisan après l'acompte (F-22), comme sur le site et avec la mise en page
 * de la vue du client (maquettes « Vue d'un chantier ») : confirmation de la date de démarrage et
 * « Déclarer le chantier terminé » en pied d'écran, « Messagerie avec … » et journal pendant les
 * travaux, réserves et leur levée, avis du client et réponse publique (F-28), dossier (documents,
 * échéancier, client). Aucun lien vers le site (règle 10).
 */
export function FollowUpView({
  data,
  followUp: f,
  confirmed,
  onChanged,
}: {
  data: ArtisanChantier;
  followUp: ArtisanFollowUp;
  /** Date de démarrage tout juste confirmée. */
  confirmed: boolean;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"suivi" | "dossier">("suivi");
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const c = data.detail;
  const id = c.chantier.id;
  const status = c.chantier.status;
  const startAt = c.chantier.start_at;
  const clientName =
    [c.client.first_name, c.client.last_name].filter(Boolean).join(" ") || t.yourClientFallback;
  const client = c.client.first_name ?? t.yourClientFallback;
  const step = chantierStepIndex(status);
  const open = isJournalOpen(status);
  const next = nextIntervention({ status, appointmentAt: null, startAt });
  const address = c.adresse ?? ([c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null);
  const start = startAt ? formatDayAndTime(startAt) : null;
  const showConfirmed = (confirmed || justConfirmed) && status === "planifie" && start;

  return (
    <ChantierLayout
      coverUrl={f.coverUrl}
      title={c.chantier.title}
      address={address}
      pills={
        <>
          {/* Même pastille que la vue du client et que le site (« Démarrage prévu le … »). */}
          <StatusPill
            {...chantierTag({
              status,
              startAt,
              finishedAt: f.finishedAt,
              closedAt: status === "cloture" ? f.balancePaidAt : null,
              receivedAt: f.receivedAt,
            })}
          />
          {f.depositPaid ? (
            <View style={styles.deposit}>
              <ShieldCheck size={14} color={colors.success} />
              <Text style={styles.depositText}>{fr.chantier.depositReceived}</Text>
            </View>
          ) : null}
        </>
      }
      description={c.description}
      personLabel={fr.chantier.yourClient}
      person={
        <PersonRow label={null} name={clientName} detail={null} photoUrl={null} verified={false} />
      }
      onMessage={() => router.push(`/conversation/${id}`)}
      phone={c.client.phone}
      step={step}
      footer={
        // Maquettes « Date à confirmer » et « Chantier en cours » : action principale en pied.
        status === "acompte_paye" ? (
          <StartDateForm
            chantierId={id}
            quoteStart={f.quote?.startDate ?? null}
            onConfirmed={() => {
              setJustConfirmed(true);
              onChanged();
            }}
          />
        ) : canDeclareFinished(status) ? (
          <Button label={t.finish} onPress={() => setFinishOpen(true)} />
        ) : undefined
      }
    >
      {showConfirmed ? (
        <View style={styles.group}>
          <Notice tone="success">
            {`${t.confirmedTitle}. ${t.confirmed(start.day, start.time, client)}`}
          </Notice>
          <LinkText label={t.dashboard} onPress={() => router.navigate("/pro")} />
        </View>
      ) : null}
      {status === "en_litige" || f.openTicketId ? (
        <View style={styles.group}>
          <Notice tone="info">
            {status === "en_litige" ? fr.dispute.ongoing : fr.dispute.pending}
          </Notice>
          {f.openTicketId ? (
            <LinkText
              label={fr.dispute.follow}
              onPress={() => router.push(`/signalement/${f.openTicketId}`)}
            />
          ) : null}
        </View>
      ) : null}
      {status === "travaux_termines" ? (
        <Notice tone="info">{t.awaitingReception(client)}</Notice>
      ) : null}
      {status === "reserves_a_lever" && f.reception?.reserves ? (
        <View style={styles.reserves}>
          <Text role="heading" style={styles.reservesTitle}>
            {t.reservesTitle(client)}
          </Text>
          <Text style={styles.text}>{f.reception.reserves}</Text>
          <Text style={styles.small}>{t.reservesNext}</Text>
        </View>
      ) : null}
      {status === "reserves_a_lever" && f.reception?.liftSignaledAt ? (
        <Notice tone="info">
          {t.liftSignaled(client, formatDateNumeric(f.reception.liftSignaledAt))}
        </Notice>
      ) : null}
      {status === "reserves_a_lever" ? (
        <LiftPanel chantierId={id} client={client} onDone={onChanged} />
      ) : null}
      {status === "receptionne" && f.receivedAt ? (
        <Notice tone="success">
          {t.received(
            client,
            formatDateNumeric(f.receivedAt),
            formatCents(f.progress?.remainingCents ?? 0),
          )}
        </Notice>
      ) : null}
      {status === "cloture" && f.balancePaidAt && f.balanceCents !== null ? (
        <Notice tone="success">
          {t.closed(formatDateNumeric(f.balancePaidAt), formatCents(f.balanceCents))}
        </Notice>
      ) : null}
      {f.review ? (
        <ReviewCard review={f.review} heading={t.reviewTitle(client)} onReplied={onChanged} />
      ) : status === "cloture" ? (
        <Notice tone="info">{t.reviewPending(client)}</Notice>
      ) : null}

      <Segmented
        label={fr.chantier.tabs.label}
        options={[
          { value: "suivi", label: fr.chantier.tabs.suivi },
          { value: "dossier", label: fr.chantier.tabs.dossier },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "suivi" ? (
        <>
          <ConversationCard chantierId={id} name={clientName} />
          <JournalCard
            journal={f.journal}
            photoUrls={f.photoUrls}
            emptyText={
              open ? fr.chantier.journal.artisanIntro(client) : fr.chantier.journal.artisanLocked
            }
            photoAction={open ? <PhotoUpload chantierId={id} onAdded={onChanged} /> : undefined}
          >
            {open ? <MessageComposer chantierId={id} onDone={onChanged} /> : null}
          </JournalCard>
          {next ? (
            <View style={styles.group}>
              <NextInterventionCard next={next} />
              {status === "planifie" && startAt ? (
                <LinkText
                  label={t.edit}
                  onPress={() =>
                    router.push({
                      pathname: "/pro-chantier/[id]/demarrage",
                      params: { id, debut: startAt },
                    })
                  }
                />
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <DocumentsCard documents={f.documents} />
          <ScheduleCard progress={f.progress} totalTtcCents={f.quote?.totalTtcCents ?? null} />
          <RequestBlocks detail={c} photoUrls={data.photoUrls} variant="rendez-vous" />
          {c.appointment ? (
            <DetailBlock
              icon={<NotebookPen size={18} color={colors.primary} />}
              title={fr.proAppointment.notes}
            >
              {c.appointment.notes ? <Text style={styles.text}>{c.appointment.notes}</Text> : null}
              <LinkText
                label={
                  c.appointment.notes ? fr.proAppointment.editNotes : fr.proAppointment.addNotes
                }
                onPress={() =>
                  router.push({
                    pathname: "/pro-chantier/[id]/notes",
                    params: { id, notes: c.appointment?.notes ?? "" },
                  })
                }
              />
            </DetailBlock>
          ) : null}
        </>
      )}
      <Pressable
        role="link"
        hitSlop={8}
        onPress={() => router.push(`/chantier/${id}/signaler`)}
        style={styles.report}
      >
        <Text style={styles.danger}>{fr.chantier.report}</Text>
      </Pressable>
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
    </ChantierLayout>
  );
}

/** F-22 « Ajouter un message » au journal, visible par le client. */
function MessageComposer({ chantierId, onDone }: { chantierId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

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
    setOpen(false);
    setSent(true);
    onDone();
  }

  if (!open) {
    return (
      <View style={styles.group}>
        {sent ? <Notice tone="success">{t.messageSent}</Notice> : null}
        <Button
          label={t.addMessage}
          variant="secondary"
          onPress={() => {
            setOpen(true);
            setSent(false);
          }}
        />
      </View>
    );
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
      <Button label={t.messageCancel} variant="ghost" onPress={() => setOpen(false)} />
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

  if (!open) return <Button label={t.signalLift} onPress={() => setOpen(true)} />;
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
  deposit: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderRadius: radius.chip,
    backgroundColor: colors["success-soft"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  depositText: { fontFamily: font.medium, fontSize: 12, color: colors.success },
  group: { gap: spacing(2) },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  reserves: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  reservesTitle: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
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
  report: { alignSelf: "center", paddingVertical: spacing(2) },
  danger: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
});
