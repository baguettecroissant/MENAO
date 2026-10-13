import { useLocalSearchParams } from "expo-router";
import { PartyPopper } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { openTab } from "@/lib/navigation";
import { Body, Button, Card, IconTile, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.sent;

/** Confirmation de l'envoi (F-11) : rappel de la préférence de rappel et suite du parcours. */
export default function Envoyee() {
  const {
    names = "",
    count = "1",
    from,
    to,
  } = useLocalSearchParams<{
    names?: string;
    count?: string;
    from?: string;
    to?: string;
  }>();
  return (
    <Screen centered>
      <View style={styles.icon}>
        <IconTile icon={PartyPopper} size="lg" />
      </View>
      <Title center>{t.title(names)}</Title>
      <Body muted center>
        {t.text(names, Number(count) > 1)}
      </Body>
      <Card tone="soft">
        <Text style={styles.heading}>{t.reminder}</Text>
        <Body>{from && to ? t.callbackRange(from, to) : t.callbackAsap}</Body>
        <Body muted>{t.next}</Body>
      </Card>
      <Button label={t.follow} onPress={() => openTab("/chantiers")} />
      <Button label={t.home} variant="secondary" onPress={() => openTab("/accueil")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: "center" },
  heading: { fontFamily: theme.font.medium, fontSize: 16, color: theme.colors.foreground },
});
