import { SIGNATURE_CONSENTS, type SignatureConsent } from "@menao/core";
import { signatureConsentsSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { z } from "zod";
import { ConsentList, type ConsentItem } from "@/components/consents";
import { ActionScreen, ActionSubmit, JourneySteps } from "@/components/pro/action-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { providerLinks, siteLinks } from "@/lib/env";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { sharePdf } from "@/lib/pdf";
import { loadQuote, startQuoteSignature } from "@/lib/quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.quote;
const { colors, font, spacing } = theme;
const STEPS = [t.steps.sign, t.steps.deposit];

/**
 * Signature du devis (F-13), comme sur le site : rappel du devis et de l'échéancier, cases à
 * cocher, puis signature chez DocuSeal (code à usage unique) dans la fenêtre sécurisée.
 * Écran « Nette » (lot 11) : étape 1 sur 2, carte du total, cases bleu nuit en carte et
 * « Signer le devis » collé en bas avec la mention du prestataire.
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

  if (quote === undefined) return <FicheSkeleton title={t.signature.title} />;
  if (quote === null) {
    return (
      <FicheScreen title={t.signature.title}>
        <Notice tone="error">{t.notFound}</Notice>
      </FicheScreen>
    );
  }
  // Devis déjà signé, refusé ou remplacé : retour à son écran.
  if (quote.status !== "envoye") return <Redirect href={`/devis/${id}`} />;

  // Par moment de paiement (F-146) : sans acompte, la première tranche est celle de la réception.
  const parts = t.signature.scheduleParts;
  const hasDeposit = quote.data.schedule.some(
    (s) => s.trigger === "signature" && s.amountCents > 0,
  );
  const schedule = [
    ...quote.data.schedule.map((s) => parts[s.trigger](formatCents(s.amountCents))),
    ...(hasDeposit ? [] : [parts.noDeposit]),
  ].join(", ");
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
      label: t.signature.consents.echeancier(schedule),
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

  const site = [quote.data.site.title, quote.data.site.addressLines.join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <ActionScreen
      bar={t.signature.title}
      steps={
        <JourneySteps
          label={t.steps.label}
          steps={hasDeposit ? STEPS : [t.steps.sign]}
          current={0}
        />
      }
      title={t.signature.title}
      lead={t.signature.intro}
      meta={site}
      footer={
        <ActionSubmit
          label={t.signature.submit}
          onPress={submit}
          loading={pending}
          footnote={t.signature.provider}
        />
      }
    >
      <FicheCard padding={4.5} gap={1}>
        {quote.data.numero ? (
          <Text style={styles.number}>{t.signature.number(quote.data.numero)}</Text>
        ) : null}
        <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
          {formatCents(quote.data.totals.totalTtcCents)}
        </Text>
        <Text style={styles.small}>{t.signature.ttc(quote.data.issuer.name)}</Text>
        <Pressable
          role="link"
          hitSlop={8}
          style={styles.reread}
          onPress={async () => {
            setPdfFailed(false);
            setPdfFailed(!(await sharePdf({ quoteId: id }, quote.data.numero ?? "devis")));
          }}
        >
          <Text style={styles.link}>{t.signature.reread}</Text>
        </Pressable>
      </FicheCard>
      {pdfFailed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
      <FicheCard padding={4} gap={1.5}>
        {quote.model.scheduleLines.map((line) => (
          <Text key={line} style={styles.line}>
            • {line}
          </Text>
        ))}
        <Text style={styles.small}>{quote.model.datesLine}</Text>
      </FicheCard>
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
      <Text style={styles.small}>{t.signature.otp}</Text>
      <Text style={[styles.small, styles.center]}>
        {hasDeposit ? t.signature.depositNext : t.noDeposit.next}
      </Text>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  number: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  total: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
    color: colors.foreground,
  },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  center: { textAlign: "center" },
  line: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  reread: { alignSelf: "flex-start", marginTop: spacing(1.5) },
  link: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors["primary-strong"],
    textDecorationLine: "underline",
  },
});
