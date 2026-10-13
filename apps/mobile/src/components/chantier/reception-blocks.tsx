import type { ChantierStatus } from "@menao/core";
import { router } from "expo-router";
import { ClipboardCheck } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import type { ChantierDetail } from "@/lib/chantiers";
import { formatCents, formatDateNumeric } from "@/lib/format";
import { confirmReservesLifted } from "@/lib/reception";
import { Body, Button, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier.reception;
const { colors, font, radius, spacing } = theme;

/**
 * Fin de chantier côté client (F-25, F-26), comme sur le site : réception à valider (avec ou sans
 * réserves), réserves en cours de levée, puis réception validée. `retour` : fin de la signature du
 * PV ou du paiement du solde, en cours d'enregistrement.
 */
export function ReceptionBlocks({
  detail,
  retour,
  balanceCents,
  onChanged,
}: {
  detail: ChantierDetail;
  retour?: string;
  /** Solde restant à payer (total TTC − acomptes), toujours calculé. */
  balanceCents: number;
  onChanged: () => void;
}) {
  const { c, reception } = detail;
  const status = c.status as ChantierStatus;

  if (status === "travaux_termines") {
    return (
      <>
        {retour === "reception" ? <Notice tone="info">{t.processing}</Notice> : null}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <ClipboardCheck size={16} color={colors["primary-strong"]} />
            <Text style={styles.title}>{t.title}</Text>
          </View>
          <Text style={styles.meta}>{t.text(c.artisan_name)}</Text>
          <Button
            label={t.validate}
            onPress={() => router.push(`/chantier/${c.chantier_id}/reception`)}
          />
          <Button
            label={t.addReserves}
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: "/chantier/[id]/reception",
                params: { id: c.chantier_id, reserves: "1" },
              })
            }
          />
        </View>
      </>
    );
  }
  if (status === "reserves_a_lever") {
    return (
      <>
        {reception?.reserves ? (
          <View style={styles.reserves}>
            <Text role="heading" style={styles.reservesTitle}>
              {t.yourReserves}
            </Text>
            <Text style={styles.reservesText}>{reception.reserves}</Text>
            <Text style={styles.meta}>{t.reservesNext}</Text>
          </View>
        ) : null}
        {reception?.liftSignaledAt ? (
          <Notice tone="info">
            {t.liftSignaled(c.artisan_name, formatDateNumeric(reception.liftSignaledAt))}
            {reception.liftMessage ? `\n« ${reception.liftMessage} »` : ""}
          </Notice>
        ) : null}
        <ConfirmLift chantierId={c.chantier_id} balanceCents={balanceCents} onDone={onChanged} />
      </>
    );
  }
  if (status === "receptionne") {
    if (retour === "paiement") return <Notice tone="info">{t.balanceProcessing}</Notice>;
    return c.received_at ? (
      <Notice tone="success">{t.received(formatDateNumeric(c.received_at))}</Notice>
    ) : null;
  }
  return null;
}

/** F-26 « Confirmer la levée des réserves », après la question « Le chantier est-il parfait ? ». */
function ConfirmLift({
  chantierId,
  balanceCents,
  onDone,
}: {
  chantierId: string;
  balanceCents: number;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function confirm() {
    setFailure(null);
    setPending(true);
    const error = await confirmReservesLifted(chantierId);
    setPending(false);
    if (error) return setFailure(error);
    setOpen(false);
    onDone();
  }

  if (!open) return <Button label={t.confirmLift} onPress={() => setOpen(true)} />;
  return (
    <View style={styles.card}>
      <Text role="heading" style={styles.title}>
        {t.perfectTitle}
      </Text>
      <Body muted>{t.perfectText(formatCents(balanceCents))}</Body>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.confirmLift} onPress={confirm} loading={pending} />
      <Button label={t.cancel} variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(2.5),
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  title: { fontFamily: font.medium, fontSize: 15, color: colors["primary-strong"] },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  reserves: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  reservesTitle: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  reservesText: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
});
