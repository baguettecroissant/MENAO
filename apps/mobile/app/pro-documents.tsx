import { ActivityIndicator, StyleSheet, View } from "react-native";
import { DocumentList } from "@/components/pro/document-list";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadMyDocuments } from "@/lib/artisan-documents";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDocuments;
const d = fr.proDossier;
const { colors } = theme;

/**
 * « Mes documents » (ADR 0123), comme la page des documents du site : état de chaque document
 * obligatoire, échéances, renouvellement d'un document surveillé en photo ou en PDF.
 */
export default function MyDocumentsScreen() {
  const [data] = useFocusData(loadMyDocuments);
  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
