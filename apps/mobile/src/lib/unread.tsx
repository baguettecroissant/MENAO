import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useSession } from "./session";
import { supabase } from "./supabase";

type Unread = {
  messages: number;
  notifications: number;
  /** Relit les compteurs (conversation ou notifications affichées, retour sur un écran). */
  refresh: () => void;
};

const UnreadContext = createContext<Unread>({ messages: 0, notifications: 0, refresh: () => {} });

/**
 * Messages et notifications non lus (pastilles de l'onglet Messages et de la cloche), comme sur
 * le site (`my_unread_messages`, `my_unread_notifications`). Relus à l'ouverture de l'application
 * et à son retour au premier plan ; rien sans compte connecté.
 */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { signedIn } = useSession();
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });

  const refresh = useCallback(() => {
    if (!signedIn) return;
    Promise.all([supabase.rpc("my_unread_messages"), supabase.rpc("my_unread_notifications")]).then(
      ([messages, notifications]) =>
        setCounts({ messages: messages.data ?? 0, notifications: notifications.data ?? 0 }),
    );
  }, [signedIn]);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const value = useMemo<Unread>(
    () => (signedIn ? { ...counts, refresh } : { messages: 0, notifications: 0, refresh }),
    [counts, signedIn, refresh],
  );
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): Unread {
  return useContext(UnreadContext);
}
