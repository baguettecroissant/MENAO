import type { ConnectRequirementGroup } from "@menao/core";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { Payments } from "@/lib/payments";
import { Body, Button, Card, LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPayments;
const { colors, font, spacing } = theme;

/**
 * État du compte de paiement Stripe et prochaine action (ADR 0124), comme sur le site : démarrer
 * (compléments saisis dans MENAO, ADR 0215), reprendre ou compléter dans le formulaire Stripe.
 */
export function PaymentsPanel({
  data,
  busy,
  onStripe,
  onCheck,
  prepare,
}: {
  data: Payments;
  busy: boolean;
  /** Ouvre le formulaire Stripe (reprendre, compléter). */
  onStripe: () => void;
  /** Relit l'état du compte. */
  onCheck: () => void;
  /** Premier passage : formulaire des compléments, avant Stripe. */
  prepare: ReactNode;
}) {
  const note = data.deadline ? t.deadline(formatLongDate(data.deadline)) : null;
  return (
    <Card>
      <View style={styles.content}>
        {data.status === "actif" ? (
          <>
            <Notice tone="success">{t.active}</Notice>
            {!data.payoutsEnabled ? (
              data.due.length > 0 ? (
                <>
                  <Requirements title={t.duePayoutsTitle} groups={data.due} note={note} />
                  <Button label={t.complete} onPress={onStripe} loading={busy} />
                </>
              ) : (
                <Body muted>{t.payoutsPending}</Body>
              )
            ) : null}
            <LinkText
              label={t.dashboard}
              onPress={() => WebBrowser.openBrowserAsync("https://dashboard.stripe.com/")}
            />
          </>
        ) : data.status === "a_demarrer" ? (
          <>
            <Body>{t.intro}</Body>
            <Body muted>{t.fees}</Body>
            {prepare}
          </>
        ) : data.status === "a_completer" ? (
          <>
            {data.due.length > 0 ? (
              <Requirements title={t.dueTitle} groups={data.due} note={note} />
            ) : (
              <Body>{t.intro}</Body>
            )}
            <Button
              label={data.due.length > 0 ? t.complete : t.resume}
              onPress={onStripe}
              loading={busy}
            />
            <Body muted>{t.embedded.website}</Body>
            <Body muted>{t.fees}</Body>
          </>
        ) : data.status === "verification" ? (
          <>
            <Notice tone="info">{t.verifying}</Notice>
            {data.pending.length > 0 ? (
              <Requirements title={t.verifyingItems} groups={data.pending} note={null} />
            ) : null}
            <Button label={t.check} variant="secondary" onPress={onCheck} loading={busy} />
          </>
        ) : (
          <Notice tone="error">{t.refused}</Notice>
        )}
      </View>
    </Card>
  );
}

function Requirements({
  title,
  groups,
  note,
}: {
  title: string;
  groups: readonly ConnectRequirementGroup[];
  note: string | null;
}) {
  return (
    <View style={styles.requirements}>
      <Text style={styles.requirementsTitle}>{title}</Text>
      {groups.map((group) => (
        <Text key={group} style={styles.requirement}>
          {`• ${t.groups[group]}`}
        </Text>
      ))}
      {note ? <Body muted>{note}</Body> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing(3) },
  requirements: { gap: spacing(1.5) },
  requirementsTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  requirement: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.foreground },
});
