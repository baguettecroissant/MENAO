import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DocumentsCard } from "@/components/chantier/dossier";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { loadMyDocuments } from "@/lib/chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientDocuments;
const { colors, font, radius, spacing } = theme;

/**
 * « Mes documents » du client (onglet Documents des maquettes), comme sur le site : devis signés,
 * factures et PV, par chantier ; chacun s'ouvre en aperçu, puis se télécharge en PDF.
 */
export function DocumentsScreen() {
  const [sections, reload] = useFocusData(loadMyDocuments);
  const [refreshing, setRefreshing] = useState(false);

  if (sections === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
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
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.empty}</Text>
          </View>
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  empty: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(10),
  },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
