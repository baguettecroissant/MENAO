import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { QuotePaper } from "@/components/documents/quote-paper";
import { FicheButton, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { QuoteSteps } from "@/components/pro/quote-kit";
import { fr } from "@/i18n/fr";
import { sharePdf } from "@/lib/pdf";
import { loadQuoteSendContext } from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, LinkText, Notice, Title } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proQuote;

/**
 * Aperçu du devis (F-20), comme sur le site : le devis tel qu'il sera envoyé, puis l'envoi. Barre
 * du haut et étapes « Nette » (lot 2), comme l'éditeur.
 */
function QuotePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuoteSendContext(id), [id]);
  const [context] = useFocusData(load);
  const [pdfFailed, setPdfFailed] = useState(false);

  if (context === undefined) return <FicheSkeleton title={t.barTitle} />;
  // Pas encore de ligne enregistrée : retour à l'éditeur.
  if (context === null) return <Redirect href={`/pro-chantier/${id}/devis`} />;

  return (
    <FicheScreen
      title={t.barTitle}
      footer={
        <FicheButton
          label={t.next}
          tall
          onPress={() => router.push(`/pro-chantier/${id}/devis/envoi`)}
        />
      }
    >
      <QuoteSteps current="preview" />
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
    </FicheScreen>
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", QuotePreviewScreen);
