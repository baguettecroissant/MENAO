import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { QuotePaper } from "@/components/documents/quote-paper";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay } from "@/lib/format";
import { sharePdf, type PdfTarget } from "@/lib/pdf";
import { loadQuote, type ClientQuote } from "@/lib/quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, LinkText, Notice, Screen, Section, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.quote;
const { colors, font, spacing } = theme;
const TONE = {
  brouillon: "neutral",
  envoye: "primary",
  signe: "success",
  refuse: "danger",
  revision_demandee: "warning",
  remplace: "neutral",
} as const;

/** Paiement de l'acompte encore à faire : rien de payé ni d'en cours de confirmation. */
const depositDue = (q: ClientQuote) =>
  q.status === "signe" && q.deposit?.status !== "paye" && q.deposit?.status !== "en_cours";

/**
 * Devis reçu par le client (F-21), comme sur le site : contenu figé à l'envoi, PDF, signature,
 * acompte, demande de modification ou refus. `retour` : fin de la signature ou du paiement.
 */
export default function QuoteScreen() {
  const { id, retour } = useLocalSearchParams<{ id: string; retour?: string }>();
  const load = useCallback(() => loadQuote(id), [id]);
  // Signature ou paiement terminés : relances jusqu'à leur enregistrement (webhook).
  const waiting = useCallback(
    (q: ClientQuote | null) =>
      q !== null &&
      ((retour === "signature" && q.status === "envoye") ||
        (retour === "paiement" && depositDue(q))),
    [retour],
  );
  const quote = useFocusData(load, waiting);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [downloading, setDownloading] = useState<PdfTarget | null>(null);

  async function download(target: PdfTarget, name: string) {
    setPdfFailed(false);
    setDownloading(target);
    const ok = await sharePdf(target, name);
    setDownloading(null);
    setPdfFailed(!ok);
  }

  if (quote === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (quote === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }

  const deposit = quote.data.schedule[0];
  const name = quote.data.numero ?? "devis";
  const footer =
    quote.status === "envoye" ? (
      <Button label={t.sign} onPress={() => router.push(`/devis/${id}/signature`)} />
    ) : depositDue(quote) ? (
      <Button
        label={t.payDeposit(formatCents(deposit?.amountCents ?? 0))}
        onPress={() => router.push(`/devis/${id}/acompte`)}
      />
    ) : undefined;

  return (
    <Screen header={<TopBar />} footer={footer}>
      <View style={styles.head}>
        <Title>{quote.artisan ? t.title(quote.artisan) : t.titleFallback}</Title>
        <View style={styles.status}>
          <StatusPill text={t.statuses[quote.status]} tone={TONE[quote.status]} />
          {quote.status === "envoye" && quote.validUntil ? (
            <Text style={styles.validity}>{t.validUntil(formatDay(quote.validUntil))}</Text>
          ) : null}
        </View>
      </View>

      {quote.status === "envoye" && retour === "signature" ? (
        <Notice tone="info">{t.signatureReturned}</Notice>
      ) : null}
      {quote.status === "signe" && quote.signedAt ? (
        <Notice tone="success">{t.signedNotice(formatDay(quote.signedAt))}</Notice>
      ) : null}
      {quote.deposit?.status === "paye" && quote.deposit.paidAt ? (
        <View style={styles.paid}>
          <Notice tone="success">
            {t.depositPaid(formatCents(quote.deposit.amountCents), formatDay(quote.deposit.paidAt))}
          </Notice>
          {quote.depositInvoice ? (
            <LinkText
              label={t.depositInvoice(quote.depositInvoice.numero)}
              onPress={() =>
                quote.depositInvoice &&
                download({ invoiceId: quote.depositInvoice.id }, quote.depositInvoice.numero)
              }
            />
          ) : null}
        </View>
      ) : quote.deposit?.status === "en_cours" ? (
        <Notice tone="info">{t.depositInProgress}</Notice>
      ) : quote.status === "signe" && retour === "paiement" ? (
        <Notice tone="info">{t.paymentReturned}</Notice>
      ) : null}
      {quote.status === "revision_demandee" ? (
        <Notice tone="info">
          {t.revisionNotice} {quote.clientMessage}
        </Notice>
      ) : null}
      {quote.status === "refuse" ? <Notice tone="info">{t.refusedNotice}</Notice> : null}
      {quote.status === "remplace" ? (
        <View style={styles.paid}>
          <Notice tone="info">{t.replacedNotice}</Notice>
          {quote.newerId ? (
            <LinkText
              label={t.seeNewVersion}
              onPress={() => quote.newerId && router.replace(`/devis/${quote.newerId}`)}
            />
          ) : null}
        </View>
      ) : null}

      <Section title={t.document}>
        <QuotePaper model={quote.model} logoUrl={quote.logoUrl} />
      </Section>
      {pdfFailed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
      <Button
        label={quote.status === "signe" ? t.signedPdf : t.pdf}
        variant="secondary"
        loading={downloading !== null && "quoteId" in downloading}
        onPress={() => download({ quoteId: id }, name)}
      />
      {quote.status === "envoye" ? (
        <View style={styles.responses}>
          <Body muted>{t.signature.depositNext}</Body>
          <Button
            label={t.requestChange}
            variant="ghost"
            onPress={() => router.push(`/devis/${id}/modifier`)}
          />
          <Button
            label={t.refuse}
            variant="ghost"
            onPress={() => router.push(`/devis/${id}/refuser`)}
          />
        </View>
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
  status: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(3) },
  validity: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  paid: { gap: spacing(2) },
  responses: { gap: spacing(1) },
});
