import { FileText } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DetailBlock } from "./request-blocks";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import type { DepositPayment, SentQuote } from "@/lib/pro-chantiers";
import { LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuoteSent;
const { colors, font, radius, spacing } = theme;

/**
 * Dernier devis envoyé du chantier (F-21), comme sur le site : numéro, montant, réponse du client,
 * PDF envoyé ou signé, puis acompte (F-31) et sa facture.
 */
export function SentQuoteBlock({
  quote,
  deposit,
  invoice,
}: {
  quote: SentQuote;
  deposit: DepositPayment | null;
  invoice: { id: string; numero: string } | null;
}) {
  const [failed, setFailed] = useState(false);
  async function share(target: { quoteId: string } | { invoiceId: string }, name: string) {
    setFailed(false);
    setFailed(!(await sharePdf(target, name)));
  }
  return (
    <DetailBlock icon={<FileText size={18} color={colors.primary} />} title={t.title}>
      {quote.numero ? (
        <Text style={styles.strong}>
          {t.summary(quote.numero, formatCents(quote.total_ttc_cents))}
        </Text>
      ) : null}
      {quote.sent_at && quote.valid_until ? (
        <Text style={styles.meta}>
          {t.sentOn(formatDay(quote.sent_at), formatDay(quote.valid_until))}
        </Text>
      ) : null}
      {quote.status === "envoye" ? <Text style={styles.text}>{t.waiting}</Text> : null}
      {quote.status === "signe" && quote.signed_at ? (
        <Text style={styles.success}>{t.signed(formatDay(quote.signed_at))}</Text>
      ) : null}
      {quote.status === "signe" ? (
        deposit?.status === "paye" && deposit.paid_at ? (
          <View style={styles.group}>
            <Text style={styles.success}>
              {t.depositPaid(formatCents(deposit.amount_cents), formatDay(deposit.paid_at))}
            </Text>
            {invoice ? (
              <LinkText
                label={t.depositInvoice(invoice.numero)}
                onPress={() => share({ invoiceId: invoice.id }, invoice.numero)}
              />
            ) : null}
          </View>
        ) : (
          <Text style={styles.text}>
            {deposit?.status === "en_cours" ? t.depositInProgress : t.depositWaiting}
          </Text>
        )
      ) : null}
      {quote.status === "revision_demandee" ? (
        <Text style={styles.strong}>{t.revision}</Text>
      ) : null}
      {quote.status === "refuse" && quote.refusal_reason ? (
        <Text style={styles.strong}>{t.refused(t.refusalReasons[quote.refusal_reason])}</Text>
      ) : null}
      {quote.client_message &&
      (quote.status === "revision_demandee" || quote.status === "refuse") ? (
        <Text style={styles.quote}>{quote.client_message}</Text>
      ) : null}
      <LinkText
        label={quote.status === "signe" ? t.viewSigned : t.viewPdf}
        onPress={() => share({ quoteId: quote.id }, quote.numero ?? "devis")}
      />
      {failed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
    </DetailBlock>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing(1.5) },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.foreground },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  success: { fontFamily: font.medium, fontSize: 14, color: colors.success },
  quote: {
    overflow: "hidden",
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
});
