import {
  CLIENT_CANCELLABLE_STATUSES,
  chantierStepIndex,
  nextIntervention,
  parisToday,
  paymentProgress,
  type ChantierStatus,
} from "@menao/core";
import { router } from "expo-router";
import { CircleCheck, FileText, MapPin } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { actionOf, addressOf, tagOf } from "./chantier-card";
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
import type { ChantierDetail, ChantierDocument } from "@/lib/chantiers";
import { formatAgo, formatCents, formatDateNumeric } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import { Body, Card, Chip, LinkText, Notice, Screen, Title } from "@/ui";
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
        <Card>
          <Text style={styles.heading}>{t.journal.title}</Text>
          {detail.journal.lastUpdateAt && (
            <Text style={styles.meta}>
              {t.journal.lastUpdate(formatAgo(detail.journal.lastUpdateAt))}
            </Text>
          )}
          {!STARTED.includes(status) ? (
            <Body muted>{t.journal.clientWaiting(c.artisan_name)}</Body>
          ) : detail.journal.messages.length === 0 && detail.photoUrls.length === 0 ? (
            <Body muted>{t.journal.clientEmpty(c.artisan_name)}</Body>
          ) : null}
          {detail.photoUrls.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photos}
            >
              {detail.photoUrls.map((uri, i) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={styles.photo}
                  alt={`${t.journal.photosTitle} ${i + 1}`}
                />
              ))}
            </ScrollView>
          )}
          {detail.journal.messages.map((m) => (
            <View key={m.id} style={styles.message}>
              <Text style={styles.messageText}>{m.message}</Text>
              <Text style={styles.small}>{t.journal.messageLeft(formatAgo(m.createdAt))}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <>
          <Card>
            <Text style={styles.heading}>{t.dossier.schedule}</Text>
            {progress && c.quote_total_ttc_cents !== null ? (
              <>
                <Line label={t.dossier.total} value={formatCents(c.quote_total_ttc_cents)} />
                <Line label={t.dossier.paid} value={formatCents(progress.paidCents)} />
                <Line
                  label={t.dossier.remaining}
                  value={formatCents(progress.remainingCents)}
                  strong
                />
              </>
            ) : (
              <Body muted>{t.dossier.noSchedule}</Body>
            )}
          </Card>
          <Card>
            <Text style={styles.heading}>{t.dossier.documents}</Text>
            {detail.documents.length === 0 ? (
              <Body muted>{t.dossier.noDocuments}</Body>
            ) : (
              <>
                {detail.documents.map((d) => (
                  <DocumentRow key={`${d.kind}-${d.id}`} document={d} />
                ))}
              </>
            )}
          </Card>
          {c.received_at ? (
            <WarrantyCard
              receivedOn={parisToday(new Date(c.received_at))}
              insurer={detail.insurer}
            />
          ) : null}
        </>
      )}
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

/** Document du dossier : PDF produit pour le compte, puis proposé au partage du téléphone. */
function DocumentRow({ document: d }: { document: ChantierDocument }) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  const title =
    d.kind === "devis"
      ? d.signed
        ? t.dossier.signedQuote
        : t.dossier.quote
      : d.kind === "pv"
        ? t.reception.pvDocument
        : t.dossier.invoice[d.kind];
  async function open() {
    setFailed(false);
    setDownloading(true);
    const ok = await sharePdf(
      d.kind === "devis"
        ? { quoteId: d.id }
        : d.kind === "pv"
          ? { receptionId: d.id }
          : { invoiceId: d.id },
      d.numero,
    );
    setDownloading(false);
    setFailed(!ok);
  }
  return (
    <View style={styles.documentItem}>
      <Pressable
        role="button"
        aria-label={`${title}, ${t.dossier.meta(d.numero, formatDateNumeric(d.date))}`}
        aria-busy={downloading}
        disabled={downloading}
        style={styles.document}
        onPress={open}
      >
        <View style={styles.docIcon}>
          {downloading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <FileText size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.meta}>{t.dossier.meta(d.numero, formatDateNumeric(d.date))}</Text>
        </View>
      </Pressable>
      {failed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
    </View>
  );
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.meta, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]}>{value}</Text>
    </View>
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
  footerLinks: { alignItems: "center", gap: spacing(4), paddingVertical: spacing(2) },
  dangerLink: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  photos: { gap: spacing(3) },
  photo: {
    width: 150,
    height: 112,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
  },
  message: {
    gap: spacing(1),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    padding: spacing(3),
  },
  messageText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  lineValue: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  lineStrong: { fontFamily: font.bold, color: colors.foreground },
  documentItem: { gap: spacing(2) },
  document: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  flex: { flex: 1, gap: 2 },
});
