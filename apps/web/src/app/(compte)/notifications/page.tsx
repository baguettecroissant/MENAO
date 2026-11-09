import { emailPreferences } from "@menao/core";
import { notificationGroups } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailPreferencesForm, MarkAllRead } from "@/components/notifications/center-client";
import { fr } from "@/i18n/fr";
import { formatTimeAgo } from "@/lib/format";
import { loadNotifications } from "@/lib/notifications/center";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

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

  const groups = notificationGroups(items, now);
  const row = (item: (typeof items)[number]) => (
    <li key={item.id}>
      <Link
        href={item.href as Route}
        className={`flex items-start gap-3 px-4 py-4 hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5 ${
          item.unread ? "bg-primary-softer/40" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className={`mt-1.5 size-2.5 shrink-0 rounded-full ${item.unread ? "bg-primary" : "bg-transparent"}`}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`text-[0.9375rem] ${item.unread ? "font-bold" : "font-semibold"}`}>
            {item.title}
            {item.unread && <span className="sr-only"> ({t.unread})</span>}
          </span>
          <span className="text-sm text-muted-foreground">{item.preview}</span>
        </span>
        <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
          {formatTimeAgo(item.createdAt, now)}
        </span>
      </Link>
    </li>
  );
  const group = (title: string, list: typeof items) =>
    list.length > 0 && (
      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <h2 className="px-4 pt-4 pb-2.5 text-base sm:px-5">{title}</h2>
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {list.map(row)}
        </ul>
      </section>
    );

  // Refonte « Nette » (ADR 0258) : « Aujourd'hui » puis « Plus tôt », préférences à droite.
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
              {t.title}
            </h1>
            <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
          </div>
          <MarkAllRead />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-4">
            {items.length ? (
              <>
                {group(t.today, groups.today)}
                {group(t.earlier, groups.earlier)}
              </>
            ) : (
              <EmptyState illustration="notifications">{t.empty}</EmptyState>
            )}
          </div>
          <section
            aria-labelledby="prefs-title"
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card lg:sticky lg:top-24"
          >
            <h2 id="prefs-title" className="text-[1.0625rem]">
              {t.prefsTitle}
            </h2>
            <p className="text-sm text-muted-foreground">{t.prefsIntro}</p>
            <EmailPreferencesForm initial={emailPreferences(profile?.notification_preferences)} />
          </section>
        </div>
      </div>
    </main>
  );
}
