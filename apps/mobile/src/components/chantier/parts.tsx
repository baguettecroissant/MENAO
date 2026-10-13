import {
  CHANTIER_STEPS,
  type ChantierStatus,
  type ClientChantierAction,
  type NextIntervention,
} from "@menao/core";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  CreditCard,
  FilePen,
  Phone,
  Wrench,
} from "lucide-react-native";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { formatCents, formatDateNumeric, formatDayAndTime } from "@/lib/format";
import { Button } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
const { colors, font, radius, spacing } = theme;

export type Tone = "primary" | "success" | "warning" | "neutral" | "danger";
export type ChantierTag = { text: string; tone: Tone; dot: boolean };

/** Pastille de l'état du chantier, mêmes règles que sur le site. */
export function chantierTag(c: {
  status: ChantierStatus;
  startAt: string | null;
  finishedAt: string | null;
  closedAt: string | null;
  receivedAt: string | null;
}): ChantierTag {
  switch (c.status) {
    case "planifie":
      return {
        text: c.startAt ? t.startPlanned(formatDateNumeric(c.startAt)) : t.clientStatus.planifie,
        tone: "primary",
        dot: false,
      };
    case "en_cours":
      return { text: t.inProgress, tone: "primary", dot: true };
    case "travaux_termines":
      return {
        text: c.finishedAt
          ? t.finishedOn(formatDateNumeric(c.finishedAt))
          : t.clientStatus.travaux_termines,
        tone: "success",
        dot: false,
      };
    case "reserves_a_lever":
      return { text: t.clientStatus.reserves_a_lever, tone: "warning", dot: false };
    case "receptionne":
      return {
        text: c.receivedAt
          ? t.receivedOn(formatDateNumeric(c.receivedAt))
          : t.clientStatus.receptionne,
        tone: "success",
        dot: false,
      };
    case "cloture":
      return {
        text: c.closedAt ? t.closedOn(formatDateNumeric(c.closedAt)) : t.clientStatus.cloture,
        tone: "success",
        dot: false,
      };
    case "annule":
      return {
        text: c.closedAt ? t.cancelledOn(formatDateNumeric(c.closedAt)) : t.clientStatus.annule,
        tone: "neutral",
        dot: false,
      };
    case "devis_refuse":
      return { text: t.quoteRefused, tone: "neutral", dot: false };
    case "en_litige":
      return { text: t.clientStatus.en_litige, tone: "danger", dot: true };
    default:
      return { text: t.clientStatus[c.status], tone: "primary", dot: false };
  }
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: colors["primary-softer"], fg: colors["primary-strong"] },
  success: { bg: colors["success-soft"], fg: colors.success },
  warning: { bg: colors["warning-soft"], fg: colors.warning },
  neutral: { bg: colors.background, fg: colors["muted-foreground"] },
  danger: { bg: colors["danger-soft"], fg: colors.danger },
};

