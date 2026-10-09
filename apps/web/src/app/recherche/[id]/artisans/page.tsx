import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.search.results;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

// Résultats de la recherche : liste des artisans en phase 2b (match_artisans).
export default async function ProjectResultsPage({
  params,
}: PageProps<"/recherche/[id]/artisans">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-muted-foreground">{t.body}</p>
      <p>
        <TextLink href={`/recherche/${project.id}` as Route}>{t.back}</TextLink>
      </p>
    </main>
  );
}
