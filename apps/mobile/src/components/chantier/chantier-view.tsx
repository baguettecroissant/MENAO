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
import { CircleCheck, CircleX, ShieldAlert } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { actionOf, addressOf, rehire, tagOf } from "./chantier-card";
import { ArtisanCard, ClientMoneyCard, ClientNextStep, ClientStepper } from "./client-fiche";
import { DocumentsCard } from "./dossier";
import { ReceptionBlocks } from "./reception-blocks";
import { WarrantyCard } from "./warranty-card";
import { JournalTimeline } from "@/components/journal-timeline";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheHead,
  FicheLink,
  FicheScreen,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import type { ChantierDetail } from "@/lib/chantiers";
import { formatDateNumeric, formatDayMonthShort } from "@/lib/format";
import { Body, LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
/** Annulation possible par le client : avant tout devis signé (F-12). */
const CANCELLABLE: readonly ChantierStatus[] = CLIENT_CANCELLABLE_STATUSES;
const { colors, font, spacing } = theme;
const STARTED: readonly ChantierStatus[] = [
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
  "cloture",
];
/** Réception validée : le reste à payer n'est plus « après la réception ». */
const RECEIVED: readonly ChantierStatus[] = ["receptionne", "cloture"];

/**
 * Fiche d'un chantier côté client (F-12), refonte « Nette » (lot 6, maquette
 * « ClientChantierApp ») : barre « Chantier », pastilles métier et état, titre, adresse, frise des
 * 5 étapes, « Prochaine étape » (action attendue avec son bouton, prochaine intervention, ou
 * réception), carte de l'artisan (« Appeler », « Message »), fil du suivi, « Argent du chantier »
 * (toujours calculé), documents et garanties, puis avis, signalement et annulation.
 * `retour` : fin de la signature du PV ou du paiement du solde ; `onChanged` recharge le chantier
 * après une action (et au geste « tirer pour actualiser »).
 */
export function ChantierView({
  detail,
  retour,
  onChanged,
}: {
  detail: ChantierDetail;
  retour?: string;
  onChanged: () => void | Promise<void>;
}) {
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
  const meta = [
    address,
    status === "en_cours" && c.start_at ? t.fiche.started(formatDayMonthShort(c.start_at)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const tag = tagOf(c);

  return (
    <FicheScreen title={t.fiche.title} onRefresh={async () => onChanged()}>
      <FicheHead
        tags={
          <>
            {c.trade_label ? <FicheTag text={c.trade_label} tone="primary" /> : null}
            <FicheTag text={tag.text} tone={tag.tone} dot />
          </>
        }
        title={c.title}
        meta={meta || null}
      />
      {c.description ? <Text style={styles.description}>{c.description}</Text> : null}
      {status === "cloture" && c.closed_at ? (
        <View style={styles.row}>
          <CircleCheck size={16} color={colors.success} />
          <Text style={styles.meta}>{t.reception.closed(formatDateNumeric(c.closed_at))}</Text>
        </View>
      ) : null}

      {step !== null ? <ClientStepper current={step} /> : null}

      <ClientNextStep
        status={status}
        action={action}
        next={next}
        totalTtcCents={c.quote_total_ttc_cents}
        chantierId={c.chantier_id}
        artisan={c.artisan_name}
        calendar={{ title: c.title, location: address }}
      />
      <ReceptionBlocks
        detail={detail}
        retour={retour}
        balanceCents={progress?.remainingCents ?? 0}
        onChanged={onChanged}
      />
      {reviewInvited(status, detail.reviewed) ? (
        <FicheCard gap={3}>
          <CardHeading title={t.reviewInvite.title(c.artisan_name)} size={17} />
          <Body muted>{t.reviewInvite.text(c.artisan_name)}</Body>
          <FicheButton
            tall
            label={t.reviewInvite.cta(c.artisan_name)}
            onPress={() => router.push(`/chantier/${c.chantier_id}/avis`)}
          />
        </FicheCard>
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

      <ArtisanCard
        name={c.artisan_name}
        trade={c.trade_label}
        photoUrl={detail.avatarUrl}
        phone={c.artisan_phone}
        insured={detail.insurer !== null}
        onMessage={() => router.push(`/conversation/${c.chantier_id}`)}
      />

      <FicheCard padding={5} gap={3}>
        <CardHeading title={t.journal.title} />
        {detail.timeline.length === 0 ? (
          <Body muted>
            {STARTED.includes(status)
              ? t.journal.clientEmpty(c.artisan_name)
              : t.journal.clientWaiting(c.artisan_name)}
          </Body>
        ) : (
          <JournalTimeline
            days={detail.timeline}
            photoUrlByPath={detail.photoUrlByPath}
            // Entrée d'un membre de l'équipe de l'artisan (ADR 0243) : son nom ; sinon l'artisan.
            authorOf={(day) =>
              day.messages.map((m) => detail.journalAuthors[m.id]).find(Boolean) ?? null
            }
          />
        )}
      </FicheCard>

      <ClientMoneyCard
        totalTtcCents={c.quote_total_ttc_cents}
        progress={progress}
        depositPaid={c.deposit_status === "paye"}
        balancePaid={c.balance_status === "paye"}
        beforeReception={!RECEIVED.includes(status)}
      />
      <DocumentsCard documents={detail.documents} />
      {c.received_at ? (
        <WarrantyCard receivedOn={parisToday(new Date(c.received_at))} insurer={detail.insurer} />
      ) : null}

      {status === "cloture" ? (
        <FicheButton
          label={t.rehire(c.artisan_name)}
          variant="secondary"
          onPress={() => rehire(c)}
        />
      ) : null}
      <View style={styles.footerLinks}>
        <FicheLink
          icon={ShieldAlert}
          tone="danger"
          label={t.report}
          onPress={() => router.push(`/chantier/${c.chantier_id}/signaler`)}
        />
        {CANCELLABLE.includes(status) ? (
          <FicheLink
            icon={CircleX}
            tone="danger"
            label={fr.clientCancel.chantier.open}
            onPress={() =>
              router.push({
                pathname: "/chantier/[id]/annuler",
                params: { id: c.chantier_id, artisan: c.artisan_name },
              })
            }
          />
        ) : null}
      </View>
    </FicheScreen>
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
  description: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  dispute: { gap: spacing(2) },
  footerLinks: { gap: spacing(1), paddingTop: spacing(1) },
});
