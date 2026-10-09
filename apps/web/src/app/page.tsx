import { NeedForm } from "@/components/project/need-form";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createPublicClient } from "@/lib/supabase/public";

// Page statique régénérée toutes les heures (liste des métiers).
export const revalidate = 3600;

export default async function HomePage() {
  const { data: trades } = await createPublicClient()
    .from("trades")
    .select("code, label")
    .eq("active", true)
    .order("sort_order");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-bold sm:text-5xl">{fr.home.title}</h1>
        <p className="text-lg text-muted-foreground">{fr.home.subtitle}</p>
      </div>
      <div className="rounded-card border border-border bg-surface p-4 shadow-sm sm:p-8">
        <NeedForm trades={trades ?? []} />
      </div>
      <p className="text-center">
        {fr.home.pro} <TextLink href="/pro">{fr.home.proLink}</TextLink>
      </p>
    </main>
  );
}
