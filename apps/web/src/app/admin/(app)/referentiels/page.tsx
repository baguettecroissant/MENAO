import { ChevronDown, ChevronUp } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AddReferenceForm, RenameReferenceForm } from "@/components/admin/reference-forms";
import { Alert, Button, Card, StatusBadge, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { moveReference, setReferenceActive } from "@/lib/admin/reference-actions";
import { getReferences } from "@/lib/admin/references";

const t = fr.admin.references;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

type Kind = "metier" | "travail" | "piece";
type Item = { code: string; label: string; active: boolean; artisans?: number; demandes: number };

const iconButton = `inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30 ${focusRing}`;

/** Une entrée : libellé, code et usage ; monter, descendre, désactiver ou réactiver, renommer. */
function ReferenceRow({
  kind,
  item,
  first,
  last,
}: {
  kind: Kind;
  item: Item;
  first: boolean;
  last: boolean;
}) {
  const meta = [
    t.code(item.code),
    item.artisans === undefined ? null : t.artisans(item.artisans),
    t.demandes(item.demandes),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      aria-label={item.label}
      className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-2">
          <span className={`font-medium ${item.active ? "" : "text-muted-foreground"}`}>
            {item.label}
          </span>
          {!item.active && <StatusBadge tone="neutral">{t.inactive}</StatusBadge>}
        </p>
        <p className="text-xs text-muted-foreground">{meta}</p>
        <details className="group">
          <summary
            aria-label={t.rename(item.label)}
            className="cursor-pointer self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            {t.renameShort}
          </summary>
          <RenameReferenceForm kind={kind} code={item.code} label={item.label} />
        </details>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <form action={moveReference}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="code" value={item.code} />
          <input type="hidden" name="direction" value="up" />
          <button
            type="submit"
            disabled={first}
            aria-label={t.up(item.label)}
            className={iconButton}
          >
            <ChevronUp aria-hidden="true" className="size-4" />
          </button>
        </form>
        <form action={moveReference}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="code" value={item.code} />
          <input type="hidden" name="direction" value="down" />
          <button
            type="submit"
            disabled={last}
            aria-label={t.down(item.label)}
            className={iconButton}
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </button>
        </form>
        <form action={setReferenceActive}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="code" value={item.code} />
          <input type="hidden" name="active" value={item.active ? "false" : "true"} />
          <Button type="submit" variant="ghost" size="sm" block={false}>
            {item.active ? t.deactivate : t.activate}
          </Button>
        </form>
      </div>
    </li>
  );
}

function ReferenceList({ kind, items }: { kind: Kind; items: Item[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item, index) => (
        <ReferenceRow
          key={item.code}
          kind={kind}
          item={item}
          first={index === 0}
          last={index === items.length - 1}
        />
      ))}
    </ul>
  );
}

function Section({ kind, children }: { kind: Kind; children: ReactNode }) {
  return (
    <Card>
      <section aria-labelledby={`liste-${kind}`} className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={`liste-${kind}`} className="text-lg font-medium">
            {t.sections[kind]}
          </h2>
          <p className="text-sm text-muted-foreground">{t.hints[kind]}</p>
        </div>
        {children}
      </section>
    </Card>
  );
}

/**
 * Listes de métiers, travaux et pièces (F-57, ADR 0052) : ajout, libellé, ordre et activation,
 * journalisés ; jamais de suppression, car les dossiers, les demandes et l'IA en reprennent les codes.
 */
export default async function ReferencesPage() {
  const { supabase } = await requireAdmin();
  const refs = await getReferences(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t.intro}</p>
      </div>
      {!refs ? (
        <Alert tone="error">{fr.errors.generic}</Alert>
      ) : (
        <>
          <Section kind="metier">
            <ReferenceList kind="metier" items={refs.metiers} />
            <AddReferenceForm kind="metier" />
          </Section>
          <Section kind="travail">
            <div className="flex flex-col">
              {refs.metiers.map((trade) => {
                const works = refs.travaux.filter((w) => w.metier === trade.code);
                return (
                  <details
                    key={trade.code}
                    className="border-t border-border py-2 first:border-t-0"
                  >
                    <summary className="cursor-pointer py-1 font-medium">
                      {trade.label}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {t.works(works.length)}
                      </span>
                    </summary>
                    {works.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">{t.noWork}</p>
                    ) : (
                      <ReferenceList kind="travail" items={works} />
                    )}
                  </details>
                );
              })}
            </div>
            <AddReferenceForm
              kind="travail"
              trades={refs.metiers
                .filter((m) => m.active)
                .map(({ code, label }) => ({ code, label }))}
            />
          </Section>
          <Section kind="piece">
            <ReferenceList kind="piece" items={refs.pieces} />
            <AddReferenceForm kind="piece" />
          </Section>
        </>
      )}
    </div>
  );
}
