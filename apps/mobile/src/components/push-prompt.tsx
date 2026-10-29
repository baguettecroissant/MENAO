import { BellRing } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { kv } from "@/lib/kv";
import { enablePush, pushPermission, type PushPermission } from "@/lib/push";
import { useSession } from "@/lib/session";
import { Body, Button, Card, LinkText } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.push;
/** « Plus tard » : l'invitation ne revient pas sur ce téléphone. */
const DISMISSED = "menao.push-prompt";

/**
 * Invitation à activer les notifications (F-41), sur l'accueil d'un compte connecté, tant que le
 * téléphone ne les a ni autorisées ni refusées : l'autorisation n'est demandée qu'à l'appui.
 */
export function PushPrompt() {
  const { signedIn } = useSession();
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    Promise.all([pushPermission(), kv.get(DISMISSED)]).then(([status, later]) => {
      if (!active) return;
      setPermission(status);
      setDismissed(later === "1");
    });
    return () => {
      active = false;
    };
  }, [signedIn]);

  if (!signedIn || permission !== "undetermined" || dismissed) return null;
  return (
    <Card tone="soft">
      <View style={styles.titleRow}>
        <BellRing size={18} color={theme.colors.primary} />
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
      </View>
      <Body muted>{t.text}</Body>
      <Button
        label={t.enable}
        loading={pending}
        onPress={async () => {
          setPending(true);
          setPermission(await enablePush());
          setPending(false);
        }}
      />
      <LinkText
        label={t.later}
        onPress={() => {
          setDismissed(true);
          void kv.set(DISMISSED, "1");
        }}
      />
    </Card>
  );
}

/**
 * Rappel discret dans une conversation (ADR 0201) quand le téléphone a refusé les notifications :
 * les nouveaux messages n'y sonneront pas. Le réglage ne se change que dans les réglages du
 * téléphone.
 */
export function PushDeniedNotice() {
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    let active = true;
    void pushPermission().then((status) => {
      if (active) setDenied(status === "denied");
    });
    return () => {
      active = false;
    };
  }, []);
  if (!denied) return null;
  return (
    <View style={styles.denied}>
      <Text style={styles.deniedText}>{t.deniedMessages}</Text>
      <LinkText label={t.openSettings} onPress={() => void Linking.openSettings()} />
    </View>
  );
}

const styles = StyleSheet.create({
  denied: { gap: theme.spacing(1) },
  deniedText: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors["muted-foreground"],
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing(2) },
  title: { fontFamily: theme.font.medium, fontSize: 16, color: theme.colors.foreground },
});
