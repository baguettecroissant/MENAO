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
import { CircleCheck, MapPin } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { actionOf, addressOf, rehire, tagOf } from "./chantier-card";
import { DocumentsCard, JournalCard, ScheduleCard } from "./dossier";
import {
  ActionCard,
  ChantierCover,
  ChantierStepper,
  NextInterventionCard,
  PersonRow,
  StatusPill,
} from "./parts";
import { ReceptionBlocks } from "./reception-blocks";
import { WarrantyCard } from "./warranty-card";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import type { ChantierDetail } from "@/lib/chantiers";
import { formatDateNumeric } from "@/lib/format";
import { Body, Button, Card, Chip, LinkText, Notice, Screen, Title } from "@/ui";
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
 * Vue d'un chantier côté client (F-12, maquette « Vue d'un chantier ») : avancement, artisan,
 * action attendue ou prochaine intervention, fin de chantier (réception, réserves), puis « Suivi »
 * (journal de l'artisan) et « Dossier » (échéancier toujours calculé, documents). `retour` : fin de
 * la signature du PV ou du paiement du solde ; `onChanged` recharge le chantier après une action.
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

  return (
    <Screen header={<TopBar />}>
      <View style={styles.cover}>
        <ChantierCover url={detail.coverUrl} height={170} />
      </View>
      <StatusPill {...tagOf(c)} />
      <Title>{c.title}</Title>
      {addressOf(c) && (
        <View style={styles.row}>
          <MapPin size={14} color={colors["muted-foreground"]} />
          <Text style={styles.meta}>{addressOf(c)}</Text>
        </View>
      )}
      {step !== null && (
        <Card>
          <ChantierStepper current={step} />
          {status === "cloture" && c.closed_at ? (
            <View style={styles.row}>
              <CircleCheck size={16} color={colors.success} />
              <Text style={styles.meta}>{t.reception.closed(formatDateNumeric(c.closed_at))}</Text>
            </View>
          ) : null}
        </Card>
      )}
      <Card>
        <PersonRow
          name={c.artisan_name}
          detail={c.trade_label}
          photoUrl={detail.avatarUrl}
          phone={c.artisan_phone}
          onMessage={() => router.push(`/conversation/${c.chantier_id}`)}
        />
      </Card>
      {action ? (
        <ActionCard
          action={action}
          totalTtcCents={c.quote_total_ttc_cents}
          chantierId={c.chantier_id}
        />
      ) : next ? (
        <NextInterventionCard next={next} />
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

      <View style={styles.tabs}>
        <Chip label={t.tabs.suivi} selected={tab === "suivi"} onPress={() => setTab("suivi")} />
        <Chip
          label={t.tabs.dossier}
          selected={tab === "dossier"}
          onPress={() => setTab("dossier")}
        />
      </View>

      {tab === "suivi" ? (
        <JournalCard
          journal={detail.journal}
          photoUrls={detail.photoUrls}
          emptyText={
            STARTED.includes(status)
              ? t.journal.clientEmpty(c.artisan_name)
              : t.journal.clientWaiting(c.artisan_name)
          }
        />
      ) : (
        <>
          <ScheduleCard progress={progress} totalTtcCents={c.quote_total_ttc_cents} />
          <DocumentsCard documents={detail.documents} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { overflow: "hidden", borderRadius: radius.card },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  tabs: { flexDirection: "row", gap: spacing(2) },
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
