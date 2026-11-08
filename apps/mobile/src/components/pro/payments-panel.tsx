import type { ConnectRequirementGroup } from "@menao/core";
import * as WebBrowser from "expo-web-browser";
import { Wallet } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { Payments } from "@/lib/payments";
import { LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { FicheButton, FicheCard } from "./fiche-kit";
import { IconSquare } from "./tools-kit";

const t = fr.proPayments;
const { colors, font, spacing } = theme;

/**
 * État du compte de paiement Stripe et prochaine action (ADR 0124), comme sur le site : démarrer
 * (compléments saisis dans MENAO, ADR 0215), reprendre ou compléter dans le formulaire Stripe.
 * Refonte « Nette » (lot 9, maquette « PaiementsDossierNette ») : au premier passage, une carte
 * « sans commission » (icône portefeuille) puis le formulaire des compléments dans sa carte.
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
  if (data.status === "a_demarrer") {
    return (
      <>
        <FicheCard padding={4.5} gap={3}>
          <IconSquare icon={Wallet} tone="success" />
          <Text style={styles.body}>{t.intro}</Text>
          <Text style={styles.muted}>{t.fees}</Text>
        </FicheCard>
        {prepare}
      </>
    );
  }
  return (
    <FicheCard padding={4.5} gap={3}>
      {data.status === "actif" ? (
        <>
          <Notice tone="success">{t.active}</Notice>
          {!data.payoutsEnabled ? (
            data.due.length > 0 ? (
              <>
                <Requirements title={t.duePayoutsTitle} groups={data.due} note={note} />
                <FicheButton label={t.complete} tall onPress={onStripe} loading={busy} />
              </>
            ) : (
              <Text style={styles.muted}>{t.payoutsPending}</Text>
            )
          ) : null}
          <LinkText
            label={t.dashboard}
            onPress={() => WebBrowser.openBrowserAsync("https://dashboard.stripe.com/")}
          />
        </>
      ) : data.status === "a_completer" ? (
        <>
          {data.due.length > 0 ? (
            <Requirements title={t.dueTitle} groups={data.due} note={note} />
          ) : (
            <Text style={styles.body}>{t.intro}</Text>
          )}
          <FicheButton
            label={data.due.length > 0 ? t.complete : t.resume}
            tall
            onPress={onStripe}
            loading={busy}
          />
          <Text style={styles.muted}>{t.embedded.website}</Text>
          <Text style={styles.muted}>{t.fees}</Text>
        </>
      ) : data.status === "verification" ? (
        <>
          <Notice tone="info">{t.verifying}</Notice>
          {data.pending.length > 0 ? (
            <Requirements title={t.verifyingItems} groups={data.pending} note={null} />
          ) : null}
          <FicheButton label={t.check} variant="secondary" onPress={onCheck} loading={busy} />
        </>
      ) : (
        <Notice tone="error">{t.refused}</Notice>
      )}
    </FicheCard>
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
      {note ? <Text style={styles.muted}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  muted: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  requirements: { gap: spacing(1.5) },
  requirementsTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  requirement: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.foreground },
});
