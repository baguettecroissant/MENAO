import { commercialPushPrefs } from "@menao/core";
import { ChevronLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PushSettings } from "@/components/commercial/field/push-settings";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";

const t = fr.commercialField.moments.push;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Être prévenu au bon moment » (F-196, lot 85, ADR 0396) : notifications sur ce téléphone et
 * choix des types reçus. Étape « Notifications » de « Bien démarrer ».
 */
export default async function CommercialNotificationsPage() {
  const space = await getCommercialSpace("/commercial/notifications");
  const { data: auth } = space.demo ? { data: null } : await space.supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  const { data: profile } = userId
    ? await space.supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/commercial/demarrer" as Route}
          className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {fr.commercialField.nav.start}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2.25rem]">
            {t.title}
          </h1>
          <p className="text-[0.9375rem] text-label">{t.intro}</p>
        </div>
        {!space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : (
          <PushSettings prefs={commercialPushPrefs(profile?.notification_preferences)} />
        )}
      </div>
    </main>
  );
}
