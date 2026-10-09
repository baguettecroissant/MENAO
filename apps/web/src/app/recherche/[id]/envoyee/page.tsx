import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { joinNames } from "@/lib/project/names";
import { createClient } from "@/lib/supabase/server";

const t = fr.search.request;

export const metadata: Metadata = { title: fr.myRequests.title, robots: { index: false } };

/** Confirmation de l'envoi (F-11). */
export default async function RequestSentPage({ params }: PageProps<"/recherche/[id]/envoyee">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("particulier_requests");
  const requests = (data ?? []).filter((r) => r.project_id === id && r.status === "envoyee");
  if (requests.length === 0) notFound();
  const { data: last } = await supabase
    .from("requests")
    .select("callback_mode, callback_from, callback_to")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hhmm = (v: string | null) => (v ?? "").slice(0, 5).replace(":", " h ");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <span aria-hidden="true" className="text-5xl text-success">
        ✓
      </span>
      <h1 className="text-2xl font-bold">
        {t.sentTitle(joinNames(requests.map((r) => r.artisan_name)))}
      </h1>
      <p>
        {last?.callback_mode === "plage"
          ? t.sentCallbackRange(hhmm(last.callback_from), hhmm(last.callback_to))
          : t.sentCallbackAsap}
      </p>
      <p className="text-muted-foreground">{t.sentNext}</p>
      <Link
        href="/mon-espace"
        className="inline-flex min-h-touch items-center justify-center rounded-button bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        {t.follow}
      </Link>
    </main>
  );
}
