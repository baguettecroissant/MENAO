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
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AnimatedSplash } from "@/components/animated-splash";
import { PushNotifications } from "@/components/push-notifications";
import { kv } from "@/lib/kv";
import { BelowExamplesBanner, ExamplesBanner } from "@/components/examples";
import { useExamplesActive } from "@/lib/examples";
import { useScreenCacheRestored } from "@/lib/screen-store";
import { SessionProvider, useSession } from "@/lib/session";
import { UnreadProvider } from "@/lib/unread";
import { SuccessHost, ToastHost } from "@/ui";

// L'écran de démarrage du téléphone reste affiché jusqu'au démarrage animé (ADR 0192), qui prend
// le relais sans saut le temps de charger les polices, la session et les onglets gardés.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    GoogleSans_400Regular,
    GoogleSans_500Medium,
    GoogleSans_700Bold,
  });
  return (
    // Gestes des listes (glisser pour agir, ADR 0196).
    <GestureHandlerRootView style={rootStyles.fill}>
      <SafeAreaProvider>
        <SessionProvider>
          <UnreadProvider>
            <Root ready={fontsLoaded} />
          </UnreadProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root({ ready }: { ready: boolean }) {
  const { loading, session } = useSession();
  const examples = useExamplesActive();
  // Onglets de la dernière ouverture relus avant le premier écran (ADR 0192).
  const restored = useScreenCacheRestored(loading ? undefined : (session?.user.id ?? null));
  const done = ready && !loading && restored;
  const [splashGone, setSplashGone] = useState(false);
  const hideSplash = useCallback(() => setSplashGone(true), []);
  return (
    <>
      <StatusBar style={!splashGone || examples ? "light" : "dark"} />
      {done ? (
        <>
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
          <SuccessHost />
        </>
      ) : null}
      {splashGone ? null : <AnimatedSplash ready={done} onDone={hideSplash} />}
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
