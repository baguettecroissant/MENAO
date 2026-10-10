import { emailPreferences } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailPreferencesForm, MarkAllRead } from "@/components/notifications/center-client";
import { fr } from "@/i18n/fr";
import { formatTimeAgo } from "@/lib/format";
import { loadNotifications } from "@/lib/notifications/center";
import { createClient } from "@/lib/supabase/server";

const t = fr.notificationCenter;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Centre de notifications (F-41), client ou artisan : mêmes textes que les e-mails, lien vers la
 * page concernée, non lues signalées ; préférences d'e-mail.
 */
export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/notifications" as Route);
  const [items, { data: profile }] = await Promise.all([
    loadNotifications(supabase),
    supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", auth.claims.sub)
      .maybeSingle(),
  ]);
  const now = new Date();

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {items.length ? (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href as Route}
                  className="flex items-start gap-3 px-4 py-4 hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${item.unread ? "bg-primary" : "bg-transparent"}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-sm ${item.unread ? "font-semibold" : "font-medium"}`}>
                      {item.title}
                      {item.unread && <span className="sr-only"> ({t.unread})</span>}
                    </span>
                    <span className="text-sm text-muted-foreground">{item.preview}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(item.createdAt, now)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            {t.empty}
          </p>
        )}
        <MarkAllRead />
        <section
          aria-labelledby="prefs-title"
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="prefs-title" className="font-medium">
            {t.prefsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{t.prefsIntro}</p>
          <EmailPreferencesForm initial={emailPreferences(profile?.notification_preferences)} />
        </section>
      </div>
    </main>
  );
}
