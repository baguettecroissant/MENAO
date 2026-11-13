import {
  APPOINTMENT_DURATION_MINUTES,
  CHANTIER_STEPS,
  type ChantierStatus,
  type ClientChantierAction,
  type NextIntervention,
} from "@menao/core";
import { router } from "expo-router";
import { Check, MessageCircle, Phone } from "lucide-react-native";
import { Linking, StyleSheet, Text, View } from "react-native";
import { AddToCalendar } from "./add-to-calendar";
import { Avatar } from "@/components/avatar";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheRow,
  FicheTag,
  NextStepCard,
} from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatCents, formatDayAndTime } from "@/lib/format";
import { Body } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
const { colors, font, radius, spacing } = theme;

/**
 * Briques de la fiche d'un chantier côté particulier, refonte « Nette » (lot 6, maquette
 * « ClientChantierApp ») : frise des 5 étapes, carte « Prochaine étape », carte de l'artisan et
 * « Argent du chantier ». Cartes et boutons repris des fiches de l'artisan (fiche-kit).
 */

/**
 * Frise des 5 étapes (spec §9) : pastilles vertes cochées pour les étapes franchies, bleu nuit
 * numérotée pour l'étape en cours, contour gris pour les suivantes ; `current` vient de
 * chantierStepIndex (CHANTIER_STEPS.length : tout est franchi).
 */
