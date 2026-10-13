import { PROJECT_TEXT_MAX_LENGTH } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnalysisScreen } from "@/components/analysis-screen";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { analyzeNeed } from "@/lib/project";
import { useTrades } from "@/lib/trades";
import { Body, Button, Chip, Notice, Screen, TextField } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Saisie du projet (F-05), puis analyse par l'IA : l'écran animé reste affiché pendant l'analyse,
 * qui crée le projet et pré-remplit ses critères (ADR 0012). On passe ensuite à leur vérification.
 */
export default function Recherche() {
  const params = useLocalSearchParams<{ metier?: string }>();
  const trades = useTrades();
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState<string | null>(params.metier ?? null);
  const [analyzing, setAnalyzing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const ready = description.trim().length > 0;

  async function submit() {
    if (!ready || analyzing) return;
    setFailure(null);
    setAnalyzing(true);
    const result = await analyzeNeed(description.trim(), trade);
    if (result.status !== "ok") {
      setAnalyzing(false);
      return setFailure(fr.search.errors[result.status]);
    }
    router.replace({ pathname: "/projet/[id]", params: { id: result.projectId } });
  }

  return (
    <View style={styles.page}>
      <Screen header={<TopBar title={fr.search.title} />}>
        <Body muted>{fr.search.intro}</Body>
        {failure && <Notice tone="error">{failure}</Notice>}
        <TextField
          label={fr.search.label}
          value={description}
          onChangeText={setDescription}
          placeholder={fr.search.placeholder}
          maxLength={PROJECT_TEXT_MAX_LENGTH}
          multiline
          autoFocus
        />
        <Text style={styles.privacy}>{fr.search.privacy}</Text>
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{fr.search.examplesTitle}</Text>
          <View style={styles.chips}>
            {fr.search.examples.map((example) => (
              <Chip key={example} label={example} onPress={() => setDescription(example)} />
            ))}
          </View>
        </View>
        {trades.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>{fr.search.tradeLabel}</Text>
            <View style={styles.chips}>
              {trades.map((item) => (
                <Chip
                  key={item.code}
                  label={item.label}
                  selected={trade === item.code}
                  onPress={() => setTrade(trade === item.code ? null : item.code)}
                />
              ))}
            </View>
          </View>
        )}
        <Button label={fr.search.submit} disabled={!ready} onPress={submit} />
      </Screen>
      {analyzing && <AnalysisScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  privacy: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors["muted-foreground"],
  },
  group: { gap: theme.spacing(2.5) },
  groupTitle: { fontFamily: theme.font.medium, fontSize: 14, color: theme.colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
});
