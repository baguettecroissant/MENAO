import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DocumentsCard } from "@/components/chantier/dossier";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { loadMyDocuments } from "@/lib/chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.clientDocuments;
const { colors, spacing } = theme;

/**
 * « Mes documents » du client (onglet Documents des maquettes), comme sur le site : devis signés,
 * factures et PV, par chantier ; chacun s'ouvre en aperçu, puis se télécharge en PDF.
 */
export function DocumentsScreen() {
  const [sections, reload] = useFocusData(loadMyDocuments);
  const [refreshing, setRefreshing] = useState(false);

  if (sections === undefined) return <ScreenSkeleton />;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <TabHeader title={t.title} subtitle={t.subtitle} />
        {sections === null ? <Notice tone="error">{t.error}</Notice> : null}
        {sections?.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : null}
        {(sections ?? []).map((section) => (
          <DocumentsCard
            key={section.chantierId}
            title={section.title}
            documents={section.documents}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
});
