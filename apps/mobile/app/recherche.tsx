import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { MAX_DESCRIPTION_LENGTH, webSearchUrl } from "@/lib/search";
import { useTrades } from "@/lib/trades";
import { Body, Button, Chip, Screen, TextField } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Saisie du projet. Provisoire : la recherche s'ouvre sur le site, dans l'application ; la
 * recherche native (analyse animée, critères, artisans) la remplacera (ADR 0055).
 */
export default function Recherche() {
  const params = useLocalSearchParams<{ metier?: string }>();
  const trades = useTrades();
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState<string | null>(params.metier ?? null);
  const ready = description.trim().length > 0 || trade !== null;

  return (
    <Screen header={<TopBar title={fr.search.title} />}>
      <Body muted>{fr.search.intro}</Body>
      <TextField
        label={fr.search.label}
        value={description}
        onChangeText={setDescription}
        placeholder={fr.search.placeholder}
        maxLength={MAX_DESCRIPTION_LENGTH}
        multiline
        autoFocus
      />
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
      <Button
        label={fr.search.submit}
        disabled={!ready}
        onPress={() => WebBrowser.openBrowserAsync(webSearchUrl(env.siteUrl, description, trade))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing(2.5) },
  groupTitle: { fontFamily: theme.font.medium, fontSize: 14, color: theme.colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
});