export function ClientStepper({ current }: { current: number }) {
  const n = CHANTIER_STEPS.length;
  const now = CHANTIER_STEPS[Math.min(current, n - 1)] ?? "signature";
  return (
    <FicheCard padding={3} gap={0}>
      <View
        style={styles.stepper}
        accessible
        aria-label={
          current >= n
            ? `${t.stepsLabel} : ${t.clientStatus.cloture}`
            : `${t.stepsLabel} : ${t.steps[now]}, ${current + 1}/${n}`
        }
      >
        {CHANTIER_STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "now" : "next";
          return (
            <View key={step} style={styles.step}>
              <View
                style={[
                  styles.dot,
                  state === "done" && styles.dotDone,
                  state === "now" && styles.dotNow,
                  state === "next" && styles.dotNext,
                ]}
              >
                {state === "done" ? (
                  <Check size={14} color={colors["primary-foreground"]} strokeWidth={3} />
                ) : (
                  <Text style={[styles.dotText, state === "next" && styles.dotTextNext]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <View style={styles.stepLabelBox}>
                <Text
                  style={[
                    styles.stepLabel,
                    state === "now" && styles.stepLabelNow,
                    state === "next" && styles.stepLabelNext,
                  ]}
                  numberOfLines={1}
                >
                  {t.steps[step]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </FicheCard>
  );
}

/**
 * « Prochaine étape » : action attendue du client (devis à signer, acompte ou solde à payer, avec
 * son bouton), sinon la prochaine intervention (à ajouter au calendrier), sinon pendant les
 * travaux, ce qui viendra ensuite. Rien dans les autres cas (la réception a ses propres blocs).
 */
export function ClientNextStep({
  status,
  action,
  next,
  totalTtcCents,
  chantierId,
  artisan,
  calendar,
}: {
  status: ChantierStatus;
  action: ClientChantierAction | null;
  next: NextIntervention | null;
  totalTtcCents: number | null;
  chantierId: string;
  artisan: string;
  calendar: { title: string; location: string | null };
}) {
  if (action?.kind === "payer_demarrage") {
    // Lot 40 (F-146) : carte violette « Travaux commencés » et paiement au démarrage.
    const percent =
      totalTtcCents && totalTtcCents > 0
        ? Math.round((action.amountCents * 100) / totalTtcCents)
        : null;
    return (
      <View style={styles.start}>
        <Text style={styles.startChip}>{fr.startPayment.chip}</Text>
        <Text style={styles.startTitle}>{fr.startPayment.title}</Text>
        {percent !== null ? (
          <Text style={styles.startText}>{fr.startPayment.action(percent)}</Text>
        ) : null}
        <Text style={styles.startAmount}>{formatCents(action.amountCents)}</Text>
        <FicheButton
          tall
          label={fr.startPayment.submit(formatCents(action.amountCents))}
          onPress={() => router.push(`/chantier/${chantierId}/demarrage`)}
        />
      </View>
    );
  }
  if (action) {
    const sign = action.kind === "signer_devis";
    const open = () => {
      if (action.kind === "payer_solde") router.push(`/chantier/${chantierId}/solde`);
      else if (sign) router.push(`/devis/${action.quoteId}`);
      else router.push(`/devis/${action.quoteId}/acompte`);
    };
    return (
      <NextStepCard
        title={sign ? t.action.signTitle : t.action.payTitle}
        text={
          sign
            ? t.action.signText
            : action.kind === "payer_solde"
              ? t.action.payBalanceText
              : t.action.payText
        }
      >
        <View>
          {!sign ? (
            <FicheRow label={t.action.dueNow} value={formatCents(action.amountCents)} />
          ) : null}
          {totalTtcCents !== null ? (
            <FicheRow label={t.dossier.total} value={formatCents(totalTtcCents)} />
          ) : null}
        </View>
        <FicheButton tall label={sign ? t.action.sign : t.action.pay} onPress={open} />
      </NextStepCard>
    );
  }
  if (next) {
    const { day, time } = formatDayAndTime(next.startsAt);
    return (
      <NextStepCard
        title={
          next.kind === "rendez_vous" ? t.next.appointmentOn(day, time) : t.next.startOn(day, time)
        }
      >
        <AddToCalendar
          uid={`${chantierId}-${next.kind}`}
          event={{
            start: new Date(next.startsAt),
            durationMinutes: APPOINTMENT_DURATION_MINUTES,
            summary:
              next.kind === "demarrage"
                ? t.next.startSummary(calendar.title)
                : t.next.summary(calendar.title),
            location: calendar.location,
            description: t.next.description(artisan),
          }}
        />
      </NextStepCard>
    );
  }
  if (status === "en_cours") {
    return <NextStepCard title={t.fiche.works.title(artisan)} text={t.fiche.works.text} />;
  }
  return null;
}

/**
 * Carte de l'artisan : photo, nom, métier, pastille de vérification (« Assuré et vérifié » quand
 * l'assureur décennal figure sur le devis), puis « Appeler » (numéro communiqué) et « Message ».
 */
export function ArtisanCard({
  name,
  trade,
  photoUrl,
  phone,
  insured,
  onMessage,
}: {
  name: string;
  trade: string | null;
  photoUrl: string | null;
  phone: string | null;
  insured: boolean;
  onMessage: () => void;
}) {
  return (
    <FicheCard padding={4.5} gap={3.5}>
      <View style={styles.artisan} accessible aria-label={t.fiche.artisanLabel(name, trade)}>
        <Avatar url={photoUrl} name={name} size={52} />
        <View style={styles.artisanText}>
          <Text style={styles.artisanName} numberOfLines={2}>
            {name}
          </Text>
          {trade ? <Text style={styles.meta}>{trade}</Text> : null}
          <FicheTag
            text={insured ? t.fiche.insuredVerified : t.fiche.verified}
            tone="success"
            dot
          />
        </View>
      </View>
      <View style={styles.buttons}>
        {phone ? (
          <FicheButton
            label={t.call}
            variant="secondary"
            icon={Phone}
            grow
            onPress={() => Linking.openURL(`tel:${phone}`)}
          />
        ) : null}
        <FicheButton label={fr.messages.button} icon={MessageCircle} grow onPress={onMessage} />
      </View>
    </FicheCard>
  );
}

/**
 * « Argent du chantier » : devis signé, déjà payé (acompte), puis ce qui reste à payer, toujours
 * recalculé à partir des paiements (règle 5 : solde = total − acomptes). Sans devis signé, le
 * texte habituel de l'échéancier.
 */
export function ClientMoneyCard({
  totalTtcCents,
  progress,
  depositPaid,
  balancePaid,
  beforeReception,
}: {
  totalTtcCents: number | null;
  progress: { paidCents: number; remainingCents: number } | null;
  /** Acompte payé et solde pas encore payé : « Acompte payé ». */
  depositPaid: boolean;
  balancePaid: boolean;
  /** Réception pas encore validée : le reste à payer est le « Solde, après la réception ». */
  beforeReception: boolean;
}) {
  const m = t.fiche.money;
  return (
    <FicheCard padding={5} gap={2.5}>
      <CardHeading title={m.title} size={17} />
      {progress && totalTtcCents !== null ? (
        <View>
          <FicheRow label={m.signedQuote} value={formatCents(totalTtcCents)} />
          {progress.paidCents > 0 ? (
            <FicheRow
              label={depositPaid && !balancePaid ? m.depositPaid : m.alreadyPaid}
              value={formatCents(progress.paidCents)}
              tone="success"
            />
          ) : null}
          {progress.remainingCents > 0 ? (
            <FicheRow
              label={depositPaid && beforeReception ? m.balanceAfter : m.remaining}
              value={formatCents(progress.remainingCents)}
            />
          ) : null}
        </View>
      ) : (
        <Body muted>{t.dossier.noSchedule}</Body>
      )}
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  start: {
    gap: spacing(2),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors["violet-soft"],
  },
  startChip: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: colors.violet,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    fontFamily: font.semibold,
    fontSize: 12,
    color: "#ffffff",
  },
  startTitle: { fontFamily: font.display, fontSize: 19, lineHeight: 24, color: colors.foreground },
  startText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  startAmount: {
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.foreground,
  },
  stepper: { flexDirection: "row", alignItems: "flex-start" },
  step: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing(1.5) },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.success },
  dotNow: { backgroundColor: colors.foreground },
  dotNext: { borderWidth: 2, borderColor: colors["border-strong"] },
  dotText: { fontFamily: font.bold, fontSize: 13, color: colors["primary-foreground"] },
  dotTextNext: { color: colors["muted-foreground"] },
  // Libellé un peu plus large que sa colonne (« Planification ») : il déborde sur les marges.
  stepLabelBox: { width: 80, alignItems: "center" },
  stepLabel: {
    textAlign: "center",
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.1,
    color: colors.foreground,
  },
  stepLabelNow: { fontFamily: font.bold },
  stepLabelNext: { color: colors["muted-foreground"] },
  artisan: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  artisanText: { flex: 1, minWidth: 0, gap: 3 },
  artisanName: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  buttons: { flexDirection: "row", gap: spacing(2) },
});
