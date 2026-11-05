import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TrainingSimulator } from "@/components/commercial/training-simulator";
import { ListPanel, ListRow } from "@/components/list-kit";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDayTime } from "@/lib/format";

const t = fr.commercialTraining;

export const metadata: Metadata = { title: t.metaTitle, robots: { index: false } };

/**
 * Simulateur d'entraînement (F-74, ADR 0224), rangé dans le guide terrain : un artisan joué par
 * l'IA, puis la note d'un coach ; en bas, les dernières séances du commercial (notes seulement).
 */
export default async function CommercialTrainingPage() {
  const space = await getCommercialSpace("/commercial/guide/entrainement");
  const { data: sessions } = space.active
    ? await space.supabase
        .from("commercial_trainings")
        .select("id, persona, score, created_at")
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: null };

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/commercial/guide"
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : (
          <>
            <TrainingSimulator />
            {sessions && sessions.length > 0 && (
              <ListPanel label={t.history.title}>
                {sessions.map((s) => (
                  <ListRow
                    key={s.id}
                    title={t.history.row(t.personas[s.persona]?.label ?? s.persona, s.score)}
                    detail={formatDayTime(s.created_at)}
                  />
                ))}
              </ListPanel>
            )}
          </>
        )}
      </div>
    </main>
  );
}
