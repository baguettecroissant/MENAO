import { SIGNATURE_CONSENTS, type SignatureConsent } from "@menao/core";
import { signatureConsentsSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { ConsentList, type ConsentItem } from "@/components/consents";
import { HeaderBand } from "@/components/header-band";
import { StepTabs } from "@/components/step-tabs";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { providerLinks, siteLinks } from "@/lib/env";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { sharePdf } from "@/lib/pdf";
import { loadQuote, startQuoteSignature } from "@/lib/quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, LinkText, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.quote;
const { colors, font, spacing } = theme;
const STEPS = [
  { key: "sign", label: t.steps.sign },
  { key: "deposit", label: t.steps.deposit },
] as const;

/**
 * Signature du devis (F-13), comme sur le site : rappel du devis et de l'échéancier, cases à
 * cocher, puis signature chez DocuSeal (code à usage unique) dans la fenêtre sécurisée.
 */
export default function QuoteSignatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuote(id), [id]);
  const [quote] = useFocusData(load);
  const [checked, setChecked] = useState<Partial<Record<SignatureConsent, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<SignatureConsent, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

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
  // Devis déjà signé, refusé ou remplacé : retour à son écran.
  if (quote.status !== "envoye") return <Redirect href={`/devis/${id}`} />;

  const [deposit, balance] = quote.data.schedule;
  const items: ConsentItem[] = [
    { name: "document", label: t.signature.consents.document, links: [] },
    {
      name: "cgu_prestataire",
      label: t.signature.consents.cgu_prestataire,
      links: [{ label: t.signature.links.provider, url: providerLinks.docusealTerms }],
    },
    {
      name: "cgu_menao",
      label: t.signature.consents.cgu_menao,
      links: [
        { label: t.signature.links.terms, url: siteLinks.terms },
        { label: t.signature.links.privacy, url: siteLinks.privacy },
      ],
    },
    {
      name: "echeancier",
      label: t.signature.consents.echeancier(
        formatCents(deposit?.amountCents ?? 0),
        formatCents(balance?.amountCents ?? 0),
      ),
      links: [],
    },
  ];

  async function submit() {
    const parsed = signatureConsentsSchema.safeParse(
      Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, checked[c] === true])),
    );
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors(Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, fields[c]?.[0]])));
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const opened = await startQuoteSignature(id, parsed.data);
    if ("error" in opened) {
      setPending(false);
      setFailure(opened.error);
      return;
    }
    const result = await openHostedPage(opened.url);
    setPending(false);
    if (result === "signature") {
      router.dismissTo({ pathname: "/devis/[id]", params: { id, retour: "signature" } });
    }
  }

  return (
    <Screen
      band={
        <HeaderBand
          title={quote.data.site.title}
          meta={[{ icon: MapPin, text: quote.data.site.addressLines.join(", ") }]}
        >
          <StepTabs steps={STEPS} current="sign" />
        </HeaderBand>
      }
      footer={<Button label={t.signature.submit} onPress={submit} loading={pending} />}
    >
      <Body muted>{t.signature.intro}</Body>
      <Card>
        <View style={styles.summary}>
          {quote.data.numero ? (
            <Text style={styles.summaryTitle}>
              {t.signature.summary(quote.data.numero, formatCents(quote.data.totals.totalTtcCents))}
            </Text>
          ) : null}
          {quote.model.scheduleLines.map((line) => (
            <Text key={line} style={styles.summaryText}>
              • {line}
            </Text>
          ))}
          <Text style={styles.summaryText}>{quote.model.datesLine}</Text>
          <LinkText
            label={t.pdf}
            onPress={async () => {
              setPdfFailed(false);
              setPdfFailed(!(await sharePdf({ quoteId: id }, quote.data.numero ?? "devis")));
            }}
          />
        </View>
      </Card>
      {pdfFailed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
      <ConsentList
        items={items}
        checked={checked}
        onChange={(name, value) => {
          setChecked((prev) => ({ ...prev, [name]: value }));
          setErrors((prev) => ({ ...prev, [name]: undefined }));
        }}
        errors={errors}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Body muted>{t.signature.otp}</Body>
      <Body muted center>
        {t.signature.depositNext}
      </Body>
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
  summary: { gap: spacing(1.5) },
  summaryTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  summaryText: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
});
