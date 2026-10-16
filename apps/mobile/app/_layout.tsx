import {
  GoogleSans_400Regular,
  GoogleSans_500Medium,
  GoogleSans_700Bold,
  useFonts,
} from "@expo-google-fonts/google-sans";
import { signupPending } from "@menao/core";
import { router, Stack, usePathname, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PushNotifications } from "@/components/push-notifications";
import { SessionProvider, useSession } from "@/lib/session";
import { UnreadProvider } from "@/lib/unread";

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
  const done = ready && !loading;
  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => undefined);
  }, [done]);
  if (!done) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      <PushNotifications />
      <SignupGate />
    </>
  );
}

/**
 * Compte Google ou Apple à finaliser (ADR 0108) : « Finaliser mon compte » s'affiche tant que les
 * CGU ne sont pas acceptées, même à la réouverture de l'application, comme le garde du site.
 */
function SignupGate() {
  const { session, signedIn } = useSession();
  const pathname = usePathname();
  const ready = Boolean(useRootNavigationState()?.key);
  const pending = signedIn && signupPending(session?.user.app_metadata);
  useEffect(() => {
    if (ready && pending && pathname !== "/finaliser-compte") router.replace("/finaliser-compte");
  }, [ready, pending, pathname]);
  return null;
}
