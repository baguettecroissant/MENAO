import { FORMATION_MODULES } from "@menao/core";
import { BookOpen, ChevronLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { QuizRunner } from "@/components/commercial/field/quiz-runner";
import { Alert, Card } from "@/components/ui";
import { formationModule } from "@/content/commercial/formation";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";

const t = fr.commercialField.formation;

export async function generateMetadata({
  params,
}: PageProps<"/commercial/demarrer/formation/[module]">): Promise<Metadata> {
  const content = formationModule((await params).module);
  return { title: `${content?.title ?? t.back} — MENAO`, robots: { index: false } };
}

/** Texte avec `**gras**`. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text
        .split("**")
        .map((part, i) =>
          i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
        )}
    </>
  );
}

/**
 * Un module de formation des conseillers (F-194, ADR 0394) : la leçon, le lien vers la rubrique du
 * guide, puis le quiz. Les bonnes réponses restent sur le serveur.
 */
export default async function FormationModulePage({
  params,
}: PageProps<"/commercial/demarrer/formation/[module]">) {
  const key = (await params).module;
  const content = formationModule(key);
  if (!content) notFound();
  const space = await getCommercialSpace(`/commercial/demarrer/formation/${key}`);
  const n = FORMATION_MODULES.indexOf(content.key) + 1;
  const questions = content.questions.map((q) => ({ question: q.question, choices: q.choices }));

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={"/commercial/demarrer" as Route}
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            {t.back}
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">
            {t.module(n, FORMATION_MODULES.length)}
          </span>
        </div>
        <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2.25rem]">
          {content.title}
        </h1>
        <Card className="flex flex-col gap-3">
          <ol className="flex flex-col gap-3">
            {content.lesson.map((line, i) => (
              <li key={line} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-surface">
                  {i + 1}
                </span>
                <span>
                  <Rich text={line} />
                </span>
              </li>
            ))}
          </ol>
          <Link
            href={`/commercial/guide/${content.guideSlug}` as Route}
            className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary-strong hover:underline"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            {t.readGuide}
          </Link>
        </Card>
        {!space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : (
          <Card>
            <QuizRunner module={content.key} questions={questions} />
          </Card>
        )}
      </div>
    </main>
  );
}
