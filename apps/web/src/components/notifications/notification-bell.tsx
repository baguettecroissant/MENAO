"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";

const t = fr.notificationCenter;

/**
 * Cloche du centre de notifications (F-41), avec le nombre de non lues. Lue dans le navigateur :
 * les pages publiques restent statiques ; rien n'est affiché sans compte connecté.
 */
export function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || user.is_anonymous) {
        if (active) setCount(null);
        return;
      }
      const { data: unread } = await supabase.rpc("my_unread_notifications");
      if (active) setCount(unread ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (count === null) return null;
  return (
    <Link
      href="/notifications"
      aria-label={t.bell(count)}
      className="relative inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      <Bell aria-hidden="true" className="size-5" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-medium text-primary-foreground"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
