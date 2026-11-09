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
export function NotificationBell({
  variant = "icon",
  collapsed = false,
}: {
  /** « sidebar » : ligne du menu latéral, sur ordinateur (ADR 0262). */
  variant?: "icon" | "sidebar";
  collapsed?: boolean;
} = {}) {
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
  if (variant === "sidebar") {
    return (
      <Link
        href="/notifications"
        aria-label={t.bell(count)}
        title={collapsed ? t.bell(count) : undefined}
        className={`relative flex min-h-10 items-center gap-3 rounded-xl text-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${collapsed ? "justify-center" : "px-3"}`}
      >
        <Bell aria-hidden="true" className="size-5 shrink-0" />
        <span aria-hidden="true" className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>
          {t.bell(0)}
        </span>
        {count > 0 && (
          <span
            aria-hidden="true"
            className={
              collapsed
                ? "absolute top-2 right-2.5 size-2.5 rounded-full bg-primary ring-2 ring-surface"
                : "rounded-pill bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums"
            }
          >
            {collapsed ? null : count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    );
  }
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
