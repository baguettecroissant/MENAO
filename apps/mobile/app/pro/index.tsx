import { Hourglass } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { DashboardScreen } from "@/components/pro/dashboard-screen";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";
import { Body, Card, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/** Tableau de bord artisan (F-16) ; tant que le dossier n'est pas validé, son état à la place. */
export default function Dashboard() {
  const { role } = useSession();
  if (role !== "artisan_en_attente") return <DashboardScreen />;
  return (
    <Screen>
      <Title>{fr.tabs.dashboard}</Title>
      <Card>
        <View style={styles.icon}>
          <Hourglass size={22} color={theme.colors.primary} />
        </View>
        <Text style={styles.heading}>{fr.account.pendingTitle}</Text>
        <Body muted>{fr.account.pendingText}</Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
});
