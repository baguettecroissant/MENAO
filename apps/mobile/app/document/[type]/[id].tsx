import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { InvoicePaper } from "@/components/documents/invoice-paper";
import { QuotePaper } from "@/components/documents/quote-paper";
import { ReceptionPaper } from "@/components/documents/reception-paper";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadDocumentPreview, type DocumentType } from "@/lib/document-preview";
import { sharePdf } from "@/lib/pdf";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.documentPreview;
const TYPES: readonly string[] = ["devis", "facture", "pv"] satisfies DocumentType[];

/**
 * Aperçu d'un document du chantier (devis, facture, PV de réception), client comme artisan :
 * le document s'affiche d'abord, comme le PDF ouvert sur le site, puis se télécharge ou se partage
 * en PDF (enregistrer dans Fichiers, imprimer, envoyer).
 */
export default function DocumentScreen() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const load = useCallback(
    () =>
      TYPES.includes(type) ? loadDocumentPreview(type as DocumentType, id) : Promise.resolve(null),
    [type, id],
  );
  const [doc] = useFocusData(load);
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (doc === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (doc === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }

  async function download() {
    if (!doc) return;
    setFailed(false);
    setDownloading(true);
    const shared = await sharePdf(doc.target, doc.numero);
    setDownloading(false);
    setFailed(!shared);
  }

  const d = fr.chantier.dossier;
  const title =
    doc.type === "devis"
      ? doc.signed
        ? d.signedQuote
        : d.quote
      : doc.type === "facture"
        ? d.invoice[doc.invoiceKind]
        : fr.chantier.reception.pvDocument;
  return (
    <Screen
      header={<TopBar />}
      footer={
        <>
          {failed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
          <Button
            label={doc.type === "devis" && doc.signed ? t.signedPdf : t.pdf}
            onPress={download}
            loading={downloading}
          />
        </>
      }
    >
      <Title>{title}</Title>
      {doc.type === "devis" ? (
        <QuotePaper model={doc.model} logoUrl={doc.logoUrl} />
      ) : doc.type === "facture" ? (
        <InvoicePaper model={doc.model} logoUrl={doc.logoUrl} />
      ) : (
        <ReceptionPaper model={doc.model} logoUrl={doc.logoUrl} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
