import type { ArtisanChantierDetail } from "@menao/validation";
import { router } from "expo-router";
import { Check, Lock, MessageCircle, Navigation, Phone } from "lucide-react-native";
import type { ReactNode } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ExampleLock } from "@/components/examples";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheHead,
  FicheRow,
  FicheScreen,
  FicheStepper,
} from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatCents, formatDayAndTime, formatDayMonth } from "@/lib/format";
import type { DepositPayment } from "@/lib/pro-chantiers";
import { LinkText } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proChantierFiche;
const { colors, font, spacing } = theme;

/**
 * Cadre de la fiche d'un chantier côté artisan, refonte « Nette » (F-92), commun aux états avant
 * l'acompte (rendez-vous, devis) et au suivi (F-22) : barre « Chantier », puces, titre, ligne
 * « Client · lieu · résumé », rangée Message / Appeler / Itinéraire (selon les données), frise des
 * étapes, carte « Prochaine étape », puis le contenu de l'état.
 */
export function ChantierFrame({
  detail: c,
  tags,
  step,
  nextStep,
  footer,
  onRefresh,
  children,
}: {
  detail: ArtisanChantierDetail;
  tags: ReactNode;
  step: number | null;
  nextStep?: ReactNode;
  footer?: ReactNode;
  onRefresh?: () => Promise<unknown>;
  children: ReactNode;
}) {
  const id = c.chantier.id;
  const clientName = [c.client.first_name, c.client.last_name].filter(Boolean).join(" ");
  // Résumé de la demande, sauf s'il redit le titre du chantier.
  const summary =
    c.summary && c.summary.trim().toLowerCase() !== c.chantier.title.trim().toLowerCase()
      ? c.summary
      : null;
  const meta = [clientName, [c.code_postal, c.ville_nom].filter(Boolean).join(" "), summary]
    .filter(Boolean)
    .join(" · ");
  const phone = c.client.phone;
  const route = c.lat !== null && c.lon !== null ? { lat: c.lat, lon: c.lon } : null;

  return (
    <FicheScreen title={t.title} footer={footer} onRefresh={onRefresh}>
      <FicheHead tags={tags} title={c.chantier.title} meta={meta || null} />
      <View style={styles.quick}>
        <FicheButton
          label={t.quick.message}
          variant="secondary"
          icon={MessageCircle}
          grow
          onPress={() => router.push(`/conversation/${id}`)}
        />
        {phone ? (
          <FicheButton
            label={t.quick.call}
            variant="secondary"
            icon={Phone}
            grow
            onPress={() => Linking.openURL(`tel:${phone}`)}
          />
        ) : null}
        {route ? (
          <FicheButton
            label={t.quick.route}
            variant="secondary"
            icon={Navigation}
            grow
            onPress={() =>
              WebBrowser.openBrowserAsync(
                `https://www.openstreetmap.org/?mlat=${route.lat}&mlon=${route.lon}#map=17/${route.lat}/${route.lon}`,
              )
            }
          />
        ) : null}
      </View>
      {step !== null ? (
        <FicheCard padding={3} gap={0}>
          <FicheStepper current={step} />
        </FicheCard>
      ) : null}
      {nextStep}
      {children}
    </FicheScreen>
  );
}

/**
 * « Argent du chantier » (droits argent, ADR 0241) : devis signé en grand, barre de ce qui est
 * payé, acompte reçu et solde, toujours recalculés à partir des paiements (règle 5) ; liens vers
 * l'aperçu du devis et de la facture d'acompte (inactifs en exemple).
 */
