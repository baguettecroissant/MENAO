import type { Database } from "@menao/db";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { env, isConfigured } from "./env";
import { secureStorage } from "./secure-storage";

/**
 * Client Supabase de l'application : clé publiable seulement (les droits viennent des politiques
 * RLS), session gardée dans le trousseau chiffré du téléphone (localStorage sur la version web).
 */
export const supabase = createClient<Database>(
  isConfigured ? env.supabaseUrl : "http://localhost",
  isConfigured ? env.supabaseKey : "non-configure",
  {
    auth: {
      storage: Platform.OS === "web" ? undefined : secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Rafraîchissement du jeton seulement quand l'application est au premier plan (recommandation Supabase).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
