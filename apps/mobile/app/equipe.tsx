import { Redirect } from "expo-router";
import { Monitor } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Body, Button, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/** Équipe MENAO : le back-office reste sur le site, depuis un ordinateur. */
export default function Equipe() {
  const { space } = useSession();
  const [leaving, setLeaving] = useState(false);
  if (space !== "equipe") return <Redirect href="/" />;
  return (
    <Screen centered>
      <View style={styles.icon}>
        <Monitor size={28} color={theme.colors.primary} />
      </View>
      <Title>{fr.staff.title}</Title>
      <Body muted>{fr.staff.text}</Body>
      <Button
        label={fr.account.signOut}
        variant="secondary"
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          await supabase.auth.signOut();
          setLeaving(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
});
