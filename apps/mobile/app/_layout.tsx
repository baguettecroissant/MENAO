import {
  GoogleSans_400Regular,
  GoogleSans_500Medium,
  GoogleSans_700Bold,
  useFonts,
} from "@expo-google-fonts/google-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/lib/session";

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
        <Root ready={fontsLoaded} />
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
    </>
  );
}
