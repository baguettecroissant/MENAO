import {
  GoogleSans_400Regular,
  GoogleSans_500Medium,
  GoogleSans_700Bold,
  useFonts,
} from "@expo-google-fonts/google-sans";
import { ARTISAN_SIGNUP_DRAFT_KEY, signupPending } from "@menao/core";
import { router, Stack, usePathname, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PushNotifications } from "@/components/push-notifications";
import { kv } from "@/lib/kv";
import { BelowExamplesBanner, ExamplesBanner } from "@/components/examples";
import { useExamplesActive } from "@/lib/examples";
import { SessionProvider, useSession } from "@/lib/session";
import { UnreadProvider } from "@/lib/unread";
import { ToastHost } from "@/ui";

// L'écran de démarrage (logo MENAO) reste affiché jusqu'au chargement des polices et de la session.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    GoogleSans_400Regular,
    GoogleSans_500Medium,
    GoogleSans_700Bold,
  });
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <UnreadProvider>
          <Root ready={fontsLoaded} />
        </UnreadProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Root({ ready }: { ready: boolean }) {
  const { loading } = useSession();
  const examples = useExamplesActive();
  const done = ready && !loading;
  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => undefined);
  }, [done]);
  if (!done) return null;
  return (
    <>
      <StatusBar style={examples ? "light" : "dark"} />
      {/* Mode exemples (ADR 0184) : bandeau orange en haut, au-dessus de tous les écrans. */}
      <View style={rootStyles.fill}>
        {examples ? <ExamplesBanner /> : null}
        <BelowExamplesBanner active={examples}>
          <Stack screenOptions={{ headerShown: false }} />
        </BelowExamplesBanner>
      </View>
      <PushNotifications />
      <SignupGate />
      <ToastHost />
    </>
  );
}

/**
 * Compte Google ou Apple à finaliser (ADR 0108) : « Finaliser mon compte » s'affiche tant que les
 * CGU ne sont pas acceptées, même à la réouverture de l'application, comme le garde du site ; ou
 * l'inscription artisan, si elle a été commencée sur ce téléphone (ADR 0113).
 */
function SignupGate() {
  const { session, signedIn } = useSession();
  const pathname = usePathname();
  const ready = Boolean(useRootNavigationState()?.key);
  const pending = signedIn && signupPending(session?.user.app_metadata);
  useEffect(() => {
    if (!ready || !pending || SIGNUP_SCREENS.includes(pathname)) return;
    let active = true;
    // Inscription artisan commencée sur ce téléphone (ADR 0113) : elle se finalise dans son
    // propre parcours, pas dans « Finaliser mon compte » (compte client).
    kv.get(ARTISAN_SIGNUP_DRAFT_KEY).then((draft) => {
      if (active) router.replace(draft ? "/pro-inscription" : "/finaliser-compte");
    });
    return () => {
      active = false;
    };
  }, [ready, pending, pathname]);
  return null;
}

const SIGNUP_SCREENS = ["/finaliser-compte", "/pro-inscription"];

const rootStyles = StyleSheet.create({ fill: { flex: 1 } });
