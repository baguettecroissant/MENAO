import { appSpaceForRole, roleFromAppMetadata, type AppSpace, type Role } from "@menao/core";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setExamplesActive } from "./examples";
import { setScreenCacheOwner } from "./screen-cache";
import { supabase } from "./supabase";

type SessionState = {
  session: Session | null;
  /** Compte connecté (une session anonyme de recherche n'en est pas un, ADR 0012). */
  signedIn: boolean;
  role: Role;
  space: AppSpace;
  loading: boolean;
};

const SessionContext = createContext<SessionState>({
  session: null,
  signedIn: false,
  role: "visiteur",
  space: "client",
  loading: true,
});

/**
 * Session de l'utilisateur et espace de l'application selon son rôle, lu dans `app_metadata`
 * (jamais dans `user_metadata`, CLAUDE.md règle 7). Sans compte, on visite l'espace client.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let currentUser: string | null = null;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      currentUser = data.session?.user.id ?? null;
      setScreenCacheOwner(data.session?.user.id ?? null);
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Données des écrans gardées en mémoire : oubliées avant d'afficher un autre compte.
      // Déconnexion ou autre compte (pas un simple rafraîchissement de la session) : on sort du
      // mode exemples (ADR 0184).
      const user = next?.user.id ?? null;
      if (user !== currentUser) setExamplesActive(false);
      currentUser = user;
      setScreenCacheOwner(user);
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionState>(() => {
    const signedIn = Boolean(session && !session.user.is_anonymous);
    const role = session && signedIn ? roleFromAppMetadata(session.user.app_metadata) : "visiteur";
    return { session, signedIn, role, space: appSpaceForRole(role), loading };
  }, [session, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
