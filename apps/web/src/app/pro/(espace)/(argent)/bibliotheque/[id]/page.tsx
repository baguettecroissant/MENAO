import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkEditor } from "@/components/pro/work-editor";
import { Alert, Button, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { loadLibrary } from "@/lib/artisan/library";
import { deleteWork } from "@/lib/artisan/library-actions";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.library.work;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${fr.pro.library.title} — MENAO` };

/** Un ouvrage de la bibliothèque (F-141, ADR 0293) ; « nouveau » pour en créer un. */
export default async function WorkPage({
  params,
  searchParams,
}: PageProps<"/pro/bibliotheque/[id]">) {
  const { id } = await params;
  const { enregistre } = await searchParams;
  const creating = id === "nouveau";
  if (!creating && !UUID.test(id)) notFound();
  const { supabase } = await requireTeamPermission("money");
  const library = await loadLibrary(supabase);
  const work = creating ? null : library.works.find((w) => w.id === id);
  if (!creating && !work) notFound();

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/pro/bibliotheque" as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {t.back}
        </Link>
        <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2.25rem]">
          {work?.designation ?? t.newTitle}
        </h1>
        {enregistre && <Alert tone="success">{t.saved}</Alert>}
        <WorkEditor
          key={work ? `${work.id}-${work.components.length}-${work.manual_price_cents}` : "nouveau"}
          work={work ?? null}
          components={work?.components ?? []}
          supplies={library.supplies}
          settings={library.settings}
        />
        {work && (
          <Card className="flex flex-col gap-3">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-danger">
                {t.delete}
              </summary>
              <form action={deleteWork} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="id" value={work.id} />
                <p className="text-sm text-label">{t.deleteConfirm}</p>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  block={false}
                  className="self-start"
                >
                  {t.deleteYes}
                </Button>
              </form>
            </details>
          </Card>
        )}
      </div>
    </main>
  );
}
