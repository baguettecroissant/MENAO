import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { voiceSessionToken } from "@/lib/pro-quotes";
import { theme } from "@/ui/theme";

const t = fr.proSecretary.test;
const { colors, font, radius, spacing } = theme;
const ORIGIN = new URL(env.siteUrl).origin;
const PAGE = `${ORIGIN}/appli/secretaire`;

/**
 * « L'essayer » dans l'application (ADR 0362), comme « Dicter avec Manon » (ADR 0235) : le kit
 * vocal de Vapi ne tourne pas dans l'application, l'appel d'essai passe par une page intégrée du
 * site, qui reçoit la session avant son chargement (jamais par l'adresse) et prévient à la fin.
 */
export function SecretaryTestCall({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void voiceSessionToken().then((value) => {
      if (active) setToken(value);
    });
    return () => {
      active = false;
    };
  }, []);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: unknown };
      if (message.type === "fin") onClose();
    } catch {
      // Message illisible : ignoré.
    }
  }

  return (
    <View style={styles.box}>
      {token ? (
        <WebView
          source={{ uri: PAGE }}
          style={styles.web}
          // Session posée avant le chargement de la page, pour elle seule.
          injectedJavaScriptBeforeContentLoaded={`window.__MENAO_APP__ = ${JSON.stringify({
            token,
          })}; true;`}
          onMessage={onMessage}
          originWhitelist={[ORIGIN]}
          // La page ne quitte jamais l'appel : aucune autre adresse dans le cadre principal.
          onShouldStartLoadWithRequest={(request) =>
            !request.isTopFrame || request.url.startsWith(`${ORIGIN}/appli/`)
          }
          mediaCapturePermissionGrantType="grant"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          scrollEnabled={false}
          bounces={false}
        />
      ) : (
        <View style={styles.loading}>
          {token === undefined ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.error}>{fr.errors.generic}</Text>
          )}
          <Text style={styles.loadingText}>{token === undefined ? t.loading : ""}</Text>
        </View>
      )}
      <Pressable role="button" aria-label={t.close} onPress={onClose} hitSlop={8}>
        <X size={16} color={colors["muted-foreground"]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    minHeight: 96,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    paddingRight: spacing(3),
  },
  web: { flex: 1, height: 96, backgroundColor: "transparent" },
  loading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    padding: spacing(4),
  },
  loadingText: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  error: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.danger },
});
