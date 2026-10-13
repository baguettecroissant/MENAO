import {
  chantierStepIndex,
  clientChantierAction,
  nextIntervention,
  type ChantierStatus,
} from "@menao/core";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type ClientChantier } from "@/lib/chantiers";
import { theme } from "@/ui/theme";
import {
  ActionCard,
  ChantierCover,
  ChantierStepper,
  NextInterventionCard,
  PersonRow,
  StatusPill,
  chantierTag,
} from "./parts";

const { colors, font, radius, spacing } = theme;

export const tagOf = (c: ClientChantier) =>
  chantierTag({
    status: c.status as ChantierStatus,
    startAt: c.start_at,
    finishedAt: c.finished_at,
    closedAt: c.closed_at,
    receivedAt: c.received_at,
  });

/** Adresse du chantier, ou à défaut son code postal et sa ville. */
export const addressOf = (c: ClientChantier) =>
  c.adresse || [c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null;

export const actionOf = (c: ClientChantier) =>
  clientChantierAction({
    status: c.status as ChantierStatus,
    quoteId: c.quote_id,
    quoteStatus: c.quote_status,
    depositCents: c.deposit_cents,
    depositStatus: c.deposit_status,
    balanceCents: c.balance_cents,
    balanceStatus: c.balance_status,
  });

const open = (c: ClientChantier) =>
  router.push({ pathname: "/chantier/[id]", params: { id: c.chantier_id } });

/**
 * Carte d'un chantier en cours (maquette « Mes chantiers ») : photo, état, titre, adresse,
 * stepper, artisan, puis l'action attendue ou la prochaine intervention.
 */
export function ChantierCard({
  c,
  photoUrl,
  avatarUrl,
}: {
  c: ClientChantier;
  photoUrl: string | null;
  avatarUrl: string | null;
}) {
  const status = c.status as ChantierStatus;
  const step = chantierStepIndex(status);
  const action = actionOf(c);
  const next = nextIntervention({ status, appointmentAt: c.appointment_at, startAt: c.start_at });
  const tag = tagOf(c);
  return (
    <View style={styles.card}>
      <Pressable role="link" onPress={() => open(c)} aria-label={c.title}>
        <ChantierCover url={photoUrl} />
        <View style={styles.body}>
          <StatusPill {...tag} />
          <Text style={styles.title}>{c.title}</Text>
          {addressOf(c) && (
            <View style={styles.address}>
              <MapPin size={14} color={colors["muted-foreground"]} />
              <Text style={styles.meta}>{addressOf(c)}</Text>
            </View>
          )}
          {c.description ? (
            <Text style={styles.meta} numberOfLines={3}>
              {c.description}
            </Text>
          ) : null}
          {step !== null && (
            <View style={styles.stepper}>
              <ChantierStepper current={step} />
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.side}>
        <PersonRow name={c.artisan_name} detail={c.trade_label} photoUrl={avatarUrl} />
        {action ? (
          <ActionCard
            action={action}
            totalTtcCents={c.quote_total_ttc_cents}
            chantierId={c.chantier_id}
          />
        ) : next ? (
          <NextInterventionCard next={next} />
        ) : null}
      </View>
    </View>
  );
}

/** Carte d'un chantier terminé, annulé ou au devis refusé. */
export function FinishedChantierCard({
  c,
  photoUrl,
}: {
  c: ClientChantier;
  photoUrl: string | null;
}) {
  return (
    <Pressable role="link" onPress={() => open(c)} style={styles.finished}>
      <View style={styles.finishedCover}>
        <ChantierCover url={photoUrl} height={96} />
      </View>
      <View style={styles.finishedBody}>
        <Text style={styles.finishedTitle} numberOfLines={2}>
          {c.title}
        </Text>
        <Text style={styles.meta}>{c.artisan_name}</Text>
        <StatusPill {...tagOf(c)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 1px 3px rgba(17, 23, 40, 0.06)",
  },
  body: { gap: spacing(2.5), padding: spacing(4) },
  title: { fontFamily: font.medium, fontSize: 18, lineHeight: 24, color: colors.foreground },
  address: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  stepper: { paddingTop: spacing(2) },
  side: {
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing(4),
  },
  finished: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  finishedCover: { width: 96 },
  finishedBody: { flex: 1, gap: spacing(1.5), padding: spacing(3) },
  finishedTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
});
