import { ARTISAN_CANCELLABLE_STATUSES, type ChantierStatus } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarDays, NotebookPen } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { DetailBlock, RequestBlocks } from "@/components/pro/request-blocks";
import { SentQuoteBlock } from "@/components/pro/sent-quote-block";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDay, formatDayAndTime } from "@/lib/format";
import { loadArtisanChantier } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAppointment;
const { colors, font, radius, spacing } = theme;
const CANCELLABLE: readonly ChantierStatus[] = ARTISAN_CANCELLABLE_STATUSES;

/**
 * Vue d'un rendez-vous côté artisan (F-18), comme sur le site (maquette « Vue d'un rendez-vous ») :
 * date et heure (modifiables tant que le rendez-vous est planifié), écrire au client, dernier devis
 * envoyé, client et lieu, rappel du chantier, notes privées, annulation. Aucun lien vers le site
 * (règle 10).
 */
export default function ArtisanChantierScreen() {
  const { id, envoye } = useLocalSearchParams<{ id: string; envoye?: string }>();
  const load = useCallback(() => loadArtisanChantier(id), [id]);
  const [data] = useFocusData(load);

  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (data === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.proChantiers.notFound}</Notice>
      </Screen>
    );
  }

  const c = data.detail;
  const status = c.chantier.status;
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const planned = status === "rdv_planifie" && appointment !== null;
  const awaitingQuote = status === "rdv_planifie" || status === "devis_en_revision";
  const when = appointment ? formatDayAndTime(appointment.starts_at) : null;

  return (
    <Screen
      header={<TopBar />}
      footer={
        CANCELLABLE.includes(status) ? (
          <Button
            label={t.cancel}
            variant="ghost"
            onPress={() => router.push(`/pro-chantier/${id}/annuler`)}
          />
        ) : undefined
      }
    >
      <View style={styles.head}>
        <Title>{c.chantier.title}</Title>
        <StatusPill
          text={fr.proChantiers.status[status]}
          tone={status === "annule" || status === "devis_refuse" ? "neutral" : "primary"}
        />
      </View>
      {envoye === "1" && status === "devis_envoye" ? (
        <Notice tone="success">{fr.proQuote.send.sent}</Notice>
      ) : null}
      {status === "annule" ? (
        <Notice tone="info">
          {t.cancelled(formatDay(c.chantier.cancelled_at ?? c.chantier.created_at))}
        </Notice>
      ) : null}

      {appointment && when ? (
        <View style={styles.appointment}>
          <View style={styles.row}>
            <CalendarDays size={18} color={colors["primary-foreground"]} />
            <Text style={styles.appointmentText}>{`${when.day} à ${when.time}`}</Text>
          </View>
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
              <Text style={styles.appointmentLink}>{t.reschedule}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Button
        label={t.writeClient}
        variant="secondary"
        onPress={() => router.push(`/conversation/${id}`)}
      />
      {awaitingQuote ? (
        <Button
          label={
            status === "devis_en_revision"
              ? fr.proQuote.edit
              : data.hasDraft
                ? fr.proQuote.resume
                : fr.proQuote.create
          }
          onPress={() => router.push(`/pro-chantier/${id}/devis`)}
        />
      ) : null}

      {data.sentQuote ? (
        <SentQuoteBlock
          quote={data.sentQuote}
          deposit={data.deposit}
          invoice={data.depositInvoice}
        />
      ) : null}
      <RequestBlocks detail={c} photoUrls={data.photoUrls} variant="rendez-vous" />

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
  head: { gap: spacing(2) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  appointment: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    padding: spacing(4),
  },
  appointmentText: { fontFamily: font.medium, fontSize: 16, color: colors["primary-foreground"] },
  appointmentLink: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors["primary-foreground"],
    textDecorationLine: "underline",
  },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  link: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  notesButton: { paddingVertical: spacing(1) },
  report: { alignSelf: "center", paddingVertical: spacing(2) },
  danger: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
});
