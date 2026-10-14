import {
  CLIENT_CANCELLABLE_STATUSES,
  chantierStepIndex,
  nextIntervention,
  parisToday,
  paymentProgress,
  reviewInvited,
  type ChantierStatus,
} from "@menao/core";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { ChevronLeft, CircleCheck, MapPin, MessageCircle, Phone } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import type { ChantierDetail } from "@/lib/chantiers";
import { formatDateNumeric } from "@/lib/format";
import { goBack } from "@/lib/navigation";
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
  const insets = useSafeAreaInsets();
  // Photo en haut de l'écran : barre d'état claire tant que la vue est affichée.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );
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
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing(6) }}>
        {/* Maquette « Vue d'un chantier » : grande photo bord à bord, retour rond. */}
        <View>
          <ChantierCover url={detail.coverUrl} height={230} />
          <Pressable
            role="button"
            aria-label={fr.nav.back}
            onPress={goBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.back,
              { top: insets.top + spacing(2) },
              pressed && styles.pressed,
            ]}
          >
            <ChevronLeft size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <Text role="heading" style={styles.title}>
            {c.title}
          </Text>
          {address ? (
            <View style={styles.row}>
              <MapPin size={14} color={colors["muted-foreground"]} />
              <Text style={styles.meta}>{address}</Text>
            </View>
          ) : null}
          <StatusPill {...tagOf(c)} />
          {c.description ? <Text style={styles.description}>{c.description}</Text> : null}
          <View style={styles.personCard}>
            <PersonRow name={c.artisan_name} detail={c.trade_label} photoUrl={detail.avatarUrl} />
          </View>
          <View style={styles.contact}>
            <View style={styles.contactButton}>
              <Button
                label={fr.messages.button}
                icon={MessageCircle}
                onPress={() => router.push(`/conversation/${c.chantier_id}`)}
              />
            </View>
            {c.artisan_phone ? (
              <View style={styles.contactButton}>
                <Button
                  label={t.call}
                  variant="secondary"
                  icon={Phone}
                  onPress={() => Linking.openURL(`tel:${c.artisan_phone}`)}
                />
              </View>
            ) : null}
          </View>
          {step !== null ? (
            <View style={styles.stepper}>
              <ChantierStepper current={step} />
            </View>
          ) : null}
          {status === "cloture" && c.closed_at ? (
            <View style={styles.row}>
              <CircleCheck size={16} color={colors.success} />
              <Text style={styles.meta}>{t.reception.closed(formatDateNumeric(c.closed_at))}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
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
            <Button
              label={t.rehire(c.artisan_name)}
              variant="secondary"
              onPress={() => rehire(c)}
            />
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  pressed: { opacity: 0.85 },
  back: {
    position: "absolute",
    left: spacing(4),
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(17, 23, 40, 0.18)",
  },
  identity: {
    gap: spacing(3),
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(5),
    paddingBottom: spacing(5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: font.medium, fontSize: 22, lineHeight: 28, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.foreground },
  personCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3.5),
  },
  contact: { flexDirection: "row", gap: spacing(3) },
  contactButton: { flex: 1 },
  stepper: { paddingTop: spacing(2) },
  content: { gap: spacing(4), padding: spacing(5) },
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
