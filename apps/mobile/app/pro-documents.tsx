import { DocumentList } from "@/components/pro/document-list";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadMyDocuments } from "@/lib/artisan-documents";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, ScreenSkeleton, Title } from "@/ui";

const t = fr.proDocuments;
const d = fr.proDossier;

/**
 * « Mes documents » (ADR 0123), comme la page des documents du site : état de chaque document
 * obligatoire, échéances, renouvellement d'un document surveillé en photo ou en PDF.
 */
export default function MyDocumentsScreen() {
  const [data] = useFocusData(loadMyDocuments);
  if (data === undefined) return <ScreenSkeleton header={<TopBar />} />;
  const validated = data?.status === "valide" || data?.status === "suspendu";
  return (
    <Screen header={<TopBar />}>
      <Title>{t.title}</Title>
      <Body muted>{t.lead}</Body>
      {data === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <DocumentList rows={data.rows} validated={validated} />
      )}
      <Body muted>{d.privacy}</Body>
    </Screen>
  );
}
