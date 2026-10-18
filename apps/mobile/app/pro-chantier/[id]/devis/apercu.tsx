import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { QuotePaper } from "@/components/documents/quote-paper";
import { HeaderBand, whenMeta } from "@/components/header-band";
import { StepTabs } from "@/components/step-tabs";
import { fr } from "@/i18n/fr";
import { sharePdf } from "@/lib/pdf";
import { loadQuoteSendContext } from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, LinkText, Notice, Screen, ScreenSkeleton, Title } from "@/ui";

const t = fr.proQuote;
const STEPS = [
  { key: "preview", label: t.steps.preview },
  { key: "send", label: t.steps.send },
] as const;

/** Aperçu du devis (F-20), comme sur le site : le devis tel qu'il sera envoyé, puis l'envoi. */
export default function QuotePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuoteSendContext(id), [id]);
  const [context] = useFocusData(load);
  const [pdfFailed, setPdfFailed] = useState(false);

  if (context === undefined) return <ScreenSkeleton />;
  // Pas encore de ligne enregistrée : retour à l'éditeur.
  if (context === null) return <Redirect href={`/pro-chantier/${id}/devis`} />;

  return (
    <Screen
      band={
        <HeaderBand title={t.title} meta={whenMeta(context.appointmentAt)}>
          <StepTabs steps={STEPS} current="preview" />
        </HeaderBand>
      }
      footer={
        <Button label={t.next} onPress={() => router.push(`/pro-chantier/${id}/devis/envoi`)} />
      }
    >
      <Title>{t.preview.ready}</Title>
      <Body muted>{t.preview.check(context.client.firstName)}</Body>
      <QuotePaper model={context.model} />
      <LinkText
        label={t.preview.pdf}
        onPress={async () => {
          setPdfFailed(false);
          setPdfFailed(!(await sharePdf({ quoteId: context.quoteId }, "devis")));
        }}
      />
      {pdfFailed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
    </Screen>
  );
}
