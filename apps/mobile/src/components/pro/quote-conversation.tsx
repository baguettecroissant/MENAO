import {
  VAT_EXEMPT_BP,
  VAT_RATES_BP,
  normalizeVoiceLines,
  rawVoiceLinesFrom,
  type VoiceLine,
} from "@menao/core";
import type { QuoteLineInput } from "@menao/validation";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { voiceQuoteDraftForCall, voiceSessionToken } from "@/lib/pro-quotes";
import { theme } from "@/ui/theme";

const t = fr.proQuote.conversation;
const { colors, font, radius, spacing } = theme;
const ORIGIN = new URL(env.siteUrl).origin;
const PAGE = `${ORIGIN}/appli/devis-camille`;

/**
 * « Dicter avec Camille » dans l'application (ADR 0235). Le kit vocal de Vapi ne tourne pas dans
 * l'application : la conversation passe par une page intégrée du site, qui reçoit la session
 * avant son chargement (jamais par l'adresse) et renvoie le début de l'appel, chaque liste de
 * lignes proposée par Camille et la fin de l'appel. Les lignes sont relues ici avec les mêmes
 * fonctions de @menao/core que le serveur ; à la fin de l'appel, celles du serveur font foi.
 */
export function QuoteConversation({
  chantierId,
  assujettiTva,
  onStart,
  onLines,
  onClose,
}: {
  chantierId: string;
  assujettiTva: boolean;
  /** Nouvel appel : ses lignes s'ajoutent à celles déjà dans l'éditeur. */
  onStart: () => void;
  /** Liste complète des lignes de l'appel en cours. */
  onLines: (lines: (VoiceLine | QuoteLineInput)[]) => void;
  onClose: () => void;
}) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const callId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void voiceSessionToken().then((value) => {
      if (active) setToken(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const options = {
    assujettiTva,
    defaultVatBp: assujettiTva ? (VAT_RATES_BP.at(-1) ?? 2000) : VAT_EXEMPT_BP,
  };

  async function onMessage(event: WebViewMessageEvent) {
    let message: { type?: unknown; callId?: unknown; lignes?: unknown };
    try {
      message = JSON.parse(event.nativeEvent.data) as typeof message;
    } catch {
      return;
    }
    if (message.type === "debut" && typeof message.callId === "string") {
      callId.current = message.callId;
      onStart();
    } else if (message.type === "lignes") {
      const lines = normalizeVoiceLines(rawVoiceLinesFrom(message.lignes), options);
      if (lines.length > 0) onLines(lines);
    } else if (message.type === "fin") {
      const id = callId.current;
      callId.current = null;
      if (id) {
        const lines = await voiceQuoteDraftForCall(chantierId, id);
        if (lines.length > 0) onLines(lines);
      }
      onClose();
    }
  }

  return (
    <View style={styles.box}>
      {token ? (
        <WebView
          source={{ uri: PAGE }}
          style={styles.web}
          // Session et chantier posés avant le chargement de la page, pour elle seule.
          injectedJavaScriptBeforeContentLoaded={`window.__MENAO_APP__ = ${JSON.stringify({
            token,
            chantierId,
          })}; true;`}
          onMessage={(event) => void onMessage(event)}
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
      <Pressable
        role="button"
        aria-label={t.close}
        onPress={onClose}
        hitSlop={8}
        style={styles.close}
      >
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
    paddingRight: spacing(2),
  },
  web: { flex: 1, height: 96, backgroundColor: "transparent" },
  loading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    padding: spacing(3),
  },
  loadingText: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  close: { padding: spacing(1) },
});
