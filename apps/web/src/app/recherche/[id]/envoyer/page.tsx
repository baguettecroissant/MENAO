import { roleFromAppMetadata } from "@menao/core";
import { artisanSelectionSchema } from "@menao/validation";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArtisanAvatar } from "@/components/project/artisan-avatar";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { matchArtisans, publicUrl } from "@/lib/project/artisans";
import { joinNames } from "@/lib/project/names";
import { createClient } from "@/lib/supabase/server";
import { AccountStep } from "./account-step";
import { RequestForm } from "./request-form";

const t = fr.search.request;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: fr.search.profile.request, robots: { index: false } };

/** Envoi de la demande (F-11), précédé si besoin de la création du compte (F-08). */
export default async function SendRequestPage({
  params,
  searchParams,
}: PageProps<"/recherche/[id]/envoyer">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const requested = ([] as string[]).concat(sp.artisan ?? []);
  const selection = artisanSelectionSchema.safeParse(requested);
  if (!selection.success) redirect(`/recherche/${id}/artisans` as Route);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/");
  const anonymous = Boolean(auth.claims.is_anonymous);

  // Retour du lien de confirmation : le projet de la session anonyme passe au compte.
  let transferFailed = false;
  if (typeof sp.transfert === "string" && !anonymous) {
    const { error } = await supabase.rpc("claim_project", { p_token: sp.transfert });
    transferFailed = Boolean(error);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, status, summary, description, ville_nom, trade_code")
    .eq("id", id)
    .maybeSingle();
  if (!project) {
    if (transferFailed) {
      return (
        <main className="mx-auto w-full max-w-xl px-4 py-16">
          <Alert tone="error">{t.transferError}</Alert>
        </main>
      );
    }
    notFound();
  }
  if (project.status === "brouillon") redirect(`/recherche/${id}` as Route);

  const [matches, { data: sent }] = await Promise.all([
    matchArtisans(supabase, id, 20),
    supabase.from("requests").select("artisan_id").eq("project_id", id),
  ]);
  const already = new Set((sent ?? []).map((r) => r.artisan_id));
  const chosen = (matches ?? []).filter(
    (m) => selection.data.includes(m.artisan_id) && !already.has(m.artisan_id),
  );
  if (chosen.length === 0) redirect(`/recherche/${id}/artisans` as Route);
  const context = { projectId: id, artisanIds: chosen.map((a) => a.artisan_id) };
  const names = joinNames(chosen.map((a) => a.display_name));

  let form;
  if (anonymous) {
    form = (
      <>
        <h2 className="text-xl font-semibold">{t.accountTitle}</h2>
        <p className="text-muted-foreground">{t.accountIntro}</p>
        <AccountStep context={context} />
      </>
    );
  } else if (roleFromAppMetadata(auth.claims.app_metadata) !== "particulier") {
    form = <Alert tone="error">{t.notParticulier}</Alert>;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", auth.claims.sub)
      .maybeSingle();
    form = (
      <RequestForm
        context={context}
        email={auth.claims.email ?? ""}
        phone={profile?.phone ?? null}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-start">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
        <section
          aria-label={t.selected}
          className="rounded-card border border-border bg-surface p-4"
        >
          <h2 className="mb-3 font-semibold">{t.selected}</h2>
          <ul className="flex flex-col gap-3">
            {chosen.map((a) => (
              <li key={a.artisan_id} className="flex items-center gap-3">
                <ArtisanAvatar
                  url={a.avatar_path ? publicUrl(supabase, "avatars", a.avatar_path) : null}
                  name={a.display_name}
                />
                <span className="font-medium">{a.display_name}</span>
              </li>
            ))}
          </ul>
        </section>
        <section
          aria-label={t.project}
          className="rounded-card border border-border bg-surface p-4"
        >
          <h2 className="mb-2 font-semibold">{t.project}</h2>
          <p className="text-muted-foreground">{project.summary ?? project.description}</p>
          {project.ville_nom && <p className="mt-2 text-sm">{project.ville_nom}</p>}
        </section>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:p-8">
        <h1 className="text-2xl font-bold">{t.title(names)}</h1>
        {form}
      </div>
    </main>
  );
}
