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
  /** Demandes à accepter ou refuser (artisan, pastille de l'onglet Demandes, ADR 0130). */
  requests: number;
  /** Relit les compteurs (conversation ou notifications affichées, retour sur un écran). */
  refresh: () => void;
};

const EMPTY = { messages: 0, notifications: 0, requests: 0 };
const UnreadContext = createContext<Unread>({ ...EMPTY, refresh: () => {} });

/**
 * Messages et notifications non lus (pastilles de l'onglet Messages et de la cloche), comme sur
 * le site (`my_unread_messages`, `my_unread_notifications`), et demandes à traiter de l'artisan
 * (onglet Demandes). Relus à l'ouverture de l'application, à son retour au premier plan et sur
 * les écrans à onglets ; rien sans compte connecté.
 */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { signedIn, space } = useSession();
  const [counts, setCounts] = useState(EMPTY);

  const refresh = useCallback(() => {
    if (!signedIn) return;
    const artisan = space === "artisan";
    Promise.all([
      supabase.rpc("my_unread_messages"),
      supabase.rpc("my_unread_notifications"),
      // Demandes reçues encore ouvertes : les siennes seulement (RLS).
      artisan
        ? supabase
            .from("requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "envoyee")
            .gt("expires_at", new Date().toISOString())
        : Promise.resolve({ count: 0 }),
    ]).then(([messages, notifications, requests]) =>
      setCounts({
        messages: messages.data ?? 0,
        notifications: notifications.data ?? 0,
        requests: requests.count ?? 0,
      }),
    );
  }, [signedIn, space]);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const value = useMemo<Unread>(
    () => (signedIn ? { ...counts, refresh } : { ...EMPTY, refresh }),
    [counts, signedIn, refresh],
  );
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): Unread {
  return useContext(UnreadContext);
}
