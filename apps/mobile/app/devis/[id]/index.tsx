import { depositAboveAdvice, trancheAmount } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FilePen, X } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { QuotePaper } from "@/components/documents/quote-paper";
import { ActionSubmit, SectionLabel, TipNote } from "@/components/pro/action-kit";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheButton, FicheScreen, FicheSkeleton, FicheTag } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay } from "@/lib/format";
import { sharePdf, type PdfTarget } from "@/lib/pdf";
import { loadQuote, type ClientQuote } from "@/lib/quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { celebrate, LinkText, Notice } from "@/ui";
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

/** Paiement de l'acompte encore à faire : prévu (pas de devis sans acompte), rien de payé ni en cours. */
const depositDue = (q: ClientQuote) =>
  q.status === "signe" &&
  trancheAmount(q.data.schedule, "signature") > 0 &&
  q.deposit?.status !== "paye" &&
  q.deposit?.status !== "en_cours";

/**
 * Devis reçu par le client (F-21), comme sur le site : contenu figé à l'envoi, PDF, signature,
 * acompte, demande de modification ou refus. `retour` : fin de la signature ou du paiement.
 * Refonte « Nette » (lot 11) : barre du haut, grand titre et pastille d'état, conseil MENAO sur
 * fond jaune clair, bouton principal collé en bas.
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
  const [quote] = useFocusData(load, waiting);
  // Signature ou acompte tout juste enregistrés au retour de la page sécurisée : moment de
  // réussite, une seule fois (ADR 0197).
  const celebrated = useRef(false);
  const signedNow = retour === "signature" && quote?.status === "signe";
  const paidNow = retour === "paiement" && quote?.deposit?.status === "paye";
  useEffect(() => {
    if (celebrated.current || !(signedNow || paidNow)) return;
    celebrated.current = true;
    celebrate(paidNow ? fr.moments.depositPaid : fr.moments.quoteSigned);
  }, [signedNow, paidNow]);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [downloading, setDownloading] = useState<PdfTarget | null>(null);

  async function download(target: PdfTarget, name: string) {
    setPdfFailed(false);
    setDownloading(target);
    const ok = await sharePdf(target, name);
    setDownloading(null);
    setPdfFailed(!ok);
  }

  if (quote === undefined) return <FicheSkeleton title={t.titleFallback} />;
  if (quote === null) {
    return (
      <FicheScreen title={t.titleFallback}>
        <Notice tone="error">{t.notFound}</Notice>
      </FicheScreen>
    );
  }

  const deposit = quote.data.schedule.find((s) => s.trigger === "signature");
  // Conseil au client (ADR 0158) : acompte de plus de 30 %.
  const advisedDeposit = depositAboveAdvice(quote.data.schedule);
  const name = quote.data.numero ?? "devis";
  const footer =
    quote.status === "envoye" ? (
      <ActionSubmit label={t.sign} onPress={() => router.push(`/devis/${id}/signature`)} />
    ) : depositDue(quote) ? (
      <ActionSubmit
        label={t.payDeposit(formatCents(deposit?.amountCents ?? 0))}
        onPress={() => router.push(`/devis/${id}/acompte`)}
      />
    ) : undefined;

  return (
    <FicheScreen title={t.titleFallback} footer={footer}>
      <View style={styles.head}>
        <PageHead title={quote.artisan ? t.title(quote.artisan) : t.titleFallback} />
        <View style={styles.status}>
          <FicheTag text={t.statuses[quote.status]} tone={TONE[quote.status]} />
          {quote.status === "envoye" && quote.validUntil ? (
            <Text style={styles.validity}>{t.validUntil(formatDay(quote.validUntil))}</Text>
          ) : null}
        </View>
      </View>

      {advisedDeposit !== null &&
      (quote.status === "envoye" ||
        (quote.status === "signe" &&
          quote.deposit?.status !== "paye" &&
          quote.deposit?.status !== "en_cours")) ? (
        <TipNote label={t.depositAdviceLabel} text={t.depositAdvice(advisedDeposit)} />
      ) : null}
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
                quote.depositInvoice && router.push(`/document/facture/${quote.depositInvoice.id}`)
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

      <View style={styles.paper}>
        <SectionLabel text={t.document} />
        <QuotePaper model={quote.model} logoUrl={quote.logoUrl} />
      </View>
      {pdfFailed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
      <FicheButton
        label={quote.status === "signe" ? t.signedPdf : t.pdf}
        variant="secondary"
        icon={Download}
        loading={downloading !== null && "quoteId" in downloading}
        onPress={() => download({ quoteId: id }, name)}
      />
      {quote.status === "envoye" ? (
        <View style={styles.responses}>
          <Text style={styles.small}>{t.signature.depositNext}</Text>
          <FicheButton
            label={t.requestChange}
            variant="secondary"
            icon={FilePen}
            onPress={() => router.push(`/devis/${id}/modifier`)}
          />
          <FicheButton
            label={t.refuse}
            variant="secondary"
            icon={X}
            onPress={() => router.push(`/devis/${id}/refuser`)}
          />
        </View>
      ) : null}
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(2.5) },
  status: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(3) },
  validity: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  paid: { gap: spacing(2) },
  paper: { gap: spacing(2.5) },
  responses: { gap: spacing(2.5) },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
});