export function MoneyCard({
  totalCents,
  progress,
  deposit,
  depositInvoiceId,
  quoteId,
  balance,
  start = null,
  example,
}: {
  totalCents: number;
  progress: { paidCents: number; remainingCents: number } | null;
  deposit: DepositPayment | null;
  depositInvoiceId: string | null;
  quoteId: string | null;
  /** Solde reçu (chantier clôturé). */
  balance: { paidAt: string; cents: number } | null;
  /** Paiement au démarrage des travaux (F-146), s'il est prévu. */
  start?: { cents: number; paidAt: string | null } | null;
  example: boolean;
}) {
  const paid = progress?.paidCents ?? 0;
  const share = totalCents > 0 ? Math.min(1, Math.max(0, paid / totalCents)) : 0;
  const depositPaid = deposit?.status === "paye" ? deposit : null;
  return (
    <FicheCard gap={3}>
      <CardHeading
        title={t.money.title}
        right={
          quoteId ? (
            <ExampleLock locked={example}>
              <LinkText
                label={t.money.viewQuote}
                onPress={() => router.push(`/document/devis/${quoteId}`)}
              />
            </ExampleLock>
          ) : null
        }
      />
      <View style={styles.tight}>
        <Text style={styles.meta}>{t.money.signedQuote}</Text>
        <Text style={styles.amount}>{formatCents(totalCents)}</Text>
      </View>
      <View
        style={styles.bar}
        role="progressbar"
        aria-label={t.money.progress(formatCents(paid), formatCents(totalCents))}
      >
        <View style={[styles.barFill, { width: `${share * 100}%` }]} />
      </View>
      <View>
        {depositPaid ? (
          <MoneyLine
            done
            label={t.money.depositReceived}
            detail={depositPaid.paid_at ? t.money.on(formatDayMonth(depositPaid.paid_at)) : null}
            amount={depositPaid.amount_cents}
          />
        ) : progress ? (
          <MoneyLine done label={t.money.alreadyPaid} detail={null} amount={progress.paidCents} />
        ) : null}
        {start ? (
          <MoneyLine
            done={start.paidAt !== null}
            label={start.paidAt ? t.money.startReceived : t.money.start}
            detail={start.paidAt ? t.money.on(formatDayMonth(start.paidAt)) : t.money.startWhen}
            amount={start.cents}
          />
        ) : null}
        {balance ? (
          <MoneyLine
            done
            label={t.money.balanceReceived}
            detail={t.money.on(formatDayMonth(balance.paidAt))}
            amount={balance.cents}
          />
        ) : progress ? (
          <MoneyLine
            done={false}
            label={t.money.balance}
            detail={t.money.balanceWhen}
            amount={progress.remainingCents}
          />
        ) : null}
      </View>
      {depositInvoiceId ? (
        <ExampleLock locked={example}>
          <LinkText
            label={t.money.depositInvoice}
            onPress={() => router.push(`/document/facture/${depositInvoiceId}`)}
          />
        </ExampleLock>
      ) : null}
    </FicheCard>
  );
}

function MoneyLine({
  done,
  label,
  detail,
  amount,
}: {
  done: boolean;
  label: string;
  detail: string | null;
  amount: number;
}) {
  return (
    <View style={styles.moneyLine}>
      {done ? (
        <View style={styles.checkDone}>
          <Check size={13} color={colors.success} strokeWidth={3} />
        </View>
      ) : (
        <View style={styles.checkTodo} />
      )}
      <View style={styles.flex}>
        <Text style={styles.lineLabel}>{label}</Text>
        {detail ? <Text style={styles.meta}>{detail}</Text> : null}
      </View>
      <Text style={styles.lineAmount}>{formatCents(amount)}</Text>
    </View>
  );
}

/**
 * « Planning » : date de démarrage (à confirmer tant qu'elle ne l'est pas), lien vers l'agenda et,
 * chantier planifié, « Modifier la date de démarrage ».
 */
export function PlanningCard({
  startAt,
  onEdit,
}: {
  startAt: string | null;
  onEdit: (() => void) | null;
}) {
  const start = startAt ? formatDayAndTime(startAt) : null;
  return (
    <FicheCard gap={2}>
      <CardHeading
        title={t.planning.title}
        link={{ label: t.planning.agenda, onPress: () => router.push("/pro-agenda") }}
      />
      <View>
        <FicheRow
          label={t.planning.start}
          value={start ? t.planning.startValue(start.day, start.time) : t.planning.toConfirm}
        />
      </View>
      {onEdit ? <LinkText label={t.planning.edit} onPress={onEdit} /> : null}
    </FicheCard>
  );
}

/** « Notes privées » du rendez-vous : texte, « Modifier » ou « Ajouter », mention de visibilité. */
export function NotesCard({
  chantierId,
  notes,
  example,
}: {
  chantierId: string;
  notes: string | null;
  example: boolean;
}) {
  return (
    <FicheCard gap={2}>
      <CardHeading
        title={fr.proAppointment.notes}
        link={
          example
            ? null
            : {
                label: notes ? t.notes.edit : t.notes.add,
                onPress: () =>
                  router.push({
                    pathname: "/pro-chantier/[id]/notes",
                    params: { id: chantierId, notes: notes ?? "" },
                  }),
              }
        }
      />
      {notes ? <Text style={styles.notes}>{notes}</Text> : null}
      <View style={styles.lockRow}>
        <Lock size={13} color={colors["muted-foreground"]} />
        <Text style={[styles.meta, styles.flex]}>{fr.proAppointment.notesHint}</Text>
      </View>
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: "row", gap: spacing(2) },
  tight: { gap: spacing(1) },
  flex: { flex: 1 },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  amount: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.9,
    color: colors.foreground,
  },
  bar: { height: 8, overflow: "hidden", borderRadius: 4, backgroundColor: colors.border },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  moneyLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    paddingVertical: spacing(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["success-soft"],
  },
  checkTodo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors["border-strong"],
  },
  lineLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  lineAmount: { fontFamily: font.display, fontSize: 16, color: colors.foreground },
  notes: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  lockRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.5) },
});
