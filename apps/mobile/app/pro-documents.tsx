import { PageHead, PrivacyNote } from "@/components/pro/dossier-kit";
import { DocumentList } from "@/components/pro/document-list";
import { FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadMyDocuments } from "@/lib/artisan-documents";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proDocuments;
const d = fr.proDossier;

/**
 * « Mes documents » (ADR 0123), comme la page des documents du site : état de chaque document
 * obligatoire, échéances, renouvellement d'un document surveillé en photo ou en PDF. Refonte
 * « Nette » (lot 9) : grand titre et mention de confidentialité avec le cadenas.
 */
function MyDocumentsScreen() {
  const [data] = useFocusData(loadMyDocuments);
  if (data === undefined) return <FicheSkeleton />;
  const validated = data?.status === "valide" || data?.status === "suspendu";
  return (
    <FicheScreen>
      <PageHead title={t.title} lead={t.lead} />
      {data === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <DocumentList rows={data.rows} validated={validated} />
      )}
      <PrivacyNote text={d.privacy} />
    </FicheScreen>
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("dossier", MyDocumentsScreen);
