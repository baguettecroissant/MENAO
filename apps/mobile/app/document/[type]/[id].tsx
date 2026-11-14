import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { InvoicePaper } from "@/components/documents/invoice-paper";
import { QuotePaper } from "@/components/documents/quote-paper";
import { ReceptionPaper } from "@/components/documents/reception-paper";
import {
  FicheButton,
  FicheHead,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadDocumentPreview, type DocumentType } from "@/lib/document-preview";
import { sharePdf } from "@/lib/pdf";
import { useFocusData } from "@/lib/use-focus-data";
import { StyleSheet, View } from "react-native";
import { Notice } from "@/ui";

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

  if (doc === undefined) return <FicheSkeleton />;
  if (doc === null) {
    return (
      <FicheScreen>
        <Notice tone="error">{t.notFound}</Notice>
      </FicheScreen>
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
  // Refonte « Nette » (lot 49, ADR 0318) : numéro dans la barre, puce d'état, le document sur
  // son fond, le téléchargement en bas d'écran.
  return (
    <FicheScreen
      title={doc.numero}
      footer={
        <View style={styles.footer}>
          {failed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
          <FicheButton
            label={doc.type === "devis" && doc.signed ? t.signedPdf : t.pdf}
            onPress={() => void download()}
            loading={downloading}
            tall
          />
        </View>
      }
    >
      <FicheHead
        tags={
          doc.type === "devis" && doc.signed ? (
            <FicheTag text={t.signedTag} tone="success" dot />
          ) : null
        }
        title={title}
        meta={null}
      />
      <View style={styles.paper}>
        {doc.type === "devis" ? (
          <QuotePaper model={doc.model} logoUrl={doc.logoUrl} />
        ) : doc.type === "facture" ? (
          <InvoicePaper model={doc.model} logoUrl={doc.logoUrl} />
        ) : (
          <ReceptionPaper model={doc.model} logoUrl={doc.logoUrl} />
        )}
      </View>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 8 },
  // Fond beige des aperçus de documents (maquettes « Nette »).
  paper: { borderRadius: 16, backgroundColor: "#ece7dc", padding: 12 },
});
