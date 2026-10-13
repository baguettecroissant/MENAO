import {
  chantierStepIndex,
  nextIntervention,
  paymentProgress,
  type ChantierStatus,
} from "@menao/core";
import * as WebBrowser from "expo-web-browser";
import { FileText, MapPin } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { actionOf, addressOf, tagOf } from "./chantier-card";
import {
  ActionCard,
  ChantierCover,
  ChantierStepper,
  NextInterventionCard,
  PersonRow,
  StatusPill,
} from "./parts";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import type { ChantierDetail } from "@/lib/chantiers";
import { env } from "@/lib/env";
import { formatAgo, formatCents, formatDateNumeric } from "@/lib/format";
import { Body, Card, Chip, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
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
 * action attendue ou prochaine intervention, puis « Suivi » (journal de l'artisan) et « Dossier »
 * (échéancier toujours calculé, documents).
 */
/**
 * Vue d'un chantier côté client (F-12, maquette « Vue d'un chantier ») : avancement, artisan,
 * action attendue ou prochaine intervention, puis « Suivi » (journal de l'artisan) et « Dossier »
 * (échéancier toujours calculé, documents).
 */
export function ChantierView({
  detail,
  initialTab = "suivi",
}: {
  detail: ChantierDetail;
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
        </Card>
      )}
      <Card>
        <PersonRow
          name={c.artisan_name}
          detail={c.trade_label}
          photoUrl={detail.avatarUrl}
          phone={c.artisan_phone}
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
                  <Pressable
                    key={`${d.kind}-${d.id}`}
                    role="link"
                    style={styles.document}
                    onPress={() =>
                      WebBrowser.openBrowserAsync(
                        `${env.siteUrl}/${d.kind === "devis" ? "devis" : "factures"}/${d.id}/pdf`,
                      )
                    }
                  >
                    <View style={styles.docIcon}>
                      <FileText size={20} color={colors.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.docTitle}>
                        {d.kind === "devis" ? t.dossier.signedQuote : t.dossier.invoice[d.kind]}
                      </Text>
                      <Text style={styles.meta}>
                        {t.dossier.meta(d.numero, formatDateNumeric(d.date))}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                <Text style={styles.small}>{t.dossier.openOnSite}</Text>
              </>
            )}
          </Card>
        </>
      )}
    </Screen>
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
