import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TenderEditor } from "@/components/pro/tender-editor";
import { Alert, Button, Card, CardTitle, Field, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";
import { deleteTender, updateTender } from "@/lib/artisan/tender-actions";
import { getTender } from "@/lib/artisan/tenders";
import { formatDay } from "@/lib/format";

const t = fr.pro.tenders;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUSES = ["en_cours", "envoye", "retenu", "perdu"] as const;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Un appel d'offres (F-136, ADR 0287) : résultat de la lecture du DPGF, postes à chiffrer, export
 * Excel au format de l'architecte et PDF, suivi de l'offre.
 */
export default async function TenderPage({
  params,
  searchParams,
}: PageProps<"/pro/demandes/appels-offres/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const query = (await searchParams) as Record<string, string | undefined>;
  const { supabase, artisanId } = await requireTeamPermission("money");
  const [found, { data: artisan }] = await Promise.all([
    getTender(supabase, id),
    supabase.from("artisans").select("assujetti_tva").eq("id", artisanId).maybeSingle(),
  ]);
  if (!found) notFound();
  const { tender, lines } = found;
  const vatOptions = artisan?.assujetti_tva === false ? [0] : [2000, 1000, 550];
  const reading = query.lecture;
  const warnings = (query.alertes ?? "").split(",").filter((w) => t.warnings[w]);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/pro/demandes/appels-offres" as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {t.back}
        </Link>
        <div className="flex flex-col gap-1.5">
          {(tender.client_name || tender.due_on) && (
            <p className="text-sm font-semibold text-muted-foreground">
              {[
                tender.client_name,
                tender.due_on ? t.dueOn(formatDay(`${tender.due_on}T12:00:00Z`)) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2.25rem]">{tender.name}</h1>
        </div>

        {reading === "ok" ? (
          <Alert tone="success">
            {t.importOk(Number(query.postes ?? 0), Number(query.prix ?? 0))}
          </Alert>
        ) : reading ? (
          <Alert tone="error">{t.importStatus[reading] ?? t.importStatus.error}</Alert>
        ) : null}
        {warnings.map((w) => (
          <Alert key={w} tone="info">
            {t.warnings[w]}
          </Alert>
        ))}

        {lines.length > 0 && (
          <TenderEditor
            tenderId={tender.id}
            lines={lines}
            vatRateBp={tender.vat_rate_bp}
            vatOptions={vatOptions}
            hasSheet={tender.source_kind === "xlsx"}
          />
        )}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.followTitle} />
            <form action={updateTender} className="flex flex-col gap-4">
              <input type="hidden" name="tenderId" value={tender.id} />
              <Field
                label={t.fields.name}
                name="name"
                required
                maxLength={160}
                defaultValue={tender.name}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t.fields.client}
                  name="client"
                  maxLength={160}
                  defaultValue={tender.client_name ?? ""}
                />
                <Field
                  label={t.fields.due}
                  name="due"
                  type="date"
                  defaultValue={tender.due_on ?? ""}
                />
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t.columns.status}
                <select name="status" defaultValue={tender.status} className={inputClasses}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t.status[s]}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="secondary" block={false} className="self-start">
                {t.followSave}
              </Button>
            </form>
          </Card>
          <Card className="flex flex-col gap-3">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-danger">
                {t.deleteTitle}
              </summary>
              <form action={deleteTender} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="tenderId" value={tender.id} />
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
        </div>
      </div>
    </main>
  );
}