export function StatusPill({
  text,
  tone,
  dot = false,
}: {
  text: string;
  tone: Tone;
  dot?: boolean;
}) {
  const c = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      {dot && <View style={[styles.pillDot, { backgroundColor: c.fg }]} />}
      <Text style={[styles.pillText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

/** Couverture du chantier : première photo du projet, sinon un dégradé bleu et une clé. */
export function ChantierCover({ url, height = 150 }: { url: string | null; height?: number }) {
  return url ? (
    <Image source={{ uri: url }} style={[styles.cover, { height }]} alt="" />
  ) : (
    <View style={[styles.cover, styles.coverEmpty, { height }]}>
      <Wrench size={36} color={colors["primary-foreground"]} strokeWidth={1.5} />
    </View>
  );
}

/** Stepper en 5 étapes (spec §9), `current` venant de chantierStepIndex. */
export function ChantierStepper({ current }: { current: number }) {
  const n = CHANTIER_STEPS.length;
  // Trait continu derrière les ronds, du premier au dernier, rempli jusqu'à l'étape en cours.
  const fill = Math.min(1, Math.max(0, current / (n - 1)));
  return (
    <View style={styles.stepper} aria-label={t.stepsLabel}>
      <View style={[styles.track, { left: `${50 / n}%`, right: `${50 / n}%` }]}>
        <View style={[styles.trackFill, { width: `${fill * 100}%` }]} />
      </View>
      {CHANTIER_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.stepDot,
                state === "done" && styles.stepDone,
                state === "current" && styles.stepCurrent,
                state === "upcoming" && styles.stepUpcoming,
              ]}
            >
              {state === "done" && (
                <Check size={13} color={colors["primary-strong"]} strokeWidth={2.6} />
              )}
              {state === "current" && <View style={styles.stepCurrentInner} />}
            </View>
            <Text
              style={[styles.stepLabel, state === "current" && styles.stepLabelCurrent]}
              numberOfLines={1}
            >
              {t.steps[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Artisan du chantier : photo, nom, métier, et l'appel une fois les coordonnées échangées. */
export function PersonRow({
  name,
  detail,
  photoUrl,
  phone,
}: {
  name: string;
  detail: string | null;
  photoUrl: string | null;
  phone?: string | null;
}) {
  return (
    <View style={styles.person}>
      <Text style={styles.personLabel}>{t.yourArtisan}</Text>
      <View style={styles.personRow}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} alt="" />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.personText}>
          <Text style={styles.personName}>{name}</Text>
          <View style={styles.personMeta}>
            <Text style={styles.meta}>{detail}</Text>
            <BadgeCheck size={14} color={colors.primary} aria-label={t.verified} />
          </View>
        </View>
        {phone ? (
          <Pressable
            role="link"
            aria-label={`${t.call} ${name}`}
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={styles.callButton}
          >
            <Phone size={18} color={colors["primary-strong"]} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Prochaine intervention : rendez-vous, puis démarrage des travaux. */
export function NextInterventionCard({ next }: { next: NextIntervention }) {
  const { day, time } = formatDayAndTime(next.startsAt);
  return (
    <View style={styles.next}>
      <View style={styles.nextTitle}>
        <CalendarDays size={16} color={colors["primary-strong"]} />
        <Text style={styles.nextTitleText}>{t.next.title}</Text>
      </View>
      <Text style={styles.nextWhen}>
        {next.kind === "rendez_vous" ? t.next.appointmentOn(day, time) : t.next.startOn(day, time)}
      </Text>
    </View>
  );
}

/**
 * Action attendue du client (devis à signer, acompte ou solde à payer). Provisoire : la page du
 * site s'ouvre, avec le compte du client (lot 6b, partie 5 : directement dans l'application).
 */
export function ActionCard({
  action,
  totalTtcCents,
  chantierId,
}: {
  action: ClientChantierAction;
  totalTtcCents: number | null;
  chantierId: string;
}) {
  const sign = action.kind === "signer_devis";
  const balance = action.kind === "payer_solde";
  function open() {
    // Provisoire : le paiement du solde arrive dans l'application avec la réception (partie 5b).
    if (balance)
      WebBrowser.openBrowserAsync(`${env.siteUrl}/mon-espace/chantiers/${chantierId}/solde`);
    else if (sign) router.push(`/devis/${action.quoteId}`);
    else router.push(`/devis/${action.quoteId}/acompte`);
  }
  return (
    <View style={styles.action}>
      <View style={styles.nextTitle}>
        {sign ? (
          <FilePen size={16} color={colors["primary-strong"]} />
        ) : (
          <CreditCard size={16} color={colors["primary-strong"]} />
        )}
        <Text style={styles.nextTitleText}>{sign ? t.action.signTitle : t.action.payTitle}</Text>
      </View>
      <Text style={styles.meta}>
        {sign
          ? t.action.signText
          : action.kind === "payer_solde"
            ? t.action.payBalanceText
            : t.action.payText}
      </Text>
      {!sign && <Text style={styles.amount}>{formatCents(action.amountCents)}</Text>}
      {sign && totalTtcCents !== null && (
        <Text style={styles.amount}>{formatCents(totalTtcCents)}</Text>
      )}
      <Button label={sign ? t.action.sign : t.action.pay} onPress={open} />
      {balance && <Text style={styles.small}>{t.action.onSite}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: font.medium, fontSize: 12 },
  cover: { width: "100%", backgroundColor: colors["primary-soft"] },
  coverEmpty: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: spacing(4),
    backgroundColor: "#a9b9fb",
  },
  stepper: { flexDirection: "row", alignItems: "flex-start" },
  track: { position: "absolute", top: 12, height: 2, backgroundColor: colors["border-strong"] },
  trackFill: { height: 2, backgroundColor: colors.primary },
  step: { flex: 1, alignItems: "center", gap: spacing(1.5) },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  stepDone: { borderColor: colors.primary, backgroundColor: colors["primary-soft"] },
  stepCurrent: { borderColor: colors.primary },
  stepUpcoming: { borderColor: colors["border-strong"], borderStyle: "dashed" },
  stepCurrentInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  stepLabel: { fontFamily: font.regular, fontSize: 10, color: colors["muted-foreground"] },
  stepLabelCurrent: { fontFamily: font.medium, color: colors["primary-strong"] },
  person: { gap: spacing(2) },
  personLabel: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  personRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarEmpty: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.medium, fontSize: 17, color: colors["primary-strong"] },
  personText: { flex: 1, gap: 2 },
  personName: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  personMeta: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  callButton: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    backgroundColor: colors["primary-softer"],
    alignItems: "center",
    justifyContent: "center",
  },
  next: {
    gap: spacing(1.5),
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
    padding: spacing(3.5),
  },
  nextTitle: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  nextTitleText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  nextWhen: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  action: {
    gap: spacing(2.5),
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  amount: { fontFamily: font.bold, fontSize: 24, color: colors.foreground },
  small: {
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
