import {
  CLIENT_CANCELLABLE_STATUSES,
  chantierStepIndex,
  nextIntervention,
  parisToday,
  paymentProgress,
  reviewInvited,
  type ChantierStatus,
} from "@menao/core";
import { router } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { actionOf, addressOf, rehire, tagOf } from "./chantier-card";
import { ChantierLayout } from "./chantier-layout";
import { DocumentsCard, JournalCard, ScheduleCard } from "./dossier";
import { ActionCard, NextInterventionCard, PersonRow, StatusPill } from "./parts";
import { ReceptionBlocks } from "./reception-blocks";
import { WarrantyCard } from "./warranty-card";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import type { ChantierDetail } from "@/lib/chantiers";
import { formatDateNumeric } from "@/lib/format";
import { Body, Button, LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
/** Annulation possible par le client : avant tout devis signé (F-12). */
const CANCELLABLE: readonly ChantierStatus[] = CLIENT_CANCELLABLE_STATUSES;
const { colors, font, radius, spacing } = theme;
const STARTED: readonly ChantierStatus[] = [
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
  "cloture",
];

/**
 * Vue d'un chantier côté client (F-12, maquette « Vue d'un chantier ») : grande photo, titre,
 * adresse, état et description, artisan (« Message », « Appeler »), avancement, action attendue,
 * fin de chantier (réception, réserves), puis « Suivi du chantier » (journal de l'artisan,
 * prochaine intervention à ajouter au calendrier) et « Dossier du chantier » (documents,
 * échéancier toujours calculé). `retour` : fin de la signature du PV ou du paiement du solde ;
 * `onChanged` recharge le chantier après une action.
 */
export function ChantierView({
  detail,
  retour,
  onChanged,
  initialTab = "suivi",
}: {
  detail: ChantierDetail;
  retour?: string;
  onChanged: () => void;
  initialTab?: "suivi" | "dossier";
}) {
  const [tab, setTab] = useState(initialTab);
  const { c } = detail;
  const status = c.status as ChantierStatus;
  const step = chantierStepIndex(status);
  const action = actionOf(c);
  const next = nextIntervention({ status, appointmentAt: c.appointment_at, startAt: c.start_at });
  const progress =
    c.quote_total_ttc_cents !== null && c.quote_status === "signe"
      ? paymentProgress(c.quote_total_ttc_cents, detail.payments)
      : null;

  const address = addressOf(c);
  const journal = (
    <JournalCard
      journal={detail.journal}
      photoUrls={detail.photoUrls}
      emptyText={
        STARTED.includes(status)
          ? t.journal.clientEmpty(c.artisan_name)
          : t.journal.clientWaiting(c.artisan_name)
      }
    />
  );

  return (
    <ChantierLayout
      coverUrl={detail.coverUrl}
      title={c.title}
      address={address}
      pills={<StatusPill {...tagOf(c)} />}
      description={c.description}
      personLabel={t.yourArtisan}
      person={
        <PersonRow
          label={null}
          name={c.artisan_name}
          detail={c.trade_label}
          photoUrl={detail.avatarUrl}
        />
      }
      onMessage={() => router.push(`/conversation/${c.chantier_id}`)}
      phone={c.artisan_phone}
      step={step}
      identityExtra={
        status === "cloture" && c.closed_at ? (
          <View style={styles.row}>
            <CircleCheck size={16} color={colors.success} />
            <Text style={styles.meta}>{t.reception.closed(formatDateNumeric(c.closed_at))}</Text>
          </View>
        ) : null
      }
    >
      {action ? (
        <ActionCard
          action={action}
          totalTtcCents={c.quote_total_ttc_cents}
          chantierId={c.chantier_id}
        />
      ) : null}
      <ReceptionBlocks
        detail={detail}
        retour={retour}
        balanceCents={progress?.remainingCents ?? 0}
        onChanged={onChanged}
      />
      {reviewInvited(status, detail.reviewed) ? (
        <View style={styles.invite}>
          <Text role="heading" style={styles.inviteTitle}>
            {t.reviewInvite.title(c.artisan_name)}
          </Text>
          <Body muted>{t.reviewInvite.text(c.artisan_name)}</Body>
          <Button
            label={t.reviewInvite.cta(c.artisan_name)}
            onPress={() => router.push(`/chantier/${c.chantier_id}/avis`)}
          />
        </View>
      ) : null}
      {status === "en_litige" || detail.openTicketId ? (
        <View style={styles.dispute}>
          <Notice tone="info">
            {status === "en_litige" ? fr.dispute.ongoing : fr.dispute.pending}
          </Notice>
          {detail.openTicketId ? (
            <LinkText
              label={fr.dispute.follow}
              onPress={() => router.push(`/signalement/${detail.openTicketId}`)}
            />
          ) : null}
        </View>
      ) : null}

      <Segmented
        label={t.tabs.label}
        options={[
          { value: "suivi", label: t.tabs.suivi },
          { value: "dossier", label: t.tabs.dossier },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "suivi" ? (
        <>
          {journal}
          {!action && next ? (
            <NextInterventionCard
              next={next}
              calendar={{
                chantierId: c.chantier_id,
                title: c.title,
                location: address,
                artisan: c.artisan_name,
              }}
            />
          ) : null}
        </>
      ) : (
        <>
          <DocumentsCard documents={detail.documents} />
          <ScheduleCard progress={progress} totalTtcCents={c.quote_total_ttc_cents} />
          {c.received_at ? (
            <WarrantyCard
              receivedOn={parisToday(new Date(c.received_at))}
              insurer={detail.insurer}
            />
          ) : null}
        </>
      )}
      {status === "cloture" ? (
        <Button label={t.rehire(c.artisan_name)} variant="secondary" onPress={() => rehire(c)} />
      ) : null}
      <View style={styles.footerLinks}>
        <Pressable
          role="link"
          hitSlop={8}
          onPress={() => router.push(`/chantier/${c.chantier_id}/signaler`)}
        >
          <Text style={styles.dangerLink}>{t.report}</Text>
        </Pressable>
        {CANCELLABLE.includes(status) ? (
          <Pressable
            role="link"
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: "/chantier/[id]/annuler",
                params: { id: c.chantier_id, artisan: c.artisan_name },
              })
            }
          >
            <Text style={styles.dangerLink}>{fr.clientCancel.chantier.open}</Text>
          </Pressable>
        ) : null}
      </View>
    </ChantierLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  dispute: { gap: spacing(2) },
  invite: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  inviteTitle: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  footerLinks: { alignItems: "center", gap: spacing(4), paddingVertical: spacing(2) },
  dangerLink: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
});
